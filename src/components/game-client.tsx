"use client";

import Image from "next/image";
import { RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { lenses } from "@/lib/game/lenses";
import { timeline } from "@/lib/game/timeline";
import type { LensId, LifeSummary, StoredEvent } from "@/lib/game/types";

type Phase = "lens" | "playing" | "summary";

type EventPayload = {
  event: StoredEvent;
  life: LifeSummary;
  usedAi: boolean;
  cached: boolean;
};

function statLabel(value: number) {
  if (value >= 70) return "high";
  if (value <= 30) return "low";
  return "steady";
}

async function readEventStream(response: Response, onNarration: (delta: string) => void) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: EventPayload | null = null;

  if (!reader) {
    throw new Error("No response stream.");
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event: "));
      const dataLine = lines.find((line) => line.startsWith("data: "));
      if (!eventLine || !dataLine) continue;

      const event = eventLine.slice(7);
      const data = JSON.parse(dataLine.slice(6));

      if (event === "narration") {
        onNarration(data.delta);
      }

      if (event === "event") {
        finalPayload = data as EventPayload;
      }

      if (event === "error") {
        throw new Error(data.error);
      }
    }
  }

  if (!finalPayload) {
    throw new Error("The narrator did not return an event.");
  }

  return finalPayload;
}

export function GameClient() {
  const [selectedLens, setSelectedLens] = useState<LensId>("severance");
  const [phase, setPhase] = useState<Phase>("lens");
  const [life, setLife] = useState<LifeSummary | null>(null);
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [streamedNarration, setStreamedNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<"ai" | "local" | null>(null);

  const lens = useMemo(() => lenses.find((item) => item.id === selectedLens) ?? lenses[0], [selectedLens]);
  const beat = life ? timeline[Math.min(life.beatIndex, timeline.length - 1)] : timeline[0];
  const progress = life ? Math.min(100, Math.round((life.beatIndex / timeline.length) * 100)) : 0;
  const displayedNarration = loading && streamedNarration ? streamedNarration : event?.narration;

  async function requestEvent(lifeId: string, selectedChoiceId?: string) {
    setLoading(true);
    setError(null);
    setStreamedNarration("");

    try {
      const response = await fetch(`/api/life/${lifeId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedChoiceId })
      });

      const payload = await readEventStream(response, (delta) => {
        setStreamedNarration((current) => current + delta);
      });

      setLife(payload.life);
      setEvent(payload.event);
      setAiMode(payload.usedAi ? "ai" : "local");
      setPhase(payload.event.kind === "epilogue" ? "summary" : "playing");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function startLife() {
    setLoading(true);
    setError(null);
    setEvent(null);
    setStreamedNarration("");

    try {
      const response = await fetch("/api/life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lens: selectedLens })
      });
      const payload = (await response.json()) as { life: LifeSummary };
      setLife(payload.life);
      await requestEvent(payload.life.lifeId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start life.");
      setLoading(false);
    }
  }

  async function choose(choiceId: string) {
    if (!life || loading) return;
    await requestEvent(life.lifeId, choiceId);
  }

  async function sendFeedback(rating: "up" | "down") {
    if (!life || !event) return;

    await fetch(`/api/life/${life.lifeId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, rating })
    });

    setEvent({ ...event, feedback: rating });
  }

  function replay() {
    setPhase("lens");
    setLife(null);
    setEvent(null);
    setStreamedNarration("");
    setAiMode(null);
    setError(null);
  }

  return (
    <main className={`min-h-screen ${lens.themeClass}`}>
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/55">Happy Doom</p>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">One Life Before the Singularity</h1>
          </div>
          <div className="flex items-center gap-2 rounded border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white/70">
            <Sparkles size={14} />
            {aiMode === "ai" ? "AI narrator" : aiMode === "local" ? "local narrator" : "ready"}
          </div>
        </header>

        {phase === "lens" ? (
          <div className="grid flex-1 content-center gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-center gap-5">
              <div>
                <p className="font-mono text-sm text-white/50">2025-2027 fixed timeline</p>
                <h2 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
                  You cannot stop history. Choose how to live inside it.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-white/68">
                Pick a tonal lens. The same world beats happen in the same order; the narrator changes the personal
                story around your ordinary life.
              </p>
              <button
                className="inline-flex h-11 w-fit items-center gap-2 rounded border border-white/15 bg-white px-4 text-sm font-medium text-black transition hover:bg-white/85 disabled:opacity-50"
                onClick={startLife}
                disabled={loading}
              >
                <Sparkles size={16} />
                {loading ? "Rolling life" : "Start life"}
              </button>
              {error ? <p className="text-sm text-red-200">{error}</p> : null}
            </div>

            <div className="grid gap-3">
              {lenses.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedLens(item.id)}
                  className={`grid grid-cols-[88px_1fr] gap-4 rounded border p-3 text-left transition ${
                    selectedLens === item.id
                      ? "border-white/55 bg-white/14"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                  }`}
                >
                  <Image src={item.asset} alt="" width={88} height={88} className="rounded border border-white/10" />
                  <span className="flex flex-col justify-center">
                    <span className="text-xl font-semibold text-white">{item.name}</span>
                    <span className="mt-1 text-sm leading-6 text-white/65">{item.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[280px_1fr_300px]">
            <aside className="space-y-4">
              {life ? (
                <div className="rounded border border-white/10 bg-black/24 p-4">
                  <Image src={life.character.avatar} alt="" width={88} height={88} className="mb-4 rounded" />
                  <h2 className="text-xl font-semibold text-white">{life.character.name}</h2>
                  <p className="mt-1 text-sm text-white/62">
                    {life.character.age}, {life.character.city}
                  </p>
                  <p className="text-sm text-white/62">{life.character.job}</p>
                </div>
              ) : null}

              {life ? (
                <div className="rounded border border-white/10 bg-black/24 p-4">
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-white/45">state</p>
                  {Object.entries(life.state).map(([key, value]) => (
                    <div key={key} className="mb-3 last:mb-0">
                      <div className="mb-1 flex justify-between text-sm text-white/70">
                        <span className="capitalize">{key}</span>
                        <span>{statLabel(value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-white/10">
                        <div className="h-full bg-white/70" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>

            <section className="rounded border border-white/10 bg-black/28 p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">
                    {beat.year} / {beat.title}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">{event?.title ?? "Awaiting narrator"}</h2>
                </div>
                <div className="h-2 w-32 overflow-hidden rounded bg-white/10">
                  <div className="h-full bg-white/70" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="min-h-[220px] whitespace-pre-wrap text-lg leading-8 text-white/78">
                {displayedNarration || "The life is being assembled from small facts and bad timing."}
                {loading ? <span className="animate-pulse">_</span> : null}
              </div>

              {event && !loading && event.kind === "event" ? (
                <div className="mt-6 grid gap-3">
                  {event.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => choose(choice.id)}
                      className="rounded border border-white/10 bg-white/[0.06] p-4 text-left transition hover:border-white/25 hover:bg-white/[0.1]"
                    >
                      <span className="block text-base font-semibold text-white">{choice.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-white/58">{choice.detail}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {phase === "summary" && event ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded border border-white/15 bg-white px-3 text-sm font-medium text-black transition hover:bg-white/85"
                    onClick={replay}
                  >
                    <RotateCcw size={16} />
                    Replay
                  </button>
                </div>
              ) : null}

              {event ? (
                <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
                  <button
                    title="This event worked"
                    onClick={() => sendFeedback("up")}
                    className={`grid h-9 w-9 place-items-center rounded border ${
                      event.feedback === "up" ? "border-white/60 bg-white/18" : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    title="This event missed"
                    onClick={() => sendFeedback("down")}
                    className={`grid h-9 w-9 place-items-center rounded border ${
                      event.feedback === "down" ? "border-white/60 bg-white/18" : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
              ) : null}
            </section>

            <aside className="space-y-4">
              <div className="rounded border border-white/10 bg-black/24 p-4">
                <Image src={lens.asset} alt="" width={260} height={160} className="mb-4 w-full rounded" />
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">lens</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{lens.name}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">{lens.tagline}</p>
              </div>

              <div className="rounded border border-white/10 bg-black/24 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/45">world spine</p>
                <div className="mt-3 space-y-3">
                  {timeline.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[36px_1fr] gap-3">
                      <Image src={item.asset} alt="" width={36} height={36} className="rounded border border-white/10" />
                      <div>
                        <p className={index <= (life?.beatIndex ?? 0) ? "text-sm text-white" : "text-sm text-white/38"}>
                          {item.year}: {item.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
