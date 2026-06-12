import type { Character, CharacterState } from "./types";

const names = ["Mara Chen", "Iris Vale", "Samir Cole", "June Hart", "Noah Park", "Lena Ortiz"];
const cities = ["Oakland", "London", "Austin", "Toronto", "Berlin", "Singapore"];
const jobs = [
  "operations analyst",
  "junior software engineer",
  "school counselor",
  "product marketer",
  "hospital scheduler",
  "freelance designer"
];
const avatars = ["/assets/avatars/avatar-01.svg", "/assets/avatars/avatar-02.svg", "/assets/avatars/avatar-03.svg"];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollCharacter(): Character {
  return {
    name: pick(names),
    age: 23 + Math.floor(Math.random() * 27),
    city: pick(cities),
    job: pick(jobs),
    avatar: pick(avatars)
  };
}

export const initialState: CharacterState = {
  career: 50,
  relationships: 50,
  money: 50,
  beliefs: 50
};

export function clampState(state: CharacterState): CharacterState {
  return {
    career: Math.max(0, Math.min(100, Math.round(state.career))),
    relationships: Math.max(0, Math.min(100, Math.round(state.relationships))),
    money: Math.max(0, Math.min(100, Math.round(state.money))),
    beliefs: Math.max(0, Math.min(100, Math.round(state.beliefs)))
  };
}

export function applyDelta(state: CharacterState, delta: Partial<CharacterState>): CharacterState {
  return clampState({
    career: state.career + (delta.career ?? 0),
    relationships: state.relationships + (delta.relationships ?? 0),
    money: state.money + (delta.money ?? 0),
    beliefs: state.beliefs + (delta.beliefs ?? 0)
  });
}
