"use client";

import {
  BadgeDollarSign,
  BriefcaseBusiness,
  ChevronRight,
  Heart,
  Info,
  MessageCircle,
  RotateCcw,
  Shield,
  Sparkles,
  UserRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { bitlifeActions } from "@/lib/game/bitlife-actions";
import type { LifeSummary, StoredEvent } from "@/lib/game/types";

type Phase = "setup" | "playing" | "summary";

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
  trait: "reports failures even when the metrics look good"
};

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
    <div className="bitlife-stat">
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em]">
        <span className="flex items-center gap-1.5">
          <Icon size={13} />
          {label}
        </span>
        <span>{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[#26c485]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Message({ item }: { item: ChatItem }) {
  return (
    <div className={`bitlife-message ${item.role}`}>
      <p>{item.text}</p>
    </div>
  );
}

export function BitlifeMobileGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [persona, setPersona] = useState<Persona>(defaultPersona);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [life, setLife] = useState<LifeSummary | null>(null);
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const year = event ? 2025 + Math.min(2, Math.floor(event.beatIndex / 2.5)) : 2025;
  const aiLabel = useMemo(() => {
    if (!config) return "checking";
    return config.hasAiGateway ? `AI SDK: ${config.model}` : "local fallback";
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
      setChat((current) => [
        ...current,
        {
          id: payload.event.id,
          role: "narrator",
          text: payload.event.narration
        }
      ]);
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
        text: `You are ${persona.name}, ${persona.age}, a ${persona.job} in ${persona.city}. The lens is Severance.`
      }
    ]);

    try {
      const response = await fetch("/api/life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lens: "severance",
          character: {
            ...persona,
            avatar: "/assets/avatars/avatar-01.svg",
            palette: "green"
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

  function reset() {
    setPhase("setup");
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

  function chooseActionShortcut(actionLabel: string, actionIndex: number) {
    if (!life || !event || event.kind !== "event" || loading) return;
    const choice = event.choices[actionIndex % event.choices.length];
    chooseCurrent(choice.id, `${actionLabel}: ${choice.label}`);
  }

  return (
    <main className="bitlife-shell min-h-screen bg-[#eef2e8] px-3 py-4 text-[#18211e]">
      <section className="mx-auto flex min-h-[calc(100vh-32px)] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border border-black/10 bg-[#f9fbf2] shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <header className="bitlife-topbar">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5c7169]">Happy Doom</p>
            <h1 className="text-2xl font-black tracking-tight">Post-AGI Life</h1>
          </div>
          <div className="rounded-full bg-[#dff7e9] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#146b43]">
            {year}
          </div>
        </header>

        {phase === "setup" ? (
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="bitlife-card">
              <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#18211e] text-[#f9fbf2]">
                  <UserRound size={28} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5c7169]">Configure project</p>
                  <h2 className="mt-1 text-xl font-black">AI narrator status</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5c7169]">
                    {config?.hasAiGateway
                      ? `Using Vercel AI SDK with ${config.model}.`
                      : "Add AI_GATEWAY_API_KEY to .env.local to enable the live AI narrator. Local fallback works now."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bitlife-card grid gap-3">
              {(["name", "city", "job", "trait"] as const).map((field) => (
                <label key={field} className="grid gap-1">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5c7169]">{field}</span>
                  <input
                    className="bitlife-input"
                    value={persona[field]}
                    onChange={(input) => setPersona({ ...persona, [field]: input.target.value })}
                  />
                </label>
              ))}
              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5c7169]">age</span>
                <input
                  className="bitlife-input"
                  type="number"
                  min={18}
                  max={90}
                  value={persona.age}
                  onChange={(input) => setPersona({ ...persona, age: Number(input.target.value) || 25 })}
                />
              </label>
            </div>

            <button className="bitlife-primary mt-auto" onClick={startLife} disabled={loading}>
              <Sparkles size={18} />
              {loading ? "Starting life" : "Start life"}
            </button>
            {error ? <p className="text-sm font-bold text-[#b33a2f]">{error}</p> : null}
          </div>
        ) : (
          <>
            <section className="border-b border-black/10 bg-white/70 p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#18211e] text-[#f9fbf2]">
                  <UserRound size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-black">{persona.name}</h2>
                  <p className="truncate text-sm text-[#5c7169]">Age {life?.character.age ?? persona.age} / {persona.city}</p>
                </div>
                <div className="rounded-2xl bg-[#18211e] px-3 py-2 text-center text-[#f9fbf2]">
                  <p className="text-[10px] uppercase tracking-[0.16em]">Mode</p>
                  <p className="text-xs font-black">Severance</p>
                </div>
              </div>
              {life ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatBar icon={BriefcaseBusiness} label="Career" value={life.state.career} />
                  <StatBar icon={Heart} label="Social" value={life.state.relationships} />
                  <StatBar icon={BadgeDollarSign} label="Money" value={life.state.money} />
                  <StatBar icon={Shield} label="Truth" value={life.state.beliefs} />
                </div>
              ) : null}
            </section>

            <section ref={feedRef} className="bitlife-feed flex-1 space-y-3 overflow-y-auto p-3">
              <div className="bitlife-ai-mode">
                <Info size={14} />
                {aiLabel}
              </div>
              {chat.map((item) => (
                <Message key={item.id} item={item} />
              ))}
              {streamingText ? <Message item={{ id: "streaming", role: "narrator", text: streamingText }} /> : null}
            </section>

            <section className="border-t border-black/10 bg-[#f9fbf2] p-3">
              {event && event.kind === "event" ? (
                <div className="grid gap-2">
                  {event.choices.map((choice) => (
                    <button
                      key={choice.id}
                      className="bitlife-choice"
                      disabled={loading || !life}
                      onClick={() => chooseCurrent(choice.id, choice.label)}
                    >
                      <MessageCircle size={17} />
                      <span>
                        <span className="block font-black">{choice.label}</span>
                        <span className="block text-xs leading-5 text-[#5c7169]">{choice.detail}</span>
                      </span>
                      <ChevronRight className="ml-auto shrink-0" size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <button className="bitlife-primary w-full" onClick={reset}>
                  <RotateCcw size={18} />
                  New life
                </button>
              )}

              <div className="mt-3 grid grid-cols-4 gap-2">
                {bitlifeActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      title={action.description}
                      className="bitlife-action"
                      disabled={loading || !life || !event || event.kind !== "event"}
                      onClick={() => chooseActionShortcut(action.label, index)}
                    >
                      <Icon size={17} />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
