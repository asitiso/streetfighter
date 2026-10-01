export interface BossMotionAccent { bodyX:number; bodyY:number; rotation:number; scaleX:number; scaleY:number; armReach:number; crouch:number; aura:number }
interface Frame extends BossMotionAccent { at:number }
const F=(at:number, bodyX:number, bodyY:number, rotation:number, armReach:number, crouch:number, aura:number, scaleX=1, scaleY=1):Frame=>({at,bodyX,bodyY,rotation,scaleX,scaleY,armReach,crouch,aura});

const URIEN_AEGIS: readonly Frame[] = [F(0,-3,4,-.04,.88,8,.1),F(.08,-7,6,-.08,.8,12,.2),F(.16,-10,2,-.12,.9,8,.35),F(.25,-4,-4,-.08,1.05,2,.55),F(.34,4,-10,-.02,1.16,0,.75,1.02,1.03),F(.44,9,-12,.04,1.24,0,1),F(.55,7,-8,.06,1.2,0,.92),F(.66,3,-3,.04,1.12,0,.7),F(.76,0,0,.02,1.06,1,.48),F(.86,-1,2,0,1,4,.28),F(.94,0,1,0,.98,2,.16),F(1,0,0,0,1,0,.08)];
const URIEN_TACKLE: readonly Frame[] = [F(0,-8,5,-.1,.85,10,.1),F(.08,-12,4,-.14,.82,8,.12),F(.16,-16,1,-.16,.9,4,.16),F(.25,-8,-2,-.1,1.02,1,.22),F(.34,4,-4,-.04,1.1,0,.3),F(.44,14,-3,.02,1.16,0,.38),F(.55,20,-2,.05,1.2,0,.46),F(.66,15,-1,.04,1.16,0,.4),F(.76,9,0,.03,1.1,0,.3),F(.86,4,1,.01,1.04,1,.22),F(.94,1,1,0,1.01,1,.15),F(1,0,0,0,1,0,.1)];
const URIEN_SPHERE: readonly Frame[] = [F(0,-2,3,-.02,.9,4,.08),F(.08,-5,4,-.05,.84,7,.12),F(.16,-7,1,-.08,.88,4,.2),F(.24,-3,-4,-.04,1,1,.34),F(.34,3,-8,.01,1.13,0,.54),F(.44,7,-10,.04,1.28,0,.76),F(.54,9,-8,.05,1.34,0,.9),F(.64,6,-4,.04,1.25,0,.72),F(.74,3,-1,.02,1.15,0,.52),F(.84,1,1,.01,1.08,1,.34),F(.92,0,1,0,1.03,1,.2),F(1,0,0,0,1,0,.1)];
const URIEN_KNEE: readonly Frame[] = [F(0,-4,5,-.04,.88,9,.08),F(.08,-7,7,-.08,.84,13,.12),F(.16,-6,2,-.06,.9,6,.18),F(.24,-1,-6,0,1,0,.28),F(.32,4,-16,.05,1.06,0,.38),F(.4,8,-27,.09,1.12,0,.5,1.02,1.04),F(.5,10,-34,.12,1.2,0,.64,1.03,1.06),F(.6,8,-28,.1,1.16,0,.56),F(.7,5,-19,.07,1.1,0,.44),F(.8,2,-10,.04,1.06,0,.32),F(.9,1,-3,.02,1.02,1,.2),F(1,0,0,0,1,0,.1)];

const GILL_SPHERE: readonly Frame[] = [F(0,-2,2,-.02,.92,3,.14),F(.07,-4,0,-.04,.94,2,.2),F(.14,-6,-4,-.05,1,0,.3),F(.22,-2,-8,-.02,1.08,0,.46),F(.3,3,-12,.01,1.16,0,.62),F(.38,8,-15,.04,1.24,0,.82,1.02,1.04),F(.48,11,-16,.05,1.3,0,1,1.03,1.05),F(.58,9,-13,.04,1.26,0,.9),F(.68,6,-9,.03,1.2,0,.72),F(.78,3,-5,.02,1.12,0,.54),F(.87,1,-2,.01,1.06,0,.38),F(.94,0,0,0,1.02,0,.24),F(1,0,0,0,1,0,.14)];
const GILL_EX_SPHERE: readonly Frame[] = [F(0,-3,4,-.03,.88,5,.18),F(.07,-6,3,-.06,.86,7,.24),F(.14,-8,-1,-.08,.9,3,.34),F(.21,-5,-7,-.05,1,0,.46),F(.29,-1,-13,0,1.12,0,.62),F(.37,5,-19,.04,1.24,0,.78,1.03,1.06),F(.45,10,-22,.07,1.34,0,.94,1.05,1.08),F(.53,13,-20,.08,1.42,0,1,1.06,1.1),F(.61,11,-16,.07,1.36,0,.92),F(.69,8,-11,.05,1.28,0,.78),F(.77,5,-7,.03,1.2,0,.62),F(.85,2,-3,.02,1.12,0,.46),F(.92,1,-1,.01,1.06,0,.3),F(1,0,0,0,1,0,.16)];
const GILL_ANTI_AIR: readonly Frame[] = [F(0,-4,6,-.05,.86,10,.12),F(.08,-8,8,-.1,.82,15,.16),F(.16,-7,3,-.08,.88,7,.22),F(.24,-2,-7,-.02,.98,0,.32),F(.32,4,-18,.05,1.08,0,.46),F(.4,9,-30,.1,1.18,0,.62,1.03,1.07),F(.5,12,-40,.14,1.3,0,.82,1.05,1.1),F(.6,10,-34,.12,1.24,0,.74),F(.7,7,-24,.09,1.16,0,.6),F(.8,4,-14,.06,1.1,0,.44),F(.9,1,-5,.03,1.04,0,.28),F(.96,0,-1,.01,1.01,0,.18),F(1,0,0,0,1,0,.12)];
const GILL_LARIAT: readonly Frame[] = [F(0,-8,5,-.1,.84,10,.12),F(.07,-13,5,-.15,.8,9,.16),F(.14,-17,2,-.18,.84,5,.2),F(.22,-12,-2,-.13,.96,1,.28),F(.3,-2,-5,-.06,1.08,0,.4),F(.38,10,-6,.02,1.18,0,.54),F(.46,20,-5,.08,1.28,0,.7,1.04,1.03),F(.54,26,-3,.12,1.36,0,.82,1.06,1.04),F(.62,22,-1,.1,1.3,0,.72),F(.7,16,0,.08,1.22,0,.58),F(.78,10,1,.05,1.14,0,.44),F(.86,5,1,.03,1.08,0,.32),F(.94,2,1,.01,1.03,0,.2),F(1,0,0,0,1,0,.12)];
const GILL_SERAPHIC: readonly Frame[] = [F(0,-4,5,-.04,.9,8,.18),F(.055,-7,2,-.07,.88,5,.28),F(.11,-9,-4,-.08,.92,1,.42),F(.17,-7,-11,-.06,.98,0,.54),F(.23,-3,-18,-.03,1.06,0,.66),F(.29,2,-25,.02,1.15,0,.78,1.02,1.05),F(.36,7,-31,.05,1.24,0,.9,1.03,1.08),F(.43,11,-36,.08,1.34,0,1,1.05,1.11),F(.5,14,-39,.1,1.44,0,1,1.07,1.13),F(.57,13,-34,.09,1.4,0,.98),F(.64,11,-28,.08,1.34,0,.9),F(.71,8,-21,.06,1.27,0,.8),F(.78,5,-15,.04,1.2,0,.68),F(.85,3,-9,.03,1.14,0,.54),F(.92,1,-4,.02,1.08,0,.38),F(1,0,0,0,1,0,.18)];

const clamp=(v:number)=>Math.max(0,Math.min(1,v)); const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function sample(frames:readonly Frame[], progress:number):BossMotionAccent { const p=clamp(progress); let a=frames[0]!,b=frames[frames.length-1]!; for(let i=0;i<frames.length-1;i++){if(p>=frames[i]!.at&&p<=frames[i+1]!.at){a=frames[i]!;b=frames[i+1]!;break;}} const span=Math.max(.0001,b.at-a.at); const t=clamp((p-a.at)/span); const q=t*t*(3-2*t); return {bodyX:lerp(a.bodyX,b.bodyX,q),bodyY:lerp(a.bodyY,b.bodyY,q),rotation:lerp(a.rotation,b.rotation,q),scaleX:lerp(a.scaleX,b.scaleX,q),scaleY:lerp(a.scaleY,b.scaleY,q),armReach:lerp(a.armReach,b.armReach,q),crouch:lerp(a.crouch,b.crouch,q),aura:lerp(a.aura,b.aura,q)}; }
function framesFor(characterId:string, moveId:string):readonly Frame[]|null {
  if(characterId==='URIEN') {
    if(moveId==='URIEN_SUPER')return URIEN_AEGIS;
    if(moveId==='URIEN_MOBILITY')return URIEN_TACKLE;
    if(moveId==='URIEN_ANTI_AIR')return URIEN_KNEE;
    return URIEN_SPHERE;
  }
  if(characterId==='GILL') {
    if(moveId==='GILL_SUPER')return GILL_SERAPHIC;
    if(moveId==='GILL_EX_PRIMARY')return GILL_EX_SPHERE;
    if(moveId==='GILL_ANTI_AIR')return GILL_ANTI_AIR;
    if(moveId==='GILL_MOBILITY')return GILL_LARIAT;
    return GILL_SPHERE;
  }
  return null;
}
export function bossMotionFor(characterId:string, moveId:string|undefined, progress:number):BossMotionAccent|null { if(!moveId)return null; const frames=framesFor(characterId,moveId); return frames?sample(frames,progress):null; }
export function bossAnimationKeyframeCount(characterId:string, moveId:string):number { return framesFor(characterId,moveId)?.length??0; }
export function bossTechniqueSignature(characterId:string, moveId:string):string { const f=framesFor(characterId,moveId); if(!f)return ''; const peak=f.reduce((best,frame)=>frame.aura>best.aura?frame:best,f[0]!); return `${f.length}:${peak.bodyX}:${peak.bodyY}:${peak.rotation.toFixed(2)}:${peak.armReach.toFixed(2)}:${peak.aura.toFixed(2)}`; }
