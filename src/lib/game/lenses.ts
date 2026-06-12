import type { Lens } from "./types";

export const lenses: Lens[] = [
  {
    id: "severance",
    name: "Severance",
    tagline: "Corporate dystopia, split selves, work as a second life.",
    tone:
      "Clinical, restrained, and uncanny. Focus on identity, employer knowledge, home-self versus work-self, and the dread of being measured.",
    themeClass: "theme-severance",
    asset: "/assets/lenses/severance.svg"
  },
  {
    id: "matrix",
    name: "Matrix",
    tagline: "Epistemic paranoia, synthetic intimacy, reality under audit.",
    tone:
      "Electric, suspicious, and reality-bent. Focus on synthetic media, persuasion, simulation, false memory, and the cost of knowing.",
    themeClass: "theme-matrix",
    asset: "/assets/lenses/matrix.svg"
  },
  {
    id: "westworld",
    name: "Westworld",
    tagline: "Loops, awakening, routines that start to remember you.",
    tone:
      "Dusty, elegant, recursive, and haunted. Focus on scripted routines, deja vu, agency, and the fear that choice itself was authored.",
    themeClass: "theme-westworld",
    asset: "/assets/lenses/westworld.svg"
  }
];

export function getLens(id: string): Lens {
  return lenses.find((lens) => lens.id === id) ?? lenses[0];
}
