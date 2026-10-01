export interface ThrowJointPose {
  frontArmUpper: number;
  frontArmFore: number;
  rearArmUpper: number;
  rearArmFore: number;
  frontLegUpper: number;
  frontKnee: number;
  rearLegUpper: number;
  rearKnee: number;
  handOpen: number;
  torsoTwist: number;
}

interface ThrowJointStyle {
  attacker: readonly [number, number, number, number, number, number, number, number, number, number];
  victim: readonly [number, number, number, number, number, number, number, number, number, number];
  liftBias: number;
  releaseSnap: number;
}

const STYLES: Readonly<Record<string, ThrowJointStyle>> = {
  RYU:    { attacker: [-.35,-.15, .48,.72,-22,42,18,-38,.85,.18], victim: [.55,1.05,-.7,-1.15,-38,18,32,-26,.2,.34], liftBias:.55, releaseSnap:.72 },
  KEN:    { attacker: [-.52,-.24, .62,.96,-34,48,28,-46,.9,.25], victim: [.72,1.18,-.82,-1.26,-44,14,38,-20,.18,.42], liftBias:.65, releaseSnap:.84 },
  CHUNLI: { attacker: [-.22, .08, .86,1.2,-46,54,44,-58,.72,.12], victim: [.88,1.36,-.94,-1.42,-54,8,48,-12,.16,.5], liftBias:.78, releaseSnap:.92 },
  ALEX:   { attacker: [-.72,-.48, .72,.48,-18,62,18,-62,1.0,.36], victim: [.44,.92,-.52,-.96,-30,26,30,-26,.12,.28], liftBias:1, releaseSnap:.58 },
  DUDLEY: { attacker: [-.18,-.05, .35,.58,-12,36,12,-36,.68,.08], victim: [.42,.74,-.45,-.8,-24,22,24,-22,.22,.18], liftBias:.42, releaseSnap:.48 },
  MAKOTO: { attacker: [-.46,-.18, .58,.82,-26,46,30,-42,.8,.3], victim: [.66,1.08,-.72,-1.16,-42,16,36,-18,.16,.4], liftBias:.62, releaseSnap:.76 },
  IBUKI:  { attacker: [-.78,-.28, .96,1.32,-56,36,52,-34,.64,.38], victim: [1.02,1.48,-1.08,-1.52,-62,4,58,-8,.12,.62], liftBias:.88, releaseSnap:1.08 },
  YUN:    { attacker: [-.64,-.18, .82,1.16,-48,42,48,-40,.7,.34], victim: [.94,1.38,-.98,-1.44,-58,8,54,-10,.14,.56], liftBias:.82, releaseSnap:1.0 },
};

const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(t:number)=>t*t*(3-2*t);
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

function tuplePose(v: ThrowJointStyle['attacker']): ThrowJointPose {
  return { frontArmUpper:v[0], frontArmFore:v[1], rearArmUpper:v[2], rearArmFore:v[3], frontLegUpper:v[4], frontKnee:v[5], rearLegUpper:v[6], rearKnee:v[7], handOpen:v[8], torsoTwist:v[9] };
}

export function throwJointPoseFor(characterId:string, role:'attacker'|'victim', progress:number):ThrowJointPose {
  const style=STYLES[characterId]??STYLES.RYU!;
  const base=tuplePose(role==='attacker'?style.attacker:style.victim);
  const p=clamp(progress);
  const gather=smooth(Math.min(1,p/.48));
  const release=p<.48?0:smooth((p-.48)/.52);
  const lift=Math.sin(p*Math.PI)*style.liftBias;
  const snap=Math.sin(Math.min(1,release)*Math.PI)*style.releaseSnap;
  if(role==='attacker') return {
    frontArmUpper:lerp(.32,base.frontArmUpper,gather)-snap*.22,
    frontArmFore:lerp(.78,base.frontArmFore,gather)-snap*.34,
    rearArmUpper:lerp(2.78,base.rearArmUpper,gather)+release*.18,
    rearArmFore:lerp(2.35,base.rearArmFore,gather)+release*.24,
    frontLegUpper:lerp(-6,base.frontLegUpper,gather)-lift*14,
    frontKnee:lerp(18,base.frontKnee,gather)+lift*12,
    rearLegUpper:lerp(8,base.rearLegUpper,gather)+lift*12,
    rearKnee:lerp(-18,base.rearKnee,gather)-lift*10,
    handOpen:base.handOpen,
    torsoTwist:base.torsoTwist*(.3+gather*.7)-release*.08,
  };
  return {
    frontArmUpper:base.frontArmUpper+release*.55,
    frontArmFore:base.frontArmFore+release*.7,
    rearArmUpper:base.rearArmUpper-release*.5,
    rearArmFore:base.rearArmFore-release*.66,
    frontLegUpper:base.frontLegUpper-release*28,
    frontKnee:base.frontKnee+release*18,
    rearLegUpper:base.rearLegUpper+release*30,
    rearKnee:base.rearKnee-release*16,
    handOpen:base.handOpen,
    torsoTwist:base.torsoTwist+release*.42,
  };
}

export function throwJointProfileCount():number{return Object.keys(STYLES).length;}
export function throwJointProfileSignature(characterId:string):string{
  const s=STYLES[characterId]??STYLES.RYU!;
  return `${s.attacker.join(',')}|${s.victim.join(',')}|${s.liftBias.toFixed(2)}|${s.releaseSnap.toFixed(2)}`;
}
