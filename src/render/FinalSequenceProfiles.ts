export interface FinalKoPose { x:number; y:number; rotation:number; scale:number; aura:number; wing:number; collapse:number; }
interface Frame extends FinalKoPose { at:number }
const F=(at:number,x:number,y:number,rotation:number,scale:number,aura:number,wing:number,collapse:number):Frame=>({at,x,y,rotation,scale,aura,wing,collapse});
const GILL_FINAL_KO:readonly Frame[]=[
  F(0,0,0,0,1,1,1,0),F(.07,2,-6,.04,1.04,1,.96,.04),F(.14,-3,-10,-.06,1.02,.92,.86,.08),F(.22,5,-4,.09,1,.82,.74,.14),F(.30,-7,4,-.14,.98,.7,.6,.24),F(.39,8,14,.2,.96,.56,.44,.36),F(.48,-6,24,-.28,.94,.44,.3,.48),F(.57,5,34,.36,.92,.32,.2,.6),F(.66,-3,44,-.46,.9,.22,.12,.72),F(.75,2,52,-.57,.88,.14,.07,.82),F(.84,0,58,-.66,.86,.09,.04,.9),F(.92,0,62,-.72,.85,.05,.02,.96),F(1,0,64,-.76,.84,.02,0,1)
];
const clamp=(v:number)=>Math.max(0,Math.min(1,v)); const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export function finalKoPose(progress:number):FinalKoPose{const p=clamp(progress);let a=GILL_FINAL_KO[0]!,b=GILL_FINAL_KO[GILL_FINAL_KO.length-1]!;for(let i=0;i<GILL_FINAL_KO.length-1;i++){if(p>=GILL_FINAL_KO[i]!.at&&p<=GILL_FINAL_KO[i+1]!.at){a=GILL_FINAL_KO[i]!;b=GILL_FINAL_KO[i+1]!;break;}}const t=clamp((p-a.at)/Math.max(.001,b.at-a.at));const q=t*t*(3-2*t);return{x:lerp(a.x,b.x,q),y:lerp(a.y,b.y,q),rotation:lerp(a.rotation,b.rotation,q),scale:lerp(a.scale,b.scale,q),aura:lerp(a.aura,b.aura,q),wing:lerp(a.wing,b.wing,q),collapse:lerp(a.collapse,b.collapse,q)}}
export function finalKoKeyframeCount():number{return GILL_FINAL_KO.length;}
