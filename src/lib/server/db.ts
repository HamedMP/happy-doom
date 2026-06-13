import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { applyDelta, initialState, rollCharacter } from "@/lib/game/characters";
import { getLens } from "@/lib/game/lenses";
import { timeline } from "@/lib/game/timeline";
import type {
  Character,
  CharacterId,
  CharacterState,
  ChoiceHistoryItem,
  LensId,
  LifeSummary,
  NarratedEvent,
  StoredEvent
} from "@/lib/game/types";

type LifeRow = {
  id: string;
  lens: LensId;
  character_json: string;
  state_json: string;
  beat_index: number;
  status: "living" | "complete";
};

type EventRow = {
  id: string;
  life_id: string;
  beat_index: number;
  kind: "event" | "epilogue";
  title: string;
  narration: string;
  choices_json: string;
  state_changes_json: string;
  callback_hint: string;
  selected_choice_id: string | null;
  feedback: "up" | "down" | null;
};

let db: Database.Database | null = null;

function getDbPath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "happy-doom.sqlite");
  }

  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "happy-doom.sqlite");
}

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS lives (
        id TEXT PRIMARY KEY,
        lens TEXT NOT NULL,
        character_json TEXT NOT NULL,
        state_json TEXT NOT NULL,
        beat_index INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'living',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        life_id TEXT NOT NULL,
        beat_index INTEGER NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        narration TEXT NOT NULL,
        choices_json TEXT NOT NULL,
        state_changes_json TEXT NOT NULL,
        callback_hint TEXT NOT NULL,
        selected_choice_id TEXT,
        feedback TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (life_id) REFERENCES lives(id)
      );

      CREATE INDEX IF NOT EXISTS idx_events_life_beat ON events(life_id, beat_index);
    `);
  }

  return db;
}

function parseLife(row: LifeRow): LifeSummary {
  return {
    lifeId: row.id,
    lens: getLens(row.lens),
    character: JSON.parse(row.character_json) as Character,
    state: JSON.parse(row.state_json) as CharacterState,
    beatIndex: row.beat_index,
    status: row.status
  };
}

function parseEvent(row: EventRow): StoredEvent {
  return {
    id: row.id,
    beatIndex: row.beat_index,
    kind: row.kind,
    title: row.title,
    narration: row.narration,
    choices: JSON.parse(row.choices_json),
    stateChanges: JSON.parse(row.state_changes_json),
    callbackHint: row.callback_hint,
    selectedChoiceId: row.selected_choice_id,
    feedback: row.feedback
  };
}

export function createLife(lens: LensId, characterOverride?: Partial<Character>, characterId?: CharacterId) {
  const lifeId = crypto.randomUUID();
  const base = rollCharacter(characterId);
  const character = characterOverride
    ? { ...base, ...characterOverride, avatar: characterOverride.avatar ?? base.avatar }
    : base;

  getDb()
    .prepare(
      `INSERT INTO lives (id, lens, character_json, state_json, beat_index, status)
       VALUES (?, ?, ?, ?, 0, 'living')`
    )
    .run(lifeId, lens, JSON.stringify(character), JSON.stringify(initialState));

  return getLife(lifeId);
}

export function getLife(lifeId: string) {
  const row = getDb().prepare("SELECT * FROM lives WHERE id = ?").get(lifeId) as LifeRow | undefined;
  return row ? parseLife(row) : null;
}

export function getEvents(lifeId: string) {
  const rows = getDb()
    .prepare("SELECT * FROM events WHERE life_id = ? ORDER BY beat_index ASC, created_at ASC")
    .all(lifeId) as EventRow[];
  return rows.map(parseEvent);
}

export function getOpenEvent(lifeId: string) {
  const row = getDb()
    .prepare(
      "SELECT * FROM events WHERE life_id = ? AND kind = 'event' AND selected_choice_id IS NULL ORDER BY beat_index DESC LIMIT 1"
    )
    .get(lifeId) as EventRow | undefined;
  return row ? parseEvent(row) : null;
}

export function storeEvent(lifeId: string, beatIndex: number, kind: "event" | "epilogue", event: NarratedEvent) {
  const eventId = crypto.randomUUID();

  getDb()
    .prepare(
      `INSERT INTO events (
        id, life_id, beat_index, kind, title, narration, choices_json,
        state_changes_json, callback_hint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      eventId,
      lifeId,
      beatIndex,
      kind,
      event.title,
      event.narration,
      JSON.stringify(event.choices),
      JSON.stringify(event.stateChanges),
      event.callbackHint
    );

  return getEvent(eventId);
}

export function getEvent(eventId: string) {
  const row = getDb().prepare("SELECT * FROM events WHERE id = ?").get(eventId) as EventRow | undefined;
  return row ? parseEvent(row) : null;
}

export function applyChoice(lifeId: string, selectedChoiceId: string) {
  const life = getLife(lifeId);
  const openEvent = getOpenEvent(lifeId);

  if (!life || !openEvent) {
    return null;
  }

  const choice = openEvent.choices.find((item) => item.id === selectedChoiceId);
  if (!choice) {
    return life;
  }

  const nextState = applyDelta(applyDelta(life.state, openEvent.stateChanges), choice.stateDelta);
  const nextBeatIndex = Math.min(life.beatIndex + 1, timeline.length);
  const status = nextBeatIndex >= timeline.length ? "complete" : "living";

  getDb().prepare("UPDATE events SET selected_choice_id = ? WHERE id = ?").run(selectedChoiceId, openEvent.id);
  getDb()
    .prepare("UPDATE lives SET state_json = ?, beat_index = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(JSON.stringify(nextState), nextBeatIndex, status, lifeId);

  return getLife(lifeId);
}

export function setFeedback(lifeId: string, eventId: string, rating: "up" | "down") {
  getDb().prepare("UPDATE events SET feedback = ? WHERE id = ? AND life_id = ?").run(rating, eventId, lifeId);
  return getEvent(eventId);
}

export function getChoiceHistory(lifeId: string): ChoiceHistoryItem[] {
  return getEvents(lifeId)
    .filter((event) => event.kind === "event" && event.selectedChoiceId)
    .map((event) => {
      const beat = timeline[event.beatIndex];
      const selected = event.choices.find((choice) => choice.id === event.selectedChoiceId);

      return {
        beatIndex: event.beatIndex,
        beatTitle: beat?.title ?? "Unknown beat",
        eventTitle: event.title,
        selectedChoiceId: event.selectedChoiceId ?? "",
        selectedLabel: selected?.label ?? "Unknown choice",
        feedback: event.feedback
      };
    });
}

export function getFeedbackHints(lifeId: string) {
  return getEvents(lifeId)
    .filter((event) => event.feedback)
    .map((event) => ({
      title: event.title,
      callbackHint: event.callbackHint,
      feedback: event.feedback ?? null
    }));
}
