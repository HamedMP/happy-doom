import type { Character, CharacterId, CharacterState } from "./types";

export const characters: Character[] = [
  {
    id: "mara-chen",
    name: "Mara Chen",
    age: 26,
    city: "London",
    job: "junior software engineer",
    avatar: "/assets/characters/mara-chen.png",
    summary: "Keeps headphones close and feelings closer. Good with broken tools, worse with uncertainty."
  },
  {
    id: "lena-ortiz",
    name: "Lena Ortiz",
    age: 29,
    city: "Oakland",
    job: "freelance documentarian",
    avatar: "/assets/characters/lena-ortiz.png",
    summary: "Photographs what people miss. Pays rent by noticing details the platforms flatten."
  },
  {
    id: "noah-park",
    name: "Noah Park",
    age: 34,
    city: "Toronto",
    job: "operations analyst",
    avatar: "/assets/characters/noah-park.png",
    summary: "Carries the umbrella and the bad forecast. Reliable, tired, harder to optimize than he looks."
  }
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function getCharacter(id: string) {
  return characters.find((character) => character.id === id) ?? characters[0];
}

export function rollCharacter(characterId?: CharacterId): Character {
  const character = characterId ? getCharacter(characterId) : pick(characters);
  return { ...character };
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
