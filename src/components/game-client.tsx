"use client";

import Image from "next/image";
import { Monitor, RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { characters } from "@/lib/game/characters";
import { lenses } from "@/lib/game/lenses";
import { getSceneForBeatIndex, scenes, setupScene } from "@/lib/game/scenes";
import { timeline } from "@/lib/game/timeline";
import type { CharacterId, LensId, LifeSummary, StoredEvent } from "@/lib/game/types";

type Phase = "lens" | "playing" | "summary";

type EventPayload = {
  event: StoredEvent;
  life: LifeSummary;
  usedAi: boolean;
  cached: boolean;
};

const lensPreviewCopy: Record<LensId, string> = {
  severance: "Work-self versus home-self.",
  matrix: "Trust under synthetic pressure.",
  westworld: "Loops that start to remember."
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
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>(characters[0].id);
  const [phase, setPhase] = useState<Phase>("lens");
  const [life, setLife] = useState<LifeSummary | null>(null);
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [streamedNarration, setStreamedNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<"ai" | "local" | null>(null);

  const lens = useMemo(() => lenses.find((item) => item.id === selectedLens) ?? lenses[0], [selectedLens]);
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) ?? characters[0],
    [selectedCharacterId]
  );
  const visibleBeatIndex = life ? Math.min(life.beatIndex, timeline.length - 1) : 0;
  const beat = timeline[visibleBeatIndex];
  const progress = life ? Math.min(100, Math.round(((visibleBeatIndex + 1) / timeline.length) * 100)) : 0;
  const displayedNarration = loading && streamedNarration ? streamedNarration : event?.narration;
  const narratorLabel = aiMode === "ai" ? "AI narrator" : aiMode === "local" ? "local narrator" : "waiting";
  const activeScene = phase === "lens" ? setupScene : getSceneForBeatIndex(visibleBeatIndex);
  const sceneBackdropStyle = {
    backgroundImage: `linear-gradient(90deg, rgba(3, 4, 5, 0.22), rgba(3, 4, 5, 0.04) 42%, rgba(3, 4, 5, 0.48)), linear-gradient(0deg, rgba(3, 4, 5, 0.9), rgba(3, 4, 5, 0.14) 36%, rgba(3, 4, 5, 0.34)), url("${activeScene.asset}")`,
    backgroundPosition: activeScene.position
  };

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
        body: JSON.stringify({ lens: selectedLens, characterId: selectedCharacterId })
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
    <main className={`game-shell min-h-screen overflow-hidden text-[#f6efe2] ${lens.themeClass}`}>
      <div className="scene-backdrop" style={sceneBackdropStyle} aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-rain" aria-hidden="true" />
      <div className="scene-scanlines" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-cyan-100/62">Happy Doom</p>
          <h1 className="max-w-[18rem] text-lg font-semibold tracking-normal text-[#fff9ea] sm:max-w-none sm:text-2xl">
            One Life Before the Singularity
          </h1>
        </div>
        <div className="hidden items-center gap-3 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-[#e8d4a4]/70 sm:flex">
          <span>2025-2027</span>
          <span className="h-1 w-1 rounded-full bg-[#e8d4a4]/50" />
          <span>fixed history</span>
        </div>
        <div className="hidden h-9 items-center gap-2 border border-cyan-100/16 bg-black/35 px-3 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-cyan-100/78 min-[520px]:inline-flex">
          <Sparkles size={14} aria-hidden="true" />
          {narratorLabel}
        </div>
      </header>

      {phase === "lens" ? (
        <section className="relative z-10 mx-auto grid min-h-[calc(100svh-68px)] w-full max-w-7xl items-end gap-5 px-4 pb-5 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-8">
          <div className="max-w-2xl pb-[2vh]">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-100/62">
              2025 / rented room / rain outside
            </p>
            <h2 className="mt-4 max-w-[12ch] text-4xl font-semibold leading-[1] text-[#fff7dc] sm:max-w-3xl sm:text-5xl lg:text-6xl">
              One ordinary life, while history locks the door.
            </h2>
            <p className="mt-4 max-w-[22rem] text-base leading-7 text-[#d8c8a8] sm:max-w-xl">
              The city is awake. The machine on the desk is still warm. Choose the tone of the life you are about to
              remember.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="pixel-button" onClick={startLife} disabled={loading}>
                <Monitor size={17} aria-hidden="true" />
                {loading ? "Rolling life" : "Start life"}
              </button>
              {error ? <p className="text-sm text-red-200">{error}</p> : null}
            </div>
          </div>

          <div className="glass-panel setup-panel p-3 sm:p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.26em] text-cyan-100/54">Choose character</p>
            <div className="character-stage mt-3">
              <div className="character-stage-art">
                <Image
                  src={selectedCharacter.avatar}
                  alt=""
                  width={220}
                  height={275}
                  priority
                  className="h-full w-full object-contain object-bottom"
                />
              </div>
              <div className="min-w-0 self-end">
                <h3 className="text-xl font-semibold text-[#fff8e6]">{selectedCharacter.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#d8c8a8]/78">
                  {selectedCharacter.age}, {selectedCharacter.city}
                </p>
                <p className="text-sm leading-5 text-[#d8c8a8]/78">{selectedCharacter.job}</p>
                <p className="mt-3 text-sm leading-6 text-[#f2e4c9]/76">{selectedCharacter.summary}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {characters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  className={`character-option ${selectedCharacterId === character.id ? "character-option-active" : ""}`}
                  title={character.name}
                >
                  <Image
                    src={character.avatar}
                    alt=""
                    width={86}
                    height={108}
                    className="h-20 w-full object-contain object-bottom"
                  />
                  <span>{character.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.26em] text-cyan-100/54">Select lens</p>
              <div className="mt-3 grid gap-2">
                {lenses.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedLens(item.id)}
                    className={`lens-option ${selectedLens === item.id ? "lens-option-active" : ""}`}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 bg-black/35">
                      <Image src={item.asset} alt="" width={34} height={34} className="h-auto w-auto" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-[#fff8e6]">{item.name}</span>
                      <span className="mt-0.5 block text-sm leading-5 text-[#d8c8a8]/78">
                        {lensPreviewCopy[item.id]}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="vn-layout relative z-10 mx-auto grid min-h-[calc(100svh-68px)] w-full max-w-[1500px] gap-3 px-3 pb-3 pt-2 sm:px-5 lg:grid-cols-[210px_minmax(0,1fr)_255px]">
          <aside className="vn-side-panel order-2 lg:order-1">
            {life ? (
              <>
                <div className="vn-panel-label">Subject</div>
                <div className="mt-3 flex items-center gap-3">
                  <Image
                    src={life.character.avatar}
                    alt=""
                    width={74}
                    height={92}
                    className="h-24 w-16 border border-[#2f3a36] bg-[#111815] object-contain object-bottom"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-[#e9f3d1]">{life.character.name}</h2>
                    <p className="mt-1 text-xs leading-5 text-[#b6c2a0]">
                      {life.character.age}, {life.character.city}
                    </p>
                    <p className="text-xs leading-5 text-[#b6c2a0]">{life.character.job}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 border-t border-[#31423a] pt-4">
                  {Object.entries(life.state).map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#b6c2a0]">
                        <span>{key}</span>
                        <span>{statLabel(value)}</span>
                      </div>
                      <div className="h-2 border border-[#29362f] bg-[#111815]">
                        <div className="h-full bg-[#9fc8a0]" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <div className="mt-5 border-t border-[#31423a] pt-4">
              <div className="vn-panel-label">Scenes</div>
              <div className="mt-3 grid gap-2">
                {scenes.map((scene) => (
                  <div key={scene.id} className={`scene-chip ${scene.id === activeScene.id ? "scene-chip-active" : ""}`}>
                    <span className="scene-chip-image">
                      <Image src={scene.asset} alt="" width={64} height={36} className="h-full w-full object-cover" />
                    </span>
                    <span>{scene.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="vn-console order-1 lg:order-2">
            <div className="vn-console-bar">
              <span>
                {beat.year} / {beat.title}
              </span>
              <span>
                beat {visibleBeatIndex + 1}:{timeline.length}
              </span>
            </div>

            <div className="vn-viewport">
              <Image
                src={activeScene.asset}
                alt={activeScene.name}
                fill
                priority
                sizes="(min-width: 1024px) 1000px, 100vw"
                className="object-cover"
                style={{ objectPosition: activeScene.position }}
              />
              {life ? (
                <Image
                  src={life.character.avatar}
                  alt=""
                  width={360}
                  height={450}
                  priority
                  className="vn-character-sprite"
                />
              ) : null}
              <div className="vn-viewport-shade" aria-hidden="true" />
            </div>

            <div className="vn-dialogue-box">
              <div className="vn-speaker-row">
                <span>{life?.character.name ?? "Narrator"}</span>
                <span className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[#9fb19b]">{activeScene.name}</span>
              </div>
              <p>
                {displayedNarration || "The monitor warms. Somewhere past the window, the next year is already compiling."}
                {loading ? <span className="ml-1 animate-pulse text-[#e9f3d1]">_</span> : null}
              </p>
            </div>
          </section>

          <aside className="vn-menu-panel order-3">
            <div>
              <div className="vn-panel-label">Action</div>
              <div className="mt-3 grid gap-3">
                {event && !loading && event.kind === "event" ? (
                  event.choices.map((choice, index) => (
                    <button key={choice.id} onClick={() => choose(choice.id)} className="vn-choice-button">
                      <span className="font-mono text-[0.68rem]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-lg font-semibold">{choice.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#b6c2a0]">{choice.detail}</span>
                      </span>
                    </button>
                  ))
                ) : phase === "summary" && event ? (
                  <button className="vn-choice-button" onClick={replay}>
                    <RotateCcw size={16} aria-hidden="true" />
                    <span className="text-lg font-semibold">Replay</span>
                  </button>
                ) : (
                  <button className="vn-choice-button" disabled>
                    <span className="font-mono text-[0.68rem]">00</span>
                    <span className="text-lg font-semibold">{loading ? "Wait" : "Listen"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-[#31423a] pt-4">
              <div className="vn-panel-label">Lens</div>
              <div className="mt-3 flex items-center gap-3">
                <Image
                  src={lens.asset}
                  alt=""
                  width={42}
                  height={42}
                  className="h-auto w-auto border border-[#31423a] bg-[#111815]"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[#e9f3d1]">{lens.name}</h2>
                  <p className="text-xs leading-5 text-[#b6c2a0]">{lensPreviewCopy[lens.id]}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-[#31423a] pt-4">
              <div className="mb-2 flex items-center justify-between font-mono text-[0.64rem] uppercase tracking-[0.15em] text-[#b6c2a0]">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 border border-[#29362f] bg-[#111815]">
                <div className="h-full bg-[#d6d59a]" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {event ? (
              <div className="mt-5 border-t border-[#31423a] pt-4">
                <div className="vn-panel-label">Signal</div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    title="This event worked"
                    onClick={() => sendFeedback("up")}
                    className={`feedback-button ${event.feedback === "up" ? "feedback-button-active" : ""}`}
                  >
                    <ThumbsUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    title="This event missed"
                    onClick={() => sendFeedback("down")}
                    className={`feedback-button ${event.feedback === "down" ? "feedback-button-active" : ""}`}
                  >
                    <ThumbsDown size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </section>
      )}
    </main>
  );
}
