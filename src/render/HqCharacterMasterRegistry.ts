/** User-approved high-resolution original character masters for RC34. */
export const HQ_PILOT_CHARACTER_IDS = Object.freeze(['RYU','CHUNLI','KEN','IBUKI'] as const);
export type HqPilotCharacterId = typeof HQ_PILOT_CHARACTER_IDS[number];
export const APPROVED_HQ_CHARACTER_IDS = Object.freeze(['RYU', 'CHUNLI', 'KEN', 'IBUKI'] as const);
const APPROVED = new Set<string>(APPROVED_HQ_CHARACTER_IDS as readonly string[]);
export function hqMasterApproved(characterId: string): boolean { return APPROVED.has(characterId); }
