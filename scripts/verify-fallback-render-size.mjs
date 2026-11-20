import assert from 'node:assert/strict';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{CHARACTERS,BOSS_CHARACTERS,getCharacter}from'../dist/assets/game/characters.js';
import{airNormalFor}from'../dist/assets/combat/TechniqueLibrary.js';
globalThis.Image=class{complete=!process.argv.includes('--unavailable');naturalWidth=384;naturalHeight=448;set src(v){this.url=v;if(this.complete)this.onload?.();}get src(){return this.url;}};
const{drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function recorder(){
 let m=[1,0,0,1,0,0],stack=[],path=[],paint=[];
 const state={globalAlpha:1,globalCompositeOperation:'source-over',lineWidth:1};
 const point=(x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
 const mark=(x,y)=>path.push(point(x,y));
 const draw=()=>{if(state.globalCompositeOperation!=='screen'&&state.globalAlpha>=.25)paint.push(...path);};
 const ctx=new Proxy(state,{get(o,k){if(k in o)return o[k];return({
 save(){stack.push({m:[...m],state:{...state}});},restore(){const s=stack.pop();m=s.m;Object.assign(state,s.state);},
 translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},
 rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},
 beginPath(){path=[];},moveTo:mark,lineTo:mark,quadraticCurveTo(a,b,x,y){mark(a,b);mark(x,y);},bezierCurveTo(a,b,c,d,x,y){mark(a,b);mark(c,d);mark(x,y);},
 arc(x,y,r){for(let a=0;a<Math.PI*2;a+=Math.PI/4)mark(x+Math.cos(a)*r,y+Math.sin(a)*r);},
 ellipse(x,y,rx,ry){if(Math.abs(y)<12&&ry<16&&rx>40)return;for(let a=0;a<Math.PI*2;a+=Math.PI/4)mark(x+Math.cos(a)*rx,y+Math.sin(a)*ry);},
 drawImage(image,sx,sy,sw,sh,x,y,w,h){path=[point(x,y),point(x+w,y+h)];draw();},
 fill:draw,stroke:draw,fillRect(x,y,w,h){path=[point(x,y),point(x+w,y+h)];draw();},
 createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})
 })[k]??(()=>{});}});
 return {ctx,bounds(){assert.ok(paint.length>=2);const ys=paint.map(p=>p[1]);return Math.max(...ys)-Math.min(...ys);},centerY(){const ys=paint.map(p=>p[1]);return (Math.max(...ys)+Math.min(...ys))/2;}};
}
let checked=0,maxHeight=0,heightChecks=0;
for(const def of [...CHARACTERS,...BOSS_CHARACTERS])for(const button of ['lp','mp','hp','lk','mk','hk'])for(const facing of[-1,1])for(const phase of['startup','active','recovery']){
 const f=new CombatWorld(def,getCharacter('KEN'),'duel').player;f.facing=facing;f.airborne=true;f.jumpVelocity=0;f.startMove(airNormalFor(def.id,button));const move=f.currentMove;assert.ok(move);f.moveFrame=phase==='startup'?0:phase==='active'?move.startup:move.startup+move.active;
 const r=recorder();drawCombatFighter(r.ctx,f,0,0);const h=r.bounds()/def.heightScale;maxHeight=Math.max(maxHeight,h);assert.ok(h<=220,def.id+' '+button+' '+phase+' expands to '+h.toFixed(1)+' worldpx');checked++;
 f.jumpHeight=40;const air=recorder();drawCombatFighter(air.ctx,f,0,0);assert.ok(Math.abs(r.centerY()-air.centerY()-40)<1e-8,'World jump height must remain40px');heightChecks++;
}
if(process.argv.includes('--unavailable'))for(const def of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of[-1,1])for(const state of['idle','walk','jump','crouch','hit','block','parry','knockdown','ko','victory']){
 const f=new CombatWorld(def,getCharacter('KEN'),'duel').player;f.facing=facing;f.state=state;f.stateFrame=0;f.airborne=state==='jump';const r=recorder();drawCombatFighter(r.ctx,f,0,0);const h=r.bounds()/def.heightScale;assert.ok(h<=220,def.id+' unavailable '+state+' expands to '+h);maxHeight=Math.max(maxHeight,h);checked++;
}
console.log('FALLBACK_RENDER_SIZE_PASS',{checked,maxHeight,heightChecks});
