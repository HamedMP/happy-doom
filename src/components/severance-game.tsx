"use client";

import Image from "next/image";
import { BadgeDollarSign, BriefcaseBusiness, Camera, ChevronRight, HeartPulse, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LifeSummary, StoredEvent } from "@/lib/game/types";

type Phase = "landing" | "persona" | "playing" | "summary";

type EventPayload = {
  event: StoredEvent;
  life: LifeSummary;
  usedAi: boolean;
  cached: boolean;
};

type Persona = {
  name: string;
  age: number;
  city: string;
  job: string;
  trait: string;
  palette: string;
  hasSelfie: boolean;
};

const defaultPersona: Persona = {
  name: "Mara Vale",
  age: 31,
  city: "New York",
  job: "Lumon workflow analyst",
  trait: "Notices when a form asks the wrong question",
  palette: "amber",
  hasSelfie: false
};

const swatches: Record<string, string> = {
  amber: "#f0c86a",
  teal: "#8fd8d2",
  green: "#91d987",
  red: "#d56a59"
};

function sceneForBeat(beatIndex: number) {
  if (beatIndex <= 2) return "/assets/experience/office-terminal.png";
  if (beatIndex === 3) return "/assets/experience/store-night.png";
  if (beatIndex >= 5) return "/assets/experience/train-night.png";
  return "/assets/experience/landing-room.png";
}

function PersonaAvatar({ persona }: { persona: Persona }) {
  const accent = swatches[persona.palette] ?? swatches.amber;

  return (
    <svg viewBox="0 0 220 260" className="h-full w-full" role="img" aria-label={`${persona.name} avatar`}>
      <rect width="220" height="260" fill="#07100f" />
      <path d="M30 232 C43 178 70 149 110 149 C151 149 177 178 190 232 Z" fill={accent} stroke="#030707" strokeWidth="7" />
      <path d="M70 150 L150 150 L139 216 L81 216 Z" fill="#eef0df" stroke="#030707" strokeWidth="7" />
      <circle cx="110" cy="92" r="50" fill="#c99b7d" stroke="#030707" strokeWidth="7" />
      <path d="M60 88 C67 42 98 29 134 38 C154 44 167 59 167 84 C145 69 111 68 60 88 Z" fill="#19201f" stroke="#030707" strokeWidth="7" />
      <path d="M86 96 L94 96 M126 96 L134 96" stroke="#030707" strokeWidth="7" strokeLinecap="round" />
      <path d="M92 122 C104 131 119 131 132 122" stroke="#030707" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="160" cy="84" r="17" fill={persona.hasSelfie ? "#91d987" : "#eef0df"} stroke="#030707" strokeWidth="6" />
    </svg>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="severance-stat">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Icon size={14} />
          {label}
        </span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-1.5 bg-white/10">
        <div className="h-full bg-[#f0c86a]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

async function readEventStream(response: Response, onNarration: (delta: string) => void) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: EventPayload | null = null;

  if (!reader) throw new Error("No response stream.");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const eventLine = chunk.split("\n").find((line) => line.startsWith("event: "));
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
      if (!eventLine || !dataLine) continue;

      const event = eventLine.slice(7);
      const data = JSON.parse(dataLine.slice(6));
      if (event === "narration") onNarration(data.delta);
      if (event === "event") finalPayload = data as EventPayload;
      if (event === "error") throw new Error(data.error);
    }
  }

  if (!finalPayload) throw new Error("The narrator did not return an event.");
  return finalPayload;
}

export function SeveranceGame() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [persona, setPersona] = useState<Persona>(defaultPersona);
  const [life, setLife] = useState<LifeSummary | null>(null);
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [streamedNarration, setStreamedNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"ai" | "local" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "live" | "blocked" | "captured">("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const scene = sceneForBeat(event?.beatIndex ?? life?.beatIndex ?? 0);
  const narration = loading && streamedNarration ? streamedNarration : event?.narration;
  const progress = life ? Math.min(100, Math.round((life.beatIndex / 7) * 100)) : 0;
  const badge = useMemo(() => (aiMode === "ai" ? "AI narrator" : aiMode === "local" ? "local fallback" : "waiting"), [aiMode]);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraStatus("live");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraStatus("blocked");
    }
  }

  function captureSelfie() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPersona((current) => ({ ...current, hasSelfie: true }));
    setCameraStatus("captured");
  }

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
      const payload = await readEventStream(response, (delta) => setStreamedNarration((current) => current + delta));
      setLife(payload.life);
      setEvent(payload.event);
      setAiMode(payload.usedAi ? "ai" : "local");
      setPhase(payload.event.kind === "epilogue" ? "summary" : "playing");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate event.");
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
        body: JSON.stringify({
          lens: "severance",
          character: {
            name: persona.name,
            age: persona.age,
            city: persona.city,
            job: persona.job,
            trait: persona.trait,
            palette: persona.palette,
            avatar: "/assets/avatars/avatar-01.svg"
          }
        })
      });
      const payload = (await response.json()) as { life: LifeSummary };
      setLife(payload.life);
      await requestEvent(payload.life.lifeId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start life.");
      setLoading(false);
    }
  }

  function replay() {
    setPhase("landing");
    setLife(null);
    setEvent(null);
    setStreamedNarration("");
    setAiMode(null);
    setError(null);
  }

  if (phase === "landing") {
    return (
      <main className="severance-landing min-h-screen overflow-hidden text-[#fff5dd]">
        <Image src="/assets/experience/office-terminal.png" alt="" fill priority className="object-cover" />
        <div className="severance-vignette" />
        <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 py-5 sm:px-12 lg:px-20">
          <header className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-[#9bb8b4]">Happy Doom</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">One Life Before the Singularity</h1>
            </div>
            <p className="hidden font-mono text-xs uppercase tracking-[0.34em] text-[#f0c86a] md:block">2025-2027 / Fixed History</p>
            <div className="border border-[#78918c]/40 bg-black/35 px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-[#b7d6d0]">
              {badge}
            </div>
          </header>

          <section className="grid items-end gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="font-mono text-sm uppercase tracking-[0.36em] text-[#a8b9ad]">2025 / Rented room / Rain outside</p>
              <h2 className="mt-6 max-w-4xl text-5xl font-black leading-[0.94] tracking-tight text-[#fff5dd] sm:text-6xl lg:text-7xl">
                One ordinary life, while history locks the door.
              </h2>
              <p className="mt-6 max-w-2xl text-xl leading-8 text-[#d9cdb2]">
                The city is awake. The machine on the desk is still warm. You cannot stop the timeline. You can choose who you become inside it.
              </p>
              <button className="severance-primary mt-8" onClick={() => setPhase("persona")}>
                <UserRound size={20} />
                Create your innie
              </button>
            </div>

            <aside className="severance-glass p-5">
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#9bb8b4]">Case focus</p>
              <div className="mt-5 border border-[#8fb8ae]/45 bg-[#10211f]/70 p-4">
                <div className="grid grid-cols-[64px_1fr] gap-4">
                  <Image src="/assets/lenses/severance.svg" alt="" width={64} height={64} className="border border-white/10 bg-black/60" />
                  <div>
                    <h3 className="text-2xl font-black">Severance</h3>
                    <p className="mt-1 leading-6 text-[#c7b99a]">Corporate dystopia, split selves, work as a second life.</p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    );
  }

  if (phase === "persona") {
    return (
      <main className="severance-intake min-h-screen bg-[#080d0c] p-4 text-[#fff5dd]">
        <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl gap-4 lg:grid-cols-[1fr_380px]">
          <section className="severance-glass p-5 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#f0c86a]">Lumon voluntary continuity form</p>
            <h1 className="mt-4 text-5xl font-black leading-none sm:text-7xl">Tell the system who you are before it guesses.</h1>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(["name", "city", "job", "trait"] as const).map((field) => (
                <label key={field} className={field === "trait" ? "sm:col-span-2" : ""}>
                  <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#9bb8b4]">{field}</span>
                  <input
                    className="severance-input"
                    value={persona[field]}
                    onChange={(event) => setPersona({ ...persona, [field]: event.target.value })}
                  />
                </label>
              ))}
              <label>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#9bb8b4]">age</span>
                <input
                  type="number"
                  min={18}
                  max={90}
                  className="severance-input"
                  value={persona.age}
                  onChange={(event) => setPersona({ ...persona, age: Number(event.target.value) || 31 })}
                />
              </label>
              <div>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#9bb8b4]">badge tint</span>
                <div className="mt-2 flex gap-2">
                  {Object.entries(swatches).map(([name, color]) => (
                    <button
                      key={name}
                      title={name}
                      onClick={() => setPersona({ ...persona, palette: name })}
                      className={`h-11 w-11 border ${persona.palette === name ? "border-[#fff5dd]" : "border-[#5e7772]"}`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="severance-glass overflow-hidden p-4">
              <div className="mx-auto h-[300px] max-w-[260px] border border-[#5e7772] bg-black">
                <PersonaAvatar persona={persona} />
              </div>
            </div>
            <div className="severance-glass p-4">
              <div className="relative min-h-[180px] overflow-hidden border border-[#5e7772] bg-black">
                <video ref={videoRef} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${cameraStatus === "live" ? "opacity-70" : "opacity-0"}`} />
                <div className="photo-scan absolute inset-0" />
                <div className="absolute inset-0 grid place-items-center text-center">
                  <Camera className="mx-auto text-[#f0c86a]" size={42} />
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.24em] text-[#f0c86a]">
                    {cameraStatus === "captured" ? "Identity scan complete" : cameraStatus === "live" ? "Camera live" : "Selfie scan"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="severance-secondary" onClick={startCamera}>Camera</button>
                <button className="severance-secondary" onClick={captureSelfie}>Capture</button>
              </div>
              <button className="severance-primary mt-3 w-full justify-center" onClick={startLife} disabled={loading}>
                {loading ? "Opening file" : "Begin Severance case"}
                <ChevronRight size={20} />
              </button>
              {error ? <p className="mt-3 text-sm text-[#ffb4a8]">{error}</p> : null}
            </div>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="severance-play min-h-screen overflow-hidden bg-black text-[#fff5dd]">
      <Image src={scene} alt="" fill priority className="object-cover" />
      <div className="severance-game-shade" />
      <div className="relative z-10 grid min-h-screen gap-4 p-3 lg:grid-cols-[1fr_360px]">
        <section className="relative flex min-h-[620px] flex-col justify-between border border-[#6c8e87]/50 bg-black/10">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6c8e87]/35 bg-black/45 px-4 py-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#9bb8b4]">Severance case / fixed history</p>
              <h1 className="mt-1 text-2xl font-black">{event?.title ?? "Opening file"}</h1>
            </div>
            <div className="h-2 w-40 bg-white/10">
              <div className="h-full bg-[#f0c86a]" style={{ width: `${progress}%` }} />
            </div>
          </header>

          <div className="mx-auto mb-8 w-[260px] opacity-95 drop-shadow-[0_18px_0_rgba(0,0,0,0.35)]">
            <PersonaAvatar persona={persona} />
          </div>

          <div className="m-4 border border-[#8fb8ae]/45 bg-[#06100f]/90 p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#f0c86a]">{persona.name} / {persona.job}</p>
            <p className="mt-3 min-h-[120px] whitespace-pre-wrap text-xl leading-9 text-[#f3ead5]">
              {narration || "The elevator is already waiting."}
              {loading ? <span className="animate-pulse">_</span> : null}
            </p>
          </div>
        </section>

        <aside className="grid content-start gap-3">
          <div className="severance-glass p-4">
            <div className="grid grid-cols-[82px_1fr] gap-3">
              <div className="border border-[#5e7772] bg-black">
                <PersonaAvatar persona={persona} />
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#9bb8b4]">Employee</p>
                <h2 className="mt-1 text-2xl font-black">{persona.name}</h2>
                <p className="text-sm leading-6 text-[#c7b99a]">{persona.age}, {persona.city}</p>
              </div>
            </div>
          </div>

          {life ? (
            <div className="grid grid-cols-2 gap-2">
              <Stat icon={BriefcaseBusiness} label="Career" value={life.state.career} />
              <Stat icon={HeartPulse} label="Relations" value={life.state.relationships} />
              <Stat icon={BadgeDollarSign} label="Money" value={life.state.money} />
              <Stat icon={ShieldCheck} label="Beliefs" value={life.state.beliefs} />
            </div>
          ) : null}

          <div className="severance-glass p-4">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#9bb8b4]">Choices</p>
            <div className="mt-3 grid gap-3">
              {event && event.kind === "event" && !loading
                ? event.choices.map((choice) => (
                    <button key={choice.id} className="severance-choice" onClick={() => life && requestEvent(life.lifeId, choice.id)}>
                      <span className="block text-lg font-black">{choice.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-[#c7b99a]">{choice.detail}</span>
                    </button>
                  ))
                : null}
              {phase === "summary" ? (
                <button className="severance-primary justify-center" onClick={replay}>
                  <RotateCcw size={18} />
                  Replay life
                </button>
              ) : null}
            </div>
            {error ? <p className="mt-3 text-sm text-[#ffb4a8]">{error}</p> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
