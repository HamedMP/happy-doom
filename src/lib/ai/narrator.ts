import { Output, ToolLoopAgent } from "ai";
import { getLens } from "@/lib/game/lenses";
import { narratedEventSchema } from "@/lib/game/schemas";
import { demoStorylineScenarios, experienceScenarios } from "@/lib/game/experience-scenarios";
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
  const demoScenario = demoStorylineScenarios.find((scenario) => scenario.beatIndex === input.beatIndex);

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

Demo storyline seed for this beat:
${demoScenario ? JSON.stringify(demoScenario, null, 2) : "No dedicated demo seed. Use the fixed world beat and character history."}

Rules:
- Do not let the player change the fixed world timeline.
- Generate one intimate personal beat for this ordinary life.
- For the Severance lens, center the story on split identity, employer surveillance, work-self vs home-self, and corporate language that slowly becomes threatening.
- If a demo storyline seed exists, adapt it to the character and use its hard choice as the event's moral center.
- Keep the prose specific, playable, and emotionally restrained.
- Choices must be materially different, 2 or 3 total.
- Each choice must include stateDelta with all four numeric keys: career, relationships, money, beliefs. Use 0 for unchanged values.
- stateChanges must include all four numeric keys: career, relationships, money, beliefs. Use 0 for unchanged values.
- For an epilogue, set choices to two replay-reflection options with all state deltas set to 0.
`;
}

function localChoices(seed: number): Choice[] {
  const sets: Choice[][] = [
    [
      {
        id: "protect-work",
        label: "Protect the job",
        detail: "Accept the new workflow and keep your head down.",
        stateDelta: { career: 8, relationships: -3, money: 0, beliefs: -4 }
      },
      {
        id: "protect-people",
        label: "Protect your people",
        detail: "Spend the evening with someone who still knows your real voice.",
        stateDelta: { career: -2, relationships: 8, money: -3, beliefs: 0 }
      },
      {
        id: "protect-truth",
        label: "Protect the truth",
        detail: "Document what feels wrong, even if no one asked.",
        stateDelta: { career: -4, relationships: 0, money: -2, beliefs: 8 }
      }
    ],
    [
      {
        id: "optimize",
        label: "Optimize",
        detail: "Let the system make the practical choice.",
        stateDelta: { career: 5, relationships: 0, money: 5, beliefs: -5 }
      },
      {
        id: "refuse",
        label: "Refuse",
        detail: "Keep one part of the day unscored.",
        stateDelta: { career: -4, relationships: 3, money: 0, beliefs: 7 }
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
          stateDelta: { career: 0, relationships: 0, money: 0, beliefs: 0 }
        },
        {
          id: "replay-new",
          label: "Begin another",
          detail: "Roll a new ordinary life against the same history.",
          stateDelta: { career: 0, relationships: 0, money: 0, beliefs: 0 }
        }
      ],
      stateChanges: { career: 0, relationships: 0, money: 0, beliefs: 0 },
      callbackHint: "The player reached the end and cared about the accumulated life summary."
    };
  }

  const focus =
    lens.id === "severance"
      ? "At work, the dashboard knows what you did before you do."
      : lens.id === "matrix"
        ? "A message arrives in a voice you trust, but its timing is too perfect."
      : "The morning repeats with one detail changed, like the script forgot its own line.";

  if (lens.id === "severance") {
    const demoScenario = demoStorylineScenarios.find((item) => item.beatIndex === input.beatIndex);
    if (demoScenario) {
      return {
        title: demoScenario.title,
        narration: `${input.character.name}'s work-self opens the file before their home-self is ready. ${demoScenario.setup} ${demoScenario.hardChoice}`,
        choices: demoScenario.choices.slice(0, 3).map((choice, index) => ({
          id: `${demoScenario.beatIndex}-${index}-${choice.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          label: choice.label,
          detail: choice.outcome.slice(0, 176),
          stateDelta:
            index === 0
              ? { career: 5, relationships: -2, money: 2, beliefs: -4 }
              : index === 1
                ? { career: -3, relationships: 2, money: -1, beliefs: 7 }
                : { career: -5, relationships: 0, money: -2, beliefs: 8 }
        })),
        stateChanges: { career: 0, relationships: 0, money: 0, beliefs: 0 },
        callbackHint: `${demoScenario.endingPattern}: ${demoScenario.agiPrepSkill}`
      };
    }

    const scenario = experienceScenarios.find((item) => item.beatIndex === input.beatIndex);
    if (scenario) {
      return {
        title: scenario.title,
        narration: `${input.character.name}'s work badge unlocks before their hand reaches the reader. ${scenario.narration} The company calls it continuity. At home, it feels like someone else is learning how to be you.`,
        choices: scenario.choices.map((choice, index) => ({
          id: `${scenario.beatIndex}-${index}-${choice.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          label: choice.label,
          detail: `${choice.cost}; ${choice.effect}.`,
          stateDelta:
            index === 0
              ? { career: -3, relationships: 5, money: 0, beliefs: 5 }
              : index === 1
                ? { career: 6, relationships: 0, money: 4, beliefs: -5 }
                : { career: -4, relationships: 0, money: -3, beliefs: 7 }
        })),
        stateChanges: { career: 0, relationships: 0, money: 0, beliefs: 0 },
        callbackHint: `The player faced ${scenario.pressure} through the Severance lens.`
      };
    }
  }

  return {
    title: `${beat.year}: ${beat.title}`,
    narration: `${focus} ${input.character.name}, a ${input.character.age}-year-old ${input.character.job} in ${input.character.city}, tries to keep an ordinary day intact while the world moves through ${beat.title.toLowerCase()}. ${beat.pressure} ${callback} Nothing asks you to save history. It only asks what you will trade before dinner.`,
    choices: localChoices(input.beatIndex),
    stateChanges: { career: 0, relationships: 0, money: 0, beliefs: 0 },
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

  try {
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
  } catch (error) {
    console.error(error);
    const event = localNarrator(input);
    for (const word of event.narration.split(/(\s+)/)) {
      handlers.onNarrationDelta(word);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    return { event, usedAi: false };
  }
}
