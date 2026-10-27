import { z } from 'zod';
import { ROLES } from './constants.js';

// Zod schema for player role assignment
export const playerRoleSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string(),
  characterName: z.string().optional().default('Suspect'),
  role: z.enum([ROLES.KILLER, ROLES.DETECTIVE, ROLES.WITNESS, ROLES.SUSPECT]),
  publicBio: z.string().optional().default('Present near the scene.'),
  secretInfo: z.string().optional().default('Await your briefing.'),
  suspicionHook: z.string().optional(),
  alibi: z.string().optional(),
});

// Zod schema for the complete mystery scenario
export const scenarioSchema = z.object({
  title: z.string(),
  setting: z.string(),
  victim: z.string(),
  intro: z.string(),
  killerName: z.string(),
  weapon: z.string(),
  motive: z.string(),
  solution: z.string(),
  playerRoles: z.array(playerRoleSchema),
  initialClue: z
    .object({
      title: z.string(),
      content: z.string(),
    })
    .optional(),
  redHerrings: z.array(z.string()).optional(),
});

// Zod schema for round clues
export const clueSchema = z.object({
  title: z.string(),
  content: z.string(),
  narratorComment: z.string(),
});

// Zod schema for accusation narrator response
export const accusationResponseSchema = z.object({
  narratorReaction: z.string(),
});

// Zod schema for dramatic reveal and closing monologue
export const revealSchema = z.object({
  narratorMonologue: z.string(),
  verdictSummary: z.string(),
});


