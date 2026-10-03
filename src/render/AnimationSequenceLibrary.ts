export type AnimationSequenceKind =
  | 'idle'
  | 'walk'
  | 'walk-back'
  | 'dash'
  | 'jump'
  | 'landing'
  | 'stand-light'
  | 'stand-heavy'
  | 'hit'
  | 'guard'
  | 'parry'
  | 'hadoken'
  | 'shoryuken'
  | 'tatsumaki'
  | 'super-rush';

export type AnimationTimingCurve = 'linear' | 'ease-in' | 'ease-out' | 'snap' | 'hold';

export interface AnimationFrameEvent {
  frame: number;
  type: 'whoosh' | 'contact' | 'projectile' | 'trail' | 'recovery';
  label?: string;
}

export interface AnimationSequencePhase {
  startupEnd?: number;
  activeStart?: number;
  activeEnd?: number;
  recoveryStart?: number;
}

export interface AnimationSequence {
  id: string;
  characterId: string;
  kind: AnimationSequenceKind;
  asset: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  loop: boolean;
  timing: AnimationTimingCurve;
  footLock?: boolean;
  phase?: AnimationSequencePhase;
  events?: readonly AnimationFrameEvent[];
  enabled: boolean;
  renderMode: 'full' | 'bridge';
  poseAuthored: boolean;
  quality: 'hq';
  source: 'approved-hq-pilot' | 'authored-hq';
}

const RYU: readonly AnimationSequence[] = [
  { id:'RYU_IDLE_HQ', characterId:'RYU', kind:'idle', asset:'/art/animation-hq/ryu/idle.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:8.0, loop:true, timing:'ease-in', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'RYU_WALK_HQ', characterId:'RYU', kind:'walk', asset:'/art/animation-hq/ryu/walk.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:12, loop:true, timing:'linear', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'RYU_WALK_BACK_HQ', characterId:'RYU', kind:'walk-back', asset:'/art/animation-hq/ryu/walk-back.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:10, loop:true, timing:'linear', footLock:true, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'RYU_DASH_HQ', characterId:'RYU', kind:'dash', asset:'/art/animation-hq/ryu/dash.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'RYU_JUMP_HQ', characterId:'RYU', kind:'jump', asset:'/art/animation-hq/ryu/jump.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:14, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'RYU_LANDING_HQ', characterId:'RYU', kind:'landing', asset:'/art/animation-hq/ryu/landing.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  // Attack strips are runtime bridge assets: HQ startup/recovery only. Active/contact remains articulated until pose-authored HQ art passes QA.
  { id:'RYU_STAND_LIGHT_HQ', characterId:'RYU', kind:'stand-light', asset:'/art/animation-hq/ryu/stand-light.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:24, loop:false, timing:'snap', phase:{startupEnd:2,activeStart:3,activeEnd:3,recoveryStart:5}, events:[{frame:3,type:'contact'}], enabled:false, renderMode:'bridge', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'RYU_STAND_HEAVY_HQ', characterId:'RYU', kind:'stand-heavy', asset:'/art/animation-hq/ryu/stand-heavy.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:24, loop:false, timing:'snap', phase:{startupEnd:3,activeStart:4,activeEnd:5,recoveryStart:7}, events:[{frame:4,type:'whoosh'},{frame:5,type:'contact'}], enabled:false, renderMode:'bridge', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'RYU_HIT_HQ', characterId:'RYU', kind:'hit', asset:'/art/animation-hq/ryu/hit.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:false, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'RYU_HADOKEN_HQ', characterId:'RYU', kind:'hadoken', asset:'/art/animation-hq/ryu/hadoken.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:24, loop:false, timing:'snap', phase:{startupEnd:5,activeStart:6,activeEnd:7,recoveryStart:8}, events:[{frame:4,type:'whoosh',label:'charge'},{frame:6,type:'projectile'},{frame:7,type:'contact'},{frame:8,type:'trail'},{frame:10,type:'recovery'}], enabled:false, renderMode:'bridge', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'RYU_SHORYUKEN_HQ', characterId:'RYU', kind:'shoryuken', asset:'/art/animation-hq/ryu/shoryuken.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:24, loop:false, timing:'snap', phase:{startupEnd:4,activeStart:5,activeEnd:7,recoveryStart:8}, events:[{frame:5,type:'contact'},{frame:7,type:'trail'},{frame:10,type:'recovery'}], enabled:false, renderMode:'bridge', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
] as const;

const KEN: readonly AnimationSequence[] = [
  { id:'KEN_IDLE_HQ', characterId:'KEN', kind:'idle', asset:'/art/animation-hq/ken/idle.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:8.2, loop:true, timing:'ease-in', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_WALK_HQ', characterId:'KEN', kind:'walk', asset:'/art/animation-hq/ken/walk.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:13.2, loop:true, timing:'linear', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_WALK_BACK_HQ', characterId:'KEN', kind:'walk-back', asset:'/art/animation-hq/ken/walk-back.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:11.2, loop:true, timing:'linear', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_DASH_HQ', characterId:'KEN', kind:'dash', asset:'/art/animation-hq/ken/dash.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:20, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_JUMP_HQ', characterId:'KEN', kind:'jump', asset:'/art/animation-hq/ken/jump.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:13, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_LANDING_HQ', characterId:'KEN', kind:'landing', asset:'/art/animation-hq/ken/landing.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:19, loop:false, timing:'ease-out', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_HIT_HQ', characterId:'KEN', kind:'hit', asset:'/art/animation-hq/ken/hit.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:19, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_GUARD_HQ', characterId:'KEN', kind:'guard', asset:'/art/animation-hq/ken/guard.webp', frameCount:5, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_PARRY_HQ', characterId:'KEN', kind:'parry', asset:'/art/animation-hq/ken/parry.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:22, loop:false, timing:'snap', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  // RC39+ attack slots stay gated until individually authored strips pass pose-variance QA.
  { id:'KEN_STAND_LIGHT_HQ', characterId:'KEN', kind:'stand-light', asset:'/art/animation-hq/ken/stand-light.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:26, loop:false, timing:'snap', phase:{startupEnd:2,activeStart:3,activeEnd:3,recoveryStart:5}, events:[{frame:3,type:'contact'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_STAND_HEAVY_HQ', characterId:'KEN', kind:'stand-heavy', asset:'/art/animation-hq/ken/stand-heavy.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:27, loop:false, timing:'snap', phase:{startupEnd:3,activeStart:4,activeEnd:5,recoveryStart:7}, events:[{frame:4,type:'whoosh'},{frame:5,type:'contact'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_HADOKEN_HQ', characterId:'KEN', kind:'hadoken', asset:'/art/animation-hq/ken/hadoken.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:26, loop:false, timing:'snap', phase:{startupEnd:4,activeStart:5,activeEnd:6,recoveryStart:7}, events:[{frame:3,type:'whoosh',label:'charge'},{frame:5,type:'projectile'},{frame:6,type:'trail'},{frame:9,type:'recovery'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_SHORYUKEN_HQ', characterId:'KEN', kind:'shoryuken', asset:'/art/animation-hq/ken/shoryuken.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:28, loop:false, timing:'snap', phase:{startupEnd:3,activeStart:4,activeEnd:7,recoveryStart:8}, events:[{frame:4,type:'contact'},{frame:6,type:'trail'},{frame:10,type:'recovery'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_TATSUMAKI_HQ', characterId:'KEN', kind:'tatsumaki', asset:'/art/animation-hq/ken/tatsumaki.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:30, loop:false, timing:'snap', phase:{startupEnd:2,activeStart:3,activeEnd:8,recoveryStart:9}, events:[{frame:3,type:'whoosh'},{frame:4,type:'contact'},{frame:6,type:'contact'},{frame:8,type:'contact'},{frame:10,type:'recovery'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'KEN_SUPER_RUSH_HQ', characterId:'KEN', kind:'super-rush', asset:'/art/animation-hq/ken/super-rush.webp', frameCount:16, frameWidth:384, frameHeight:448, fps:32, loop:false, timing:'snap', phase:{startupEnd:2,activeStart:3,activeEnd:12,recoveryStart:13}, events:[{frame:3,type:'contact'},{frame:5,type:'contact'},{frame:7,type:'contact'},{frame:9,type:'contact'},{frame:11,type:'contact'},{frame:12,type:'trail'},{frame:14,type:'recovery'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
] as const;

const CHUNLI: readonly AnimationSequence[] = [
  { id:'CHUNLI_STAND_HEAVY_HQ', characterId:'CHUNLI', kind:'stand-heavy', asset:'/art/animation-hq/chunli/stand-heavy.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:27, loop:false, timing:'snap', phase:{startupEnd:3,activeStart:4,activeEnd:5,recoveryStart:6}, events:[{frame:4,type:'whoosh'},{frame:5,type:'contact'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_STAND_LIGHT_HQ', characterId:'CHUNLI', kind:'stand-light', asset:'/art/animation-hq/chunli/stand-light.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:26, loop:false, timing:'snap', phase:{startupEnd:2,activeStart:3,activeEnd:3,recoveryStart:4}, events:[{frame:3,type:'contact'}], enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_IDLE_HQ', characterId:'CHUNLI', kind:'idle', asset:'/art/animation-hq/chunli/idle.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:8.0, loop:true, timing:'ease-in', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_WALK_HQ', characterId:'CHUNLI', kind:'walk', asset:'/art/animation-hq/chunli/walk.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:13.8, loop:true, timing:'linear', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_WALK_BACK_HQ', characterId:'CHUNLI', kind:'walk-back', asset:'/art/animation-hq/chunli/walk-back.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:11.8, loop:true, timing:'linear', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_DASH_HQ', characterId:'CHUNLI', kind:'dash', asset:'/art/animation-hq/chunli/dash.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:19, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_JUMP_HQ', characterId:'CHUNLI', kind:'jump', asset:'/art/animation-hq/chunli/jump.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:13.5, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_LANDING_HQ', characterId:'CHUNLI', kind:'landing', asset:'/art/animation-hq/chunli/landing.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:19, loop:false, timing:'ease-out', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
  { id:'CHUNLI_HIT_HQ', characterId:'CHUNLI', kind:'hit', asset:'/art/animation-hq/chunli/hit.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:19, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },
] as const;

const IBUKI: readonly AnimationSequence[] = [
  { id:'IBUKI_IDLE_HQ', characterId:'IBUKI', kind:'idle', asset:'/art/animation-hq/ibuki/idle.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:8.8, loop:true, timing:'ease-in', footLock:true, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'IBUKI_WALK_HQ', characterId:'IBUKI', kind:'walk', asset:'/art/animation-hq/ibuki/walk.webp', frameCount:12, frameWidth:384, frameHeight:448, fps:14.6, loop:true, timing:'linear', footLock:true, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'IBUKI_WALK_BACK_HQ', characterId:'IBUKI', kind:'walk-back', asset:'/art/animation-hq/ibuki/walk-back.webp', frameCount:10, frameWidth:384, frameHeight:448, fps:12.4, loop:true, timing:'linear', footLock:true, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'IBUKI_DASH_HQ', characterId:'IBUKI', kind:'dash', asset:'/art/animation-hq/ibuki/dash.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:21, loop:false, timing:'ease-out', footLock:false, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'IBUKI_JUMP_HQ', characterId:'IBUKI', kind:'jump', asset:'/art/animation-hq/ibuki/jump.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:14.8, loop:false, timing:'ease-out', footLock:false, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'IBUKI_LANDING_HQ', characterId:'IBUKI', kind:'landing', asset:'/art/animation-hq/ibuki/landing.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:20, loop:false, timing:'ease-out', footLock:true, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
  { id:'IBUKI_HIT_HQ', characterId:'IBUKI', kind:'hit', asset:'/art/animation-hq/ibuki/hit.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:20, loop:false, timing:'ease-out', footLock:false, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },
] as const;

const ALL: readonly AnimationSequence[] = [...RYU, ...KEN, ...CHUNLI, ...IBUKI];
const BY_ID = new Map(ALL.map((sequence) => [sequence.id, sequence]));

export function animationSequenceById(id: string): AnimationSequence | null {
  return BY_ID.get(id) ?? null;
}

export function animationSequencesFor(characterId: string, enabledOnly = true): readonly AnimationSequence[] {
  return ALL.filter((sequence) => sequence.characterId === characterId && (!enabledOnly || sequence.enabled));
}

export function animationSequenceFor(characterId: string, kind: AnimationSequenceKind, enabledOnly = true): AnimationSequence | null {
  return ALL.find((sequence) => sequence.characterId === characterId && sequence.kind === kind && (!enabledOnly || sequence.enabled)) ?? null;
}

export function animationSequenceFrameTotal(characterId: string): number {
  return animationSequencesFor(characterId, false).reduce((total, sequence) => total + sequence.frameCount, 0);
}

export function enabledAnimationSequenceFrameTotal(characterId: string): number {
  return animationSequencesFor(characterId, true).reduce((total, sequence) => total + sequence.frameCount, 0);
}

export const RYU_RC36_TARGET_FRAME_TOTAL = 100;
export const KEN_RC36_MOVEMENT_FRAME_TOTAL = 57;
export const KEN_RC39_ATTACK_FRAME_TOTAL = 69;
export const KEN_RC39_DEFENSE_FRAME_TOTAL = 11;
export const KEN_RC39_TARGET_FRAME_TOTAL = KEN_RC36_MOVEMENT_FRAME_TOTAL + KEN_RC39_DEFENSE_FRAME_TOTAL + KEN_RC39_ATTACK_FRAME_TOTAL;
export const CHUNLI_RC36_MOVEMENT_FRAME_TOTAL = 57;
export const IBUKI_RC36_MOVEMENT_FRAME_TOTAL = 57;
