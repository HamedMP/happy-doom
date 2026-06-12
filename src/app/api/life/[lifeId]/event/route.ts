import { streamNarratedEvent } from "@/lib/ai/narrator";
import { eventRequestSchema } from "@/lib/game/schemas";
import { timeline } from "@/lib/game/timeline";
import {
  applyChoice,
  getChoiceHistory,
  getEvents,
  getFeedbackHints,
  getLife,
  getOpenEvent,
  storeEvent
} from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, context: { params: Promise<{ lifeId: string }> }) {
  const { lifeId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = eventRequestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(sse("error", { error: "Invalid event request." }), {
      status: 400,
      headers: { "Content-Type": "text/event-stream" }
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      try {
        if (parsed.data.selectedChoiceId) {
          applyChoice(lifeId, parsed.data.selectedChoiceId);
        }

        const life = getLife(lifeId);
        if (!life) {
          send("error", { error: "Life not found." });
          controller.close();
          return;
        }

        const openEvent = getOpenEvent(lifeId);
        if (openEvent) {
          send("event", { event: openEvent, life, usedAi: false, cached: true });
          controller.close();
          return;
        }

        const existingEpilogue = getEvents(lifeId).find((event) => event.kind === "epilogue");
        if (existingEpilogue) {
          send("event", { event: existingEpilogue, life, usedAi: false, cached: true });
          controller.close();
          return;
        }

        const epilogue = life.beatIndex >= timeline.length;
        const beatIndex = epilogue ? timeline.length - 1 : life.beatIndex;
        const result = await streamNarratedEvent(
          {
            lensId: life.lens.id,
            character: life.character,
            state: life.state,
            beatIndex,
            history: getChoiceHistory(lifeId),
            feedbackHints: getFeedbackHints(lifeId),
            epilogue
          },
          {
            onNarrationDelta: (delta) => send("narration", { delta })
          }
        );

        const stored = storeEvent(lifeId, beatIndex, epilogue ? "epilogue" : "event", result.event);
        send("event", { event: stored, life: getLife(lifeId), usedAi: result.usedAi, cached: false });
        controller.close();
      } catch (error) {
        send("error", { error: error instanceof Error ? error.message : "Generation failed." });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
