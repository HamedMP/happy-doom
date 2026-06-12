export type LensId = "severance" | "matrix" | "westworld";

export type Character = {
  name: string;
  age: number;
  city: string;
  job: string;
  avatar: string;
  trait?: string;
  palette?: string;
};

export type CharacterState = {
  career: number;
  relationships: number;
  money: number;
  beliefs: number;
};

export type TimelineBeat = {
  id: string;
  year: number;
  title: string;
  world: string;
  pressure: string;
  asset: string;
};

export type Lens = {
  id: LensId;
  name: string;
  tagline: string;
  tone: string;
  themeClass: string;
  asset: string;
};

export type Choice = {
  id: string;
  label: string;
  detail: string;
  stateDelta: Partial<CharacterState>;
};

export type NarratedEvent = {
  title: string;
  narration: string;
  choices: Choice[];
  stateChanges: Partial<CharacterState>;
  callbackHint: string;
};

export type LifeSummary = {
  lifeId: string;
  lens: Lens;
  character: Character;
  state: CharacterState;
  beatIndex: number;
  status: "living" | "complete";
};

export type StoredEvent = NarratedEvent & {
  id: string;
  beatIndex: number;
  kind: "event" | "epilogue";
  selectedChoiceId?: string | null;
  feedback?: "up" | "down" | null;
};

export type ChoiceHistoryItem = {
  beatIndex: number;
  beatTitle: string;
  eventTitle: string;
  selectedChoiceId: string;
  selectedLabel: string;
  feedback?: "up" | "down" | null;
};
