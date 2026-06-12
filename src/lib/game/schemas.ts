import { z } from "zod";

export const lensIdSchema = z.enum(["severance", "matrix", "westworld"]);
export const characterIdSchema = z.enum(["mara-chen", "lena-ortiz", "noah-park"]);

export const characterStateSchema = z.object({
  career: z.number().min(0).max(100),
  relationships: z.number().min(0).max(100),
  money: z.number().min(0).max(100),
  beliefs: z.number().min(0).max(100)
});

export const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  detail: z.string().min(1).max(180),
  stateDelta: characterStateSchema.partial()
});

export const narratedEventSchema = z.object({
  title: z.string().min(1).max(90),
  narration: z.string().min(120).max(1400),
  choices: z.array(choiceSchema).min(2).max(3),
  stateChanges: characterStateSchema.partial(),
  callbackHint: z.string().min(1).max(160)
});

export const startLifeSchema = z.object({
  lens: lensIdSchema,
  characterId: characterIdSchema.optional()
});

export const eventRequestSchema = z.object({
  selectedChoiceId: z.string().optional()
});

export const feedbackRequestSchema = z.object({
  eventId: z.string(),
  rating: z.enum(["up", "down"])
});
