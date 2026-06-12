import { Output, ToolLoopAgent } from "ai";
import { getLens } from "@/lib/game/lenses";
import { narratedEventSchema } from "@/lib/game/schemas";
import { timeline } from "@/lib/game/timeline";
import type {
  Character,
  CharacterState,
  Choice,
  ChoiceHistoryItem,
  LensId,
  NarratedEvent
} from "@/lib/game/types";

type NarratorInput = {
  lensId: LensId;
  character: Character;
  state: CharacterState;
  beatIndex: number;
  history: ChoiceHistoryItem[];
  feedbackHints: { title: string; callbackHint: string; feedback: "up" | "down" | null }[];
  epilogue?: boolean;
};

function canUseGateway() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);
}

function promptFor(input: NarratorInput) {
  const lens = getLens(input.lensId);
  const beat = timeline[Math.min(input.beatIndex, timeline.length - 1)];
  const mode = input.epilogue ? "EPILOGUE" : "EVENT";

  return `
Mode: ${mode}
Game: One Life Before the Singularity
Lens: ${lens.name}
Lens tone: ${lens.tone}

Fixed world beat:
${beat.year} - ${beat.title}
World: ${beat.world}
Pressure: ${beat.pressure}

Character:
${JSON.stringify(input.character, null, 2)}

Current state, 0-100:
${JSON.stringify(input.state, null, 2)}

Choice history:
${JSON.stringify(input.history, null, 2)}

Feedback hints:
${JSON.stringify(input.feedbackHints, null, 2)}

Rules:
- Do not let the player change the fixed world timeline.
- Generate one intimate personal beat for this ordinary life.
- Keep the prose specific, playable, and emotionally restrained.
- Choices must be materially different, 2 or 3 total.
- Each choice must include a small stateDelta with career, relationships, money, and/or beliefs.
- For an epilogue, set choices to two replay-reflection options with no meaningful state changes.
`;
}

function localChoices(seed: number): Choice[] {
  const sets: Choice[][] = [
    [
      {
        id: "protect-work",
        label: "Protect the job",
        detail: "Accept the new workflow and keep your head down.",
        stateDelta: { career: 8, beliefs: -4, relationships: -3 }
      },
      {
        id: "protect-people",
        label: "Protect your people",
        detail: "Spend the evening with someone who still knows your real voice.",
        stateDelta: { relationships: 8, money: -3, career: -2 }
      },
      {
        id: "protect-truth",
        label: "Protect the truth",
        detail: "Document what feels wrong, even if no one asked.",
        stateDelta: { beliefs: 8, career: -4, money: -2 }
      }
    ],
    [
      {
        id: "optimize",
        label: "Optimize",
        detail: "Let the system make the practical choice.",
        stateDelta: { career: 5, money: 5, beliefs: -5 }
      },
      {
        id: "refuse",
        label: "Refuse",
        detail: "Keep one part of the day unscored.",
        stateDelta: { beliefs: 7, relationships: 3, career: -4 }
      }
    ]
  ];

  return sets[seed % sets.length];
}

export function localNarrator(input: NarratorInput): NarratedEvent {
  const lens = getLens(input.lensId);
  const beat = timeline[Math.min(input.beatIndex, timeline.length - 1)];
  const previous = input.history.at(-1);
  const callback = previous ? `You remember choosing "${previous.selectedLabel}" during ${previous.beatTitle}.` : "";

  if (input.epilogue) {
    return {
      title: "The Life You Kept",
      narration: `${input.character.name} reaches the edge of 2027 in ${input.character.city} with the world moving faster than language can follow. ${callback} The headlines never asked permission, but the small ledger of the life remains: work endured, people answered or avoided, truths held too tightly or released too soon. In the end, the singularity is less a door than a light under every familiar door at once.`,
      choices: [
        {
          id: "replay-same",
          label: "Remember this life",
          detail: "Keep the shape of these choices for a moment.",
          stateDelta: {}
        },
        {
          id: "replay-new",
          label: "Begin another",
          detail: "Roll a new ordinary life against the same history.",
          stateDelta: {}
        }
      ],
      stateChanges: {},
      callbackHint: "The player reached the end and cared about the accumulated life summary."
    };
  }

  const focus =
    lens.id === "severance"
      ? "At work, the dashboard knows what you did before you do."
      : lens.id === "matrix"
        ? "A message arrives in a voice you trust, but its timing is too perfect."
        : "The morning repeats with one detail changed, like the script forgot its own line.";

  return {
    title: `${beat.year}: ${beat.title}`,
    narration: `${focus} ${input.character.name}, a ${input.character.age}-year-old ${input.character.job} in ${input.character.city}, tries to keep an ordinary day intact while the world moves through ${beat.title.toLowerCase()}. ${beat.pressure} ${callback} Nothing asks you to save history. It only asks what you will trade before dinner.`,
    choices: localChoices(input.beatIndex),
    stateChanges: {},
    callbackHint: `The player responded to ${beat.title} through a ${lens.name} lens.`
  };
}

export function createNarratorAgent(lensId: LensId) {
  const lens = getLens(lensId);

  return new ToolLoopAgent({
    id: `happy-doom-${lens.id}-narrator`,
    model: process.env.HAPPY_DOOM_MODEL ?? "openai/gpt-5.4",
    instructions: `You are the narrator for Happy Doom. Write BitLife-length interactive fiction with the ${lens.name} lens. The world timeline is fixed; only the personal life adapts.`,
    output: Output.object({
      schema: narratedEventSchema,
      name: "narrated_event",
      description: "A playable personal event with narration, choices, and state changes."
    }),
    maxOutputTokens: 900,
    temperature: 0.8
  });
}

export async function streamNarratedEvent(
  input: NarratorInput,
  handlers: {
    onNarrationDelta: (delta: string) => void;
  }
) {
  if (!canUseGateway()) {
    const event = localNarrator(input);
    for (const word of event.narration.split(/(\s+)/)) {
      handlers.onNarrationDelta(word);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    return { event, usedAi: false };
  }

  const agent = createNarratorAgent(input.lensId);
  const stream = await agent.stream({
    prompt: promptFor(input)
  });

  let seenNarration = "";
  for await (const partial of stream.partialOutputStream) {
    const nextNarration = partial?.narration;
    if (typeof nextNarration === "string" && nextNarration.length > seenNarration.length) {
      handlers.onNarrationDelta(nextNarration.slice(seenNarration.length));
      seenNarration = nextNarration;
    }
  }

  return { event: (await stream.output) as NarratedEvent, usedAi: true };
}
