"use client";

import Image from "next/image";
import {
  BadgeDollarSign,
  BatteryMedium,
  Brain,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock4,
  Eye,
  HeartPulse,
  MessageSquareWarning,
  ShieldAlert,
  Thermometer,
  UserRound,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { experienceScenarios } from "@/lib/game/experience-scenarios";
import type { Scenario } from "@/lib/game/experience-scenarios";
import { lenses } from "@/lib/game/lenses";
import { timeline } from "@/lib/game/timeline";

type PrototypeId = "comic" | "pixel" | "casefile" | "phone";
type Phase = "onboarding" | "playing";

type Prototype = {
  id: PrototypeId;
  name: string;
  tagline: string;
  interaction: string;
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

const prototypes: Prototype[] = [
  {
    id: "comic",
    name: "Comic Spread",
    tagline: "A page of panels, captions, and sharp moral choices.",
    interaction: "Best when the game should feel authored, replayable, and emotionally legible."
  },
  {
    id: "pixel",
    name: "Pixel VN",
    tagline: "Retro dialogue scene with right-side action console.",
    interaction: "Best when the player should feel inside one tense room with one immediate choice."
  },
  {
    id: "casefile",
    name: "Crisis Desk",
    tagline: "Institutional map, alerts, and tradeoffs under pressure.",
    interaction: "Best when teaching systems, incentives, and AGI risk mechanics."
  },
  {
    id: "phone",
    name: "Ordinary Life",
    tagline: "Phone, calendar, receipts, and the apocalypse in small messages.",
    interaction: "Best when the emotional hook should feel intimate and everyday."
  }
];

const defaultPersona: Persona = {
  name: "Ari Quinn",
  age: 29,
  city: "New York",
  job: "Operations analyst",
  trait: "Checks twice when everyone else moves fast",
  palette: "amber",
  hasSelfie: false
};

const paletteSwatches: Record<string, string> = {
  amber: "#f5d06f",
  cyan: "#9bd1e5",
  green: "#93e072",
  rose: "#f3a6a6"
};

function meterTone(value: number) {
  if (value > 70) return "bg-[#e4572e]";
  if (value > 45) return "bg-[#f3a712]";
  return "bg-[#69b578]";
}

function Indicator({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded border border-black/10 bg-white/80 p-3 shadow-[3px_3px_0_rgba(0,0,0,0.18)]">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-700">
        <span className="flex items-center gap-1.5">
          <Icon size={14} />
          {label}
        </span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10">
        <div className={`h-full ${meterTone(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PersonaAvatar({ persona, compact = false }: { persona: Persona; compact?: boolean }) {
  const palette = {
    amber: ["#f5d06f", "#2f2419", "#f0a04b"],
    cyan: ["#9bd1e5", "#13293d", "#39a0ed"],
    green: ["#93e072", "#101b15", "#2dd4bf"],
    rose: ["#f3a6a6", "#35151f", "#e4572e"]
  }[persona.palette as "amber" | "cyan" | "green" | "rose"] ?? ["#f5d06f", "#2f2419", "#f0a04b"];

  const initials = persona.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HD";

  return (
    <svg
      viewBox="0 0 220 260"
      role="img"
      aria-label={`${persona.name} avatar`}
      className={compact ? "h-24 w-20 shrink-0" : "h-full min-h-[260px] w-full"}
    >
      <rect width="220" height="260" fill={palette[1]} />
      <path d="M28 232 C42 178 68 149 110 149 C152 149 178 178 192 232 Z" fill={palette[0]} stroke="#050505" strokeWidth="7" />
      <path d="M70 150 L150 150 L138 214 L82 214 Z" fill="#f8f2de" stroke="#050505" strokeWidth="7" />
      <circle cx="110" cy="92" r="50" fill="#d9ad8f" stroke="#050505" strokeWidth="7" />
      <path d="M61 88 C66 41 96 28 134 38 C153 43 166 58 167 83 C145 69 111 67 61 88 Z" fill={palette[2]} stroke="#050505" strokeWidth="7" />
      <path d="M87 95 L92 95 M128 95 L133 95" stroke="#050505" strokeWidth="7" strokeLinecap="round" />
      <path d="M91 121 C104 131 121 131 134 121" stroke="#050505" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="160" cy="84" r="17" fill={persona.hasSelfie ? "#93e072" : "#f8f2de"} stroke="#050505" strokeWidth="6" />
      <text x="110" y="244" textAnchor="middle" fontSize="28" fontWeight="900" fill="#f8f2de" fontFamily="monospace">
        {initials}
      </text>
    </svg>
  );
}

function OnboardingExperience({
  persona,
  setPersona,
  selectedLens,
  setSelectedLens,
  onStart
}: {
  persona: Persona;
  setPersona: (persona: Persona) => void;
  selectedLens: number;
  setSelectedLens: (index: number) => void;
  onStart: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "live" | "blocked" | "captured">("idle");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setCameraStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus("live");
    } catch {
      setCameraStatus("blocked");
    }
  }

  function capturePersona() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPersona({ ...persona, hasSelfie: true });
    setCameraStatus("captured");
  }

  return (
    <div className="onboarding-stage min-h-screen bg-[#120f0c] p-4 text-[#f8f2de]">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1500px] gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="onboarding-card flex flex-col justify-between p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f5d06f]">Happy Doom intake booth</p>
            <h1 className="mt-4 max-w-2xl text-5xl font-black leading-none sm:text-7xl">
              Make the person history happens to.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#d8c9ac]">
              Pick a lens, fill a tiny life, take a quick webcam-style scan, and the game turns you into a comic SVG before the first 2025 scenario begins.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {lenses.map((lens, index) => (
              <button
                key={lens.id}
                onClick={() => setSelectedLens(index)}
                className={`grid grid-cols-[64px_1fr] gap-3 border p-3 text-left transition ${
                  selectedLens === index ? "border-[#f5d06f] bg-[#f5d06f] text-black" : "border-[#6f5b42] bg-[#1f1812] text-[#f8f2de]"
                }`}
              >
                <Image src={lens.asset} alt="" width={64} height={64} className="border border-black/20 bg-black" />
                <span>
                  <span className="block text-lg font-black">{lens.name}</span>
                  <span className="mt-1 block text-sm leading-5 opacity-75">{lens.tagline}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-rows-[auto_1fr_auto]">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div className="onboarding-card p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c9b99c]">Persona</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold text-[#d8c9ac]">
                  Name
                  <input className="persona-input" value={persona.name} onChange={(event) => setPersona({ ...persona, name: event.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#d8c9ac]">
                  Age
                  <input
                    className="persona-input"
                    type="number"
                    min={18}
                    max={82}
                    value={persona.age}
                    onChange={(event) => setPersona({ ...persona, age: Number(event.target.value) || 29 })}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#d8c9ac]">
                  City
                  <input className="persona-input" value={persona.city} onChange={(event) => setPersona({ ...persona, city: event.target.value })} />
                </label>
                <label className="grid gap-1 text-sm font-bold text-[#d8c9ac]">
                  Job
                  <input className="persona-input" value={persona.job} onChange={(event) => setPersona({ ...persona, job: event.target.value })} />
                </label>
              </div>
              <label className="mt-3 grid gap-1 text-sm font-bold text-[#d8c9ac]">
                Human tell
                <input className="persona-input" value={persona.trait} onChange={(event) => setPersona({ ...persona, trait: event.target.value })} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {["amber", "cyan", "green", "rose"].map((palette) => (
                  <button
                    key={palette}
                    onClick={() => setPersona({ ...persona, palette })}
                    className={`h-9 w-9 border-2 ${persona.palette === palette ? "border-[#f8f2de]" : "border-[#6f5b42]"}`}
                    style={{ background: paletteSwatches[palette] }}
                    title={palette}
                  />
                ))}
              </div>
            </div>

            <div className="onboarding-card grid place-items-center overflow-hidden p-3">
              <PersonaAvatar persona={persona} />
            </div>
          </div>

          <div className="onboarding-card grid gap-4 p-5 md:grid-cols-[1fr_280px]">
            <div className="photo-booth relative min-h-[260px] overflow-hidden border border-[#6f5b42] bg-black">
              <video ref={videoRef} playsInline muted className={`absolute inset-0 h-full w-full object-cover ${cameraStatus === "live" ? "opacity-75" : "opacity-0"}`} />
              <div className="absolute inset-0 photo-scan" />
              <div className="absolute inset-5 grid place-items-center border border-[#f5d06f]/60">
                <div className="text-center">
                  <UserRound className="mx-auto mb-3 text-[#f5d06f]" size={54} />
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#f5d06f]">
                    {cameraStatus === "live" ? "Camera live" : cameraStatus === "captured" ? "SVG identity locked" : cameraStatus === "blocked" ? "Camera skipped" : "Selfie scan optional"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c9b99c]">Photoshoot</p>
                <h2 className="mt-2 text-3xl font-black leading-none">Your face becomes a symbol, not stored media.</h2>
                <p className="mt-3 text-sm leading-6 text-[#d8c9ac]">
                  MVP behavior: request webcam permission, let the player perform a scan, then generate a local SVG avatar style. No upload needed.
                </p>
              </div>
              <div className="grid gap-2">
                {cameraStatus === "idle" || cameraStatus === "blocked" ? (
                  <button className="onboarding-action" onClick={startCamera}>
                    {cameraStatus === "blocked" ? "Try camera again" : "Start selfie scan"}
                  </button>
                ) : null}
                {cameraStatus === "live" || cameraStatus === "starting" ? (
                  <button className="onboarding-action" onClick={capturePersona} disabled={cameraStatus === "starting"}>
                    {cameraStatus === "starting" ? "Opening camera" : "Capture SVG persona"}
                  </button>
                ) : null}
                <button className="onboarding-secondary" onClick={capturePersona}>
                  Use stylized avatar
                </button>
              </div>
            </div>
          </div>

          <button className="start-life-button" onClick={onStart}>
            Start 2025 as {persona.name || "this person"}
            <ChevronRight size={24} />
          </button>
        </section>
      </div>
    </div>
  );
}

function ComicScene({ scenario, persona, onChoose }: { scenario: Scenario; persona: Persona; onChoose: () => void }) {
  return (
    <div className="experience-comic grid min-h-[680px] gap-4 p-4 lg:grid-cols-[1fr_330px]">
      <section className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <div className="comic-panel relative min-h-[370px] overflow-hidden bg-[#f4d35e]">
          <div className="absolute left-5 top-5 z-10 rotate-[-2deg] border-4 border-black bg-white px-4 py-2 text-xl font-black uppercase tracking-wide text-black">
            {timeline[scenario.beatIndex].year}
          </div>
          <div className="comic-city" />
          <div className="comic-worker">
            <PersonaAvatar persona={persona} />
          </div>
          <div className="absolute bottom-5 left-5 right-5 border-4 border-black bg-white p-4 text-2xl font-black leading-tight text-black">
            {scenario.title}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="comic-panel bg-[#9bd1e5] p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/70">World Beat</p>
            <h2 className="mt-3 text-3xl font-black leading-none text-black">{timeline[scenario.beatIndex].title}</h2>
            <p className="mt-4 text-base font-semibold leading-6 text-black/75">{timeline[scenario.beatIndex].pressure}</p>
          </div>
          <div className="comic-panel halftone-panel bg-[#f7f1d1] p-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/70">Narration</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-black">{scenario.narration}</p>
          </div>
        </div>
      </section>

      <aside className="comic-panel flex flex-col bg-[#111827] p-4 text-white">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Indicator icon={HeartPulse} label="Life" value={scenario.health} />
          <Indicator icon={BadgeDollarSign} label="Money" value={scenario.money} />
          <Indicator icon={Thermometer} label="Heat" value={scenario.temperature} />
          <Indicator icon={Users} label="Trust" value={scenario.trust} />
        </div>
        <div className="mb-4 border-4 border-white bg-black p-3">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{scenario.location}</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-black">
            <Clock4 size={18} />
            {scenario.time}
          </p>
        </div>
        <div className="space-y-3">
          {scenario.choices.map((choice) => (
            <button
              key={choice.label}
              onClick={onChoose}
              className="group w-full border-4 border-white bg-[#f4d35e] p-3 text-left text-black shadow-[5px_5px_0_rgba(255,255,255,0.2)] transition hover:translate-x-1 hover:bg-[#fffb8f]"
            >
              <span className="flex items-center justify-between gap-3 text-lg font-black">
                {choice.label}
                <ChevronRight className="shrink-0 transition group-hover:translate-x-1" size={20} />
              </span>
              <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-black/65">
                {choice.cost} / {choice.effect}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function PixelScene({ scenario, persona, onChoose }: { scenario: Scenario; persona: Persona; onChoose: () => void }) {
  return (
    <div className="experience-pixel min-h-[680px] border border-[#233426] bg-[#1f2a22] p-3 text-[#dbe8c6] shadow-[0_0_0_3px_#0c120e_inset]">
      <div className="grid h-full gap-3 lg:grid-cols-[1fr_260px]">
        <section className="pixel-frame relative min-h-[520px] overflow-hidden">
          <div className="pixel-room">
            <div className="pixel-window" />
            <div className="pixel-desk" />
            <div className="pixel-screen one" />
            <div className="pixel-screen two" />
            <div className="pixel-person-avatar">
              <PersonaAvatar persona={persona} />
            </div>
          </div>
          <div className="absolute left-4 top-4 border border-[#b9d596] bg-[#243629] px-3 py-2 font-mono text-xs uppercase tracking-[0.18em]">
            {timeline[scenario.beatIndex].title}
            <span className="mt-1 block max-w-[260px] text-sm normal-case tracking-normal text-[#dbe8c6]">{scenario.title}</span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 border-2 border-[#9fb88a] bg-[#09120f]/95 p-4 font-mono shadow-[4px_4px_0_#000]">
            <p className="mb-2 text-sm uppercase tracking-[0.16em] text-[#93e072]">Narrator</p>
            <p className="text-lg leading-8">{scenario.narration}</p>
            <p className="mt-2 animate-pulse text-right text-2xl">&gt;&gt;</p>
          </div>
        </section>

        <aside className="grid gap-3">
          <div className="pixel-side-panel">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#92aa83]">Status</p>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between"><span>NAME</span><span>{persona.name}</span></div>
              <div className="flex items-center justify-between"><span>TIME</span><span>{scenario.time}</span></div>
              <div className="flex items-center justify-between"><span>HEAT</span><span>{scenario.temperature}%</span></div>
              <div className="flex items-center justify-between"><span>TRUST</span><span>{scenario.trust}%</span></div>
              <div className="flex items-center justify-between"><span>CASH</span><span>${scenario.money * 17}</span></div>
            </div>
          </div>
          <div className="grid gap-2">
            {scenario.choices.map((choice, index) => (
              <button key={choice.label} onClick={onChoose} className="pixel-choice">
                <span className="text-[#93e072]">0{index + 1}</span>
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
          <div className="pixel-side-panel">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#92aa83]">Mode</p>
            <p className="mt-2 text-sm leading-6">{scenario.pressure}. The screen should feel immediate, game-like, and cheap to produce with generated SVG layers.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CasefileScene({ scenario, persona, onChoose }: { scenario: Scenario; persona: Persona; onChoose: () => void }) {
  return (
    <div className="experience-casefile min-h-[680px] bg-[#e8e2d1] p-4 text-[#201b16]">
      <div className="grid gap-4 lg:grid-cols-[290px_1fr_330px]">
        <aside className="space-y-4">
          <div className="border border-[#201b16] bg-[#f8f2de] p-4 shadow-[4px_4px_0_#201b16]">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">Case File</p>
            <h2 className="mt-3 text-3xl font-black leading-none">{scenario.pressure}</h2>
            <p className="mt-3 text-sm font-bold">{persona.name}, {persona.age}. {persona.job}.</p>
            <p className="mt-4 text-sm leading-6">{timeline[scenario.beatIndex].world}</p>
          </div>
          {([
            ["Public trust", scenario.trust, Users],
            ["Personal stamina", scenario.health, BatteryMedium],
            ["Institutional heat", scenario.temperature, ShieldAlert],
            ["Cash cushion", scenario.money, BadgeDollarSign]
          ] satisfies [string, number, LucideIcon][]).map(([label, value, Icon]) => (
            <div key={label} className="border border-[#201b16] bg-white/70 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em]">
                <span className="flex items-center gap-2">
                  <Icon size={15} />
                  {label}
                </span>
                <span>{value}</span>
              </div>
              <div className="h-2 bg-[#201b16]/15">
                <div className="h-full bg-[#201b16]" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </aside>

        <section className="border border-[#201b16] bg-[#f8f2de] p-4 shadow-[6px_6px_0_#201b16]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#201b16] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">{scenario.location}</p>
              <h1 className="mt-2 text-4xl font-black leading-none">{scenario.title}</h1>
            </div>
            <div className="border border-[#201b16] px-3 py-2 text-sm font-black">
              {timeline[scenario.beatIndex].year} / {scenario.time}
            </div>
          </div>
          <div className="case-map relative min-h-[400px] overflow-hidden border border-[#201b16] bg-[#d8ceb6]">
            <div className="case-node node-a"><Building2 size={28} /> Employer</div>
            <div className="case-node node-b"><Brain size={28} /> Model</div>
            <div className="case-node node-c"><Users size={28} /> Family</div>
            <div className="case-node node-d"><MessageSquareWarning size={28} /> Media</div>
            <div className="case-node node-e"><Eye size={28} /> You</div>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 420" aria-hidden="true">
              <path d="M110 110 C210 80 250 130 320 115" stroke="#201b16" strokeWidth="3" fill="none" strokeDasharray="8 7" />
              <path d="M340 140 C430 180 430 260 490 300" stroke="#201b16" strokeWidth="3" fill="none" />
              <path d="M120 315 C210 260 270 280 355 225" stroke="#201b16" strokeWidth="3" fill="none" strokeDasharray="4 6" />
              <path d="M500 95 C430 120 410 170 360 205" stroke="#201b16" strokeWidth="3" fill="none" />
            </svg>
          </div>
          <p className="mt-4 border-l-4 border-[#c73e1d] bg-white/60 p-4 text-lg font-semibold leading-8">{scenario.narration}</p>
        </section>

        <aside className="border border-[#201b16] bg-[#f8f2de] p-4 shadow-[4px_4px_0_#201b16]">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Decision memo</p>
          <div className="mt-4 space-y-3">
            {scenario.choices.map((choice) => (
              <button key={choice.label} onClick={onChoose} className="w-full border border-[#201b16] bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:bg-[#fff8cf]">
                <span className="block text-lg font-black">{choice.label}</span>
                <span className="mt-2 block text-sm font-bold text-[#c73e1d]">{choice.cost}</span>
                <span className="mt-1 block text-sm">{choice.effect}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PhoneScene({ scenario, persona, onChoose }: { scenario: Scenario; persona: Persona; onChoose: () => void }) {
  return (
    <div className="experience-phone min-h-[680px] bg-[#15110d] p-4 text-[#f5eee3]">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-[#846c4f] bg-[#241b14] p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#c9b99c]">
              <CalendarDays size={15} />
              {timeline[scenario.beatIndex].year}, {scenario.time}
            </p>
            <h1 className="mt-5 text-5xl font-black leading-none text-[#f5d06f]">{scenario.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[#e8dcc9]">{scenario.narration}</p>
            <p className="mt-4 border-l-2 border-[#f5d06f] pl-3 text-sm font-bold text-[#f5d06f]">
              {persona.name}: {persona.trait}
            </p>
          </div>
          <div className="phone-shell mx-auto w-full max-w-[330px] rounded-[34px] border border-[#5c4b38] bg-[#0c0b0a] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="rounded-[26px] bg-[#ede7da] p-4 text-[#1d1813]">
              <div className="mb-4 flex items-center justify-between text-xs font-bold">
                <span>{scenario.time}</span>
                <span>42%</span>
              </div>
              <div className="space-y-3">
                <div className="max-w-[86%] rounded-2xl rounded-bl-sm bg-[#d2ecff] p-3 text-sm leading-5">
                  I need you to check something before Mom sees it.
                </div>
                <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[#dbf4c7] p-3 text-sm leading-5">
                  Is this real?
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-[#fff] p-3 text-sm leading-5 shadow">
                  That is the problem. It sounds like him because it was made from him.
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-[#1d1813]/15 bg-[#f7f3ea] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7a6c5b]">Calendar</p>
                <p className="mt-2 text-sm font-semibold">{scenario.location}</p>
                <p className="text-xs text-[#7a6c5b]">{scenario.pressure}</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-sm border border-[#846c4f] bg-[#211914] p-4">
          <div className="grid grid-cols-2 gap-3">
            <Indicator icon={HeartPulse} label="Body" value={scenario.health} />
            <Indicator icon={Thermometer} label="Heat" value={scenario.temperature} />
            <Indicator icon={Users} label="Trust" value={scenario.trust} />
            <Indicator icon={BadgeDollarSign} label="Rent" value={scenario.money} />
          </div>
          <div className="mt-5 space-y-3">
            {scenario.choices.map((choice) => (
              <button key={choice.label} onClick={onChoose} className="w-full rounded-sm border border-[#a58a63] bg-[#34271d] p-4 text-left transition hover:border-[#f5d06f] hover:bg-[#443224]">
                <span className="block text-lg font-bold text-[#f5d06f]">{choice.label}</span>
                <span className="mt-2 block text-sm leading-6 text-[#d5c5aa]">{choice.effect}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ExperienceLab() {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [prototypeId, setPrototypeId] = useState<PrototypeId>("pixel");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [lensIndex, setLensIndex] = useState(0);
  const [persona, setPersona] = useState<Persona>(defaultPersona);

  const prototype = useMemo(
    () => prototypes.find((item) => item.id === prototypeId) ?? prototypes[0],
    [prototypeId]
  );
  const scenario = experienceScenarios[scenarioIndex] ?? experienceScenarios[0];
  const lens = lenses[lensIndex];

  function advanceScenario() {
    setScenarioIndex((current) => (current + 1 >= experienceScenarios.length ? 0 : current + 1));
  }

  if (phase === "onboarding") {
    return (
      <OnboardingExperience
        persona={persona}
        setPersona={setPersona}
        selectedLens={lensIndex}
        setSelectedLens={setLensIndex}
        onStart={() => {
          setPrototypeId("pixel");
          setScenarioIndex(0);
          setPhase("playing");
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f0ece1] text-zinc-950">
      <section className="mx-auto w-full max-w-[1500px] px-4 py-5">
        <header className="mb-5 grid gap-4 border-b border-black/15 pb-5 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Happy Doom experience lab</p>
            <h1 className="mt-2 max-w-4xl text-4xl font-black leading-none sm:text-6xl">The first life is running.</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">
              {persona.name}, {persona.age}, {persona.city}. {persona.job}. Switch UX shells live, or click any choice to advance through the fixed 2025-2027 spine.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="border border-black/15 bg-black">
              <PersonaAvatar persona={persona} compact />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Lens</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lenses.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setLensIndex(index)}
                    className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] ${
                      lens.id === item.id ? "border-black bg-black text-white" : "border-black/20 bg-white text-black"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-2 sm:grid-cols-4">
            {prototypes.map((item) => (
              <button
                key={item.id}
                onClick={() => setPrototypeId(item.id)}
                className={`min-h-[112px] border p-3 text-left transition ${
                  prototype.id === item.id
                    ? "border-black bg-[#f4d35e] shadow-[4px_4px_0_#111]"
                    : "border-black/15 bg-white hover:border-black/40"
                }`}
              >
                <span className="block text-lg font-black">{item.name}</span>
                <span className="mt-2 block text-sm leading-5 text-zinc-600">{item.tagline}</span>
              </button>
            ))}
          </div>
          <div className="border border-black/15 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Scenario</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {experienceScenarios.map((item, index) => (
                <button
                  key={item.title}
                  onClick={() => setScenarioIndex(index)}
                  className={`border px-3 py-2 text-sm font-bold ${
                    scenarioIndex === index ? "border-black bg-black text-white" : "border-black/20 bg-white"
                  }`}
                >
                  {timeline[item.beatIndex].year}: {item.pressure}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{prototype.interaction}</p>
            <button className="mt-3 border border-black bg-white px-3 py-2 text-sm font-black" onClick={() => setPhase("onboarding")}>
              Rebuild persona
            </button>
          </div>
        </div>

        {prototype.id === "comic" ? <ComicScene scenario={scenario} persona={persona} onChoose={advanceScenario} /> : null}
        {prototype.id === "pixel" ? <PixelScene scenario={scenario} persona={persona} onChoose={advanceScenario} /> : null}
        {prototype.id === "casefile" ? <CasefileScene scenario={scenario} persona={persona} onChoose={advanceScenario} /> : null}
        {prototype.id === "phone" ? <PhoneScene scenario={scenario} persona={persona} onChoose={advanceScenario} /> : null}
      </section>
    </main>
  );
}
