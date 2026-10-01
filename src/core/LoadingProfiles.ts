import type { AssetGroupName } from './AssetManager.js';

export type LoadingProfile = { kicker: string; title: string; detail: string; accent: string; route: string };

const PROFILES: Record<AssetGroupName, LoadingProfile> = {
  'app-shell': { kicker: 'SYSTEM', title: 'PREPARING GAME', detail: 'COMBAT CORE • SAVE • INPUT', accent: '#f0ba45', route: 'BOOT → TITLE' },
  'character-hd': { kicker: 'VISUAL', title: 'HD CHARACTER PACK', detail: '2× HYBRID REMASTER • PREMULTIPLIED ALPHA', accent: '#7fdfff', route: 'LITE → HD TEXTURES' },
  'character-hq': { kicker: 'VISUAL', title: 'HQ CHARACTER + HIGH-FRAME', detail: '384×448 HQ • MULTI-FRAME PILOT • HQ → HD → LITE', accent: '#a8f1ff', route: 'HQ PILOT → HIGH-FRAME → COMBAT' },
  'stage-1': { kicker: 'STAGE 01', title: 'NEW YORK — DOWNTOWN', detail: 'STREET FIGHTERS • AFTERNOON → SUNSET', accent: '#e8b656', route: 'BELT ACTION → ELITE DUEL' },
  'stage-2': { kicker: 'STAGE 02', title: 'HONG KONG — NIGHT MARKET', detail: 'NEON • MARKET RUSH • YUN DUEL', accent: '#54d9ff', route: 'MARKET RUSH → SPEED DUEL' },
  'stage-3': { kicker: 'STAGE 03', title: 'JAPAN — KARATE DISTRICT', detail: 'PARRY • COUNTER • DOJO ELITES', accent: '#f2c47e', route: 'SPACING → COUNTER DUEL' },
  'stage-4': { kicker: 'STAGE 04', title: 'LONDON — FIGHT CLUB', detail: 'RAIN • BOXING • UNDERGROUND', accent: '#a9d9ef', route: 'ELITE RUSH → FIGHT CLUB DUEL' },
  'stage-5': { kicker: 'STAGE 05', title: 'SECRET SOCIETY FACILITY', detail: 'URIEN • GILL • FINAL APPROACH', accent: '#d7bd68', route: 'BELT → URIEN → GILL FINAL' },
  'ending': { kicker: 'EPILOGUE', title: 'SEALING THE INCIDENT', detail: 'CAMPAIGN RECORD • CHARACTER ENDING', accent: '#efe2b4', route: 'FINAL RECORD → CHARACTER EPILOGUE' },
};

export function loadingProfile(group: AssetGroupName): LoadingProfile { return PROFILES[group]; }
