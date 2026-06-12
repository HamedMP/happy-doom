"use client";

import Image from "next/image";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChevronRight,
  Eye,
  FileText,
  Handshake,
  Heart,
  Megaphone,
  Monitor,
  PhoneCall,
  RotateCcw,
  SearchCheck,
  Shield,
  Sparkles,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { lenses } from "@/lib/game/lenses";
import {
  demoStorylineScenarios,
  experienceScenarios
} from "@/lib/game/experience-scenarios";
import type { LensId, LifeSummary, StoredEvent } from "@/lib/game/types";

type Phase = "landing" | "setup" | "playing" | "summary";

type Persona = {
  name: string;
  age: number;
  city: string;
  job: string;
  trait: string;
};

type ConfigStatus = {
  hasAiGateway: boolean;
  model: string;
  requiredEnv: string[];
};

type EventPayload = {
  event: StoredEvent;
  life: LifeSummary;
  usedAi: boolean;
  cached: boolean;
};

type ChatItem = {
  id: string;
  role: "system" | "narrator" | "player";
  text: string;
};

const defaultPersona: Persona = {
  name: "Sam Rivera",
  age: 34,
  city: "San Francisco",
  job: "senior platform engineer",
  trait: "reports failures even when the dashboard says green"
};

const profilePresets: Array<{ id: string; title: string; persona: Persona; hook: string; signal: string }> = [
  {
    id: "sam",
    title: "The engineer",
    persona: defaultPersona,
    hook: "You see the automation from inside the machine room.",
    signal: "Best for demo stakes"
  },
  {
    id: "priya",
    title: "The evaluator",
    persona: {
      name: "Priya Shah",
      age: 41,
      city: "London",
      job: "AI safety evaluator",
      trait: "turns vague safety claims into tests"
    },
    hook: "Your job is to decide what counts as proof before proof gets automated.",
    signal: "Risk literacy"
  },
  {
    id: "lina",
    title: "The scheduler",
    persona: {
      name: "Lina Ortiz",
      age: 29,
      city: "Oakland",
      job: "hospital operations scheduler",
      trait: "notices when optimization hides responsibility"
    },
    hook: "You watch ordinary systems quietly become life-or-death infrastructure.",
    signal: "Public impact"
  },
  {
    id: "maya",
    title: "The comms lead",
    persona: {
      name: "Maya Chen",
      age: 32,
      city: "Berlin",
      job: "frontier lab communications lead",
      trait: "tries to tell the truth through synthetic channels"
    },
    hook: "You know what the company knows, but not what the public can hear.",
    signal: "Trust collapse"
  }
];

function sceneForBeat(beatIndex: number) {
  if (beatIndex <= 2) return "/assets/experience/office-terminal.png";
  if (beatIndex === 3) return "/assets/experience/store-night.png";
  if (beatIndex >= 5) return "/assets/experience/train-night.png";
  return "/assets/experience/landing-room.png";
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

function StatBar({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="hd-stat">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Icon size={13} />
          {label}
        </span>
        <span>{value}</span>
      </div>
      <div className="hd-stat-bar">
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Message({ item }: { item: ChatItem }) {
  return (
    <div className={`hd-msg ${item.role}`}>
      <p className="whitespace-pre-wrap">{item.text}</p>
    </div>
  );
}

function profileMatches(left: Persona, right: Persona) {
  return left.name === right.name && left.job === right.job && left.city === right.city;
}

function iconForChoice(label: string, detail: string): LucideIcon {
  const text = `${label} ${detail}`.toLowerCase();

  if (/verify|audit|proof|test|document|record|postmortem|source|log/.test(text)) return SearchCheck;
  if (/tell|warn|publish|share|announce|message|public|press/.test(text)) return Megaphone;
  if (/call|friend|family|partner|parent|team|neighbor|relationship/.test(text)) return PhoneCall;
  if (/work|ship|manager|dashboard|deploy|company|job|career|meeting/.test(text)) return BriefcaseBusiness;
  if (/refuse|resist|block|challenge|demand|protect|risk/.test(text)) return Shield;
  if (/money|pay|buy|market|rent|cash|bonus|salary/.test(text)) return BadgeDollarSign;
  if (/join|coordinate|collective|community|mutual|together/.test(text)) return Handshake;
  if (/watch|wait|observe|listen|notice/.test(text)) return Eye;
  if (/relationship|people|colleague|customer|patient|user/.test(text)) return Users;
  return FileText;
}

export function HappyDoomGame() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [lensId, setLensId] = useState<LensId>("severance");
  const [persona, setPersona] = useState<Persona>(defaultPersona);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [life, setLife] = useState<LifeSummary | null>(null);
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const lens = lenses.find((entry) => entry.id === lensId) ?? lenses[0];
  const year = event ? 2025 + Math.min(2, Math.floor(event.beatIndex / 2.5)) : 2025;
  const progress = life ? Math.min(100, Math.round((life.beatIndex / 7) * 100)) : 0;
  const scene = sceneForBeat(event?.beatIndex ?? life?.beatIndex ?? 0);
  const situationActions = useMemo(() => {
    if (!event || event.kind !== "event") return [];
    return event.choices.map((choice) => ({
      choice,
      Icon: iconForChoice(choice.label, choice.detail)
    }));
  }, [event]);

  const aiLabel = useMemo(() => {
    if (!config) return "waiting";
    return config.hasAiGateway ? `AI / ${config.model}` : "local fallback";
  }, [config]);

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then(setConfig)
      .catch(() => setConfig({ hasAiGateway: false, model: "openai/gpt-5.4", requiredEnv: ["AI_GATEWAY_API_KEY"] }));
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, streamingText, event]);

  async function requestEvent(lifeId: string, selectedChoiceId?: string, selectedLabel?: string) {
    setLoading(true);
    setError(null);
    setStreamingText("");

    if (selectedLabel) {
      setChat((current) => [...current, { id: crypto.randomUUID(), role: "player", text: selectedLabel }]);
    }

    try {
      const response = await fetch(`/api/life/${lifeId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedChoiceId })
      });
      const payload = await readEventStream(response, (delta) => setStreamingText((current) => current + delta));
      setLife(payload.life);
      setEvent(payload.event);
      setChat((current) => [...current, { id: payload.event.id, role: "narrator", text: payload.event.narration }]);
      setStreamingText("");
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
    setChat([
      {
        id: "system-start",
        role: "system",
        text: `${persona.name}, ${persona.age}. ${persona.job} in ${persona.city}. Lens: ${lens.name}. History is fixed. You are not.`
      }
    ]);

    try {
      const response = await fetch("/api/life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lens: lensId,
          character: {
            ...persona,
            avatar: "/assets/avatars/avatar-01.svg",
            palette: "amber"
          }
        })
      });
      const payload = (await response.json()) as { life: LifeSummary };
      setLife(payload.life);
      setPhase("playing");
      await requestEvent(payload.life.lifeId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start life.");
      setLoading(false);
    }
  }

  function reset() {
    setPhase("landing");
    setLife(null);
    setEvent(null);
    setChat([]);
    setStreamingText("");
    setError(null);
  }

  function chooseCurrent(choiceId: string, label: string) {
    if (!life || loading) return;
    void requestEvent(life.lifeId, choiceId, label);
  }

  if (phase === "landing") {
    return (
      <main className="min-h-screen bg-[#060708] text-[var(--hd-cream)]">
        <section className="hd-hero relative min-h-screen overflow-hidden">
          <div className="hd-rain" />

          <div className="relative z-10 flex min-h-screen flex-col justify-between px-5 py-5 sm:px-10 lg:px-16">
            <header className="hd-rise flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="hd-kicker">Happy Doom</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">One Life Before the Singularity</h1>
              </div>
              <p className="hd-kicker hidden pt-2 text-[#9fb6b1] md:block">2025–2027 &nbsp;•&nbsp; Fixed history</p>
              <div className="hd-badge">
                <Sparkles size={13} />
                {aiLabel}
              </div>
            </header>

            <section className="grid items-end gap-10 pb-4 lg:grid-cols-[1fr_420px]">
              <div>
                <p className="hd-kicker hd-rise hd-rise-2">2025 / Rented room / Rain outside</p>
                <h2 className="hd-rise hd-rise-2 mt-5 max-w-3xl text-5xl font-extrabold leading-[0.98] tracking-tight text-[#f5edd3] sm:text-6xl lg:text-7xl">
                  One ordinary life, while history locks the door.
                </h2>
                <p className="hd-rise hd-rise-3 mt-6 max-w-xl text-lg leading-8 text-[#d8cdaf]">
                  The city is awake. The machine on the desk is still warm. Choose the tone of the life you are about to remember.
                </p>
                <button className="hd-primary hd-rise hd-rise-4 mt-8" onClick={() => setPhase("setup")}>
                  <Monitor size={19} />
                  Start life
                </button>
              </div>

              <aside className="hd-panel hd-rise hd-rise-3 p-5">
                <p className="hd-kicker">Select lens</p>
                <div className="mt-4 grid gap-3">
                  {lenses.map((entry) => (
                    <button
                      key={entry.id}
                      className="hd-lens"
                      data-selected={entry.id === lensId}
                      onClick={() => setLensId(entry.id)}
                    >
                      <Image src={entry.asset} alt="" width={52} height={52} className="hd-pixel border border-white/10 bg-black/60" />
                      <span>
                        <span className="block text-lg font-bold">{entry.name}</span>
                        <span className="mt-0.5 block text-sm leading-5 text-[#c4b899]">{entry.tagline}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </section>
          </div>
        </section>

        <section className="hd-section px-5 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <p className="hd-kicker">Fixed history / 2025–2027</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-[#f5edd3]">
              Seven beats. The world does not negotiate. You do.
            </h2>
            <p className="mt-4 max-w-2xl leading-7 text-[#bdb293]">
              Every life crosses the same seven days the history books will flatten into a paragraph. What the paragraph leaves out is you.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {experienceScenarios.map((scenario) => (
                <article key={scenario.beatIndex} className="hd-scenario">
                  <div className="flex items-center justify-between gap-2">
                    <span className="hd-meta">Beat 0{scenario.beatIndex + 1} / {scenario.time}</span>
                    <span className="hd-tag">{scenario.pressure}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold leading-tight text-[#f5edd3]">{scenario.title}</h3>
                    <p className="hd-meta mt-1.5 normal-case tracking-normal">{scenario.location}</p>
                  </div>
                  <p className="text-sm leading-6 text-[#c9bd9e]">{scenario.narration}</p>
                  <ul className="mt-auto grid gap-1.5 border-t border-white/10 pt-3">
                    {scenario.choices.map((choice) => (
                      <li key={choice.label} className="flex items-baseline justify-between gap-3 font-mono text-[11px] text-[#9fb6b1]">
                        <span className="text-[#e3d8b8]">{choice.label}</span>
                        <span className="shrink-0 text-[#7e948f]">{choice.cost}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hd-section border-t border-white/5 px-5 py-16 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <p className="hd-kicker">Storyline dossiers</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-[#f5edd3]">
              The dilemmas the narrator is allowed to hand you.
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {demoStorylineScenarios.map((storyline) => (
                <article key={storyline.id} className="hd-scenario">
                  <div className="flex items-center justify-between gap-2">
                    <span className="hd-meta">Beat 0{storyline.beatIndex + 1}</span>
                    <span className="hd-tag">{storyline.endingPattern}</span>
                  </div>
                  <h3 className="text-xl font-bold leading-tight text-[#f5edd3]">{storyline.title}</h3>
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#9fb6b1]">{storyline.agiPrepSkill}</p>
                  <p className="text-sm leading-6 text-[#c9bd9e]">{storyline.setup}</p>
                  <p className="border-l-2 border-[var(--hd-gold)] pl-3 text-sm italic leading-6 text-[#e3d8b8]">
                    {storyline.hardChoice}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-14 flex flex-col items-start gap-4 border border-[var(--hd-teal-dim)] bg-black/40 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-extrabold text-[#f5edd3]">The timeline is already written.</h3>
                <p className="mt-1 text-[#bdb293]">Your character is not. Begin in the rented room, 2025.</p>
              </div>
              <button className="hd-primary" onClick={() => { window.scrollTo({ top: 0 }); setPhase("setup"); }}>
                <Monitor size={19} />
                Start life
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 px-5 py-6 sm:px-10 lg:px-16">
          <p className="hd-meta">Happy Doom / one life before the singularity / {aiLabel}</p>
        </footer>
      </main>
    );
  }

  if (phase === "setup") {
    return (
      <main className="relative min-h-screen overflow-hidden text-[var(--hd-cream)]">
        <Image src="/assets/experience/landing-room.png" alt="" fill priority className="hd-pixel object-cover" />
        <div className="hd-rain" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
          <section className="hd-panel w-full max-w-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="hd-kicker">{lens.name} lens / 2025</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#f5edd3] sm:text-4xl">
                  Who is living this one?
                </h1>
              </div>
              <div className="hd-badge">{aiLabel}</div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {profilePresets.map((profile) => (
                <button
                  key={profile.id}
                  className="hd-profile"
                  data-selected={profileMatches(persona, profile.persona)}
                  onClick={() => setPersona(profile.persona)}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-sm font-extrabold text-[#f5edd3]">{profile.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#c4b899]">{profile.hook}</span>
                    </span>
                    <span className="hd-profile-signal">{profile.signal}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {(["name", "city", "job"] as const).map((field) => (
                <label key={field} className="grid gap-1.5">
                  <span className="hd-kicker tracking-[0.2em]">{field}</span>
                  <input
                    className="hd-input"
                    value={persona[field]}
                    onChange={(input) => setPersona({ ...persona, [field]: input.target.value })}
                  />
                </label>
              ))}
              <label className="grid gap-1.5">
                <span className="hd-kicker tracking-[0.2em]">age</span>
                <input
                  className="hd-input"
                  type="number"
                  min={18}
                  max={90}
                  value={persona.age}
                  onChange={(input) => setPersona({ ...persona, age: Number(input.target.value) || 25 })}
                />
              </label>
              <label className="grid gap-1.5 sm:col-span-2">
                <span className="hd-kicker tracking-[0.2em]">trait</span>
                <input
                  className="hd-input"
                  value={persona.trait}
                  onChange={(input) => setPersona({ ...persona, trait: input.target.value })}
                />
              </label>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button className="hd-primary" onClick={startLife} disabled={loading}>
                <Monitor size={19} />
                {loading ? "Opening 2025" : "Begin this life"}
              </button>
              <button className="hd-ghost" onClick={() => setPhase("landing")} disabled={loading}>
                Back
              </button>
            </div>
            {error ? <p className="mt-4 text-sm text-[#ffb4a8]">{error}</p> : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden text-[var(--hd-cream)]">
      <Image src={scene} alt="" fill priority className="hd-pixel object-cover" />
      <div className="hd-shade" />

      <div className="relative z-10 mx-auto flex h-dvh max-w-6xl flex-col gap-3 p-3 sm:p-4">
        <header className="hd-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="hd-kicker">{lens.name} lens / fixed history</p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#f5edd3]">
              {event?.title ?? "Opening the file"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hd-badge">{year}</span>
            <div className="h-2 w-32 bg-white/10 sm:w-44">
              <div className="h-full bg-[var(--hd-gold)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[290px_1fr]">
          <aside className="hd-panel hidden content-start gap-3 p-4 lg:grid">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/avatars/avatar-01.svg"
                alt=""
                width={56}
                height={56}
                className="hd-pixel border border-[var(--hd-teal-dim)] bg-black/60"
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-[#f5edd3]">{persona.name}</h2>
                <p className="hd-meta mt-0.5">Age {life?.character.age ?? persona.age} / {persona.city}</p>
              </div>
            </div>

            {life ? (
              <div className="grid gap-2">
                <StatBar icon={BriefcaseBusiness} label="Career" value={life.state.career} />
                <StatBar icon={Heart} label="Social" value={life.state.relationships} />
                <StatBar icon={BadgeDollarSign} label="Money" value={life.state.money} />
                <StatBar icon={Shield} label="Truth" value={life.state.beliefs} />
              </div>
            ) : null}

            <div className="mt-1 grid gap-2">
              <p className="hd-meta">Situation actions</p>
              {situationActions.length > 0 ? (
                situationActions.map(({ choice, Icon }) => (
                  <button
                    key={choice.id}
                    title={choice.detail}
                    className="hd-action"
                    data-wide="true"
                    disabled={loading || !life}
                    onClick={() => chooseCurrent(choice.id, choice.label)}
                  >
                    <Icon size={16} />
                    <span>
                      <span>{choice.label}</span>
                      <small>{choice.detail}</small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="hd-action-empty">
                  {loading ? "Waiting for narrator" : "Actions appear after the next scene"}
                </div>
              )}
            </div>
          </aside>

          <section className="hd-panel flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 lg:hidden">
              <p className="hd-meta">{persona.name} / age {life?.character.age ?? persona.age}</p>
              <span className="hd-meta text-[var(--hd-gold)]">{aiLabel}</span>
            </div>

            {life ? (
              <div className="grid grid-cols-4 gap-2 border-b border-white/10 p-3 lg:hidden">
                <StatBar icon={BriefcaseBusiness} label="Career" value={life.state.career} />
                <StatBar icon={Heart} label="Social" value={life.state.relationships} />
                <StatBar icon={BadgeDollarSign} label="Money" value={life.state.money} />
                <StatBar icon={Shield} label="Truth" value={life.state.beliefs} />
              </div>
            ) : null}

            <div ref={feedRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {chat.map((item) => (
                <Message key={item.id} item={item} />
              ))}
              {streamingText ? (
                <div className="hd-msg narrator">
                  <p className="whitespace-pre-wrap">
                    {streamingText}
                    <span className="hd-cursor">&nbsp;</span>
                  </p>
                </div>
              ) : null}
              {loading && !streamingText ? (
                <p className="hd-meta animate-pulse">The narrator is typing…</p>
              ) : null}
            </div>

            <div className="border-t border-white/10 p-3">
              {event && event.kind === "event" && phase === "playing" ? (
                <div className="grid gap-2">
                  {event.choices.map((choice) => (
                    <button
                      key={choice.id}
                      className="hd-choice"
                      disabled={loading || !life}
                      onClick={() => chooseCurrent(choice.id, choice.label)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block font-bold text-[#f5edd3]">{choice.label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#b3a888]">{choice.detail}</span>
                        </span>
                        <ChevronRight className="shrink-0 text-[var(--hd-gold)]" size={18} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {phase === "summary" ? (
                <button className="hd-primary w-full" onClick={reset}>
                  <RotateCcw size={18} />
                  Live another life
                </button>
              ) : null}

              {error ? <p className="mt-3 text-sm text-[#ffb4a8]">{error}</p> : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
