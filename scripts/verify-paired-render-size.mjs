import assert from 'node:assert/strict';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{CHARACTERS,BOSS_CHARACTERS,getCharacter}from'../dist/assets/game/characters.js';
globalThis.Image=class{complete=true;naturalWidth=384;naturalHeight=448;set src(v){this.url=v;this.onload?.();}get src(){return this.url;}};
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
 fill:draw,stroke:draw,fillRect(x,y,w,h){path=[point(x,y),point(x+w,y+h)];draw();},
 createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})
 })[k]??(()=>{});}});
 return {ctx,bounds(){assert.ok(paint.length>30);const ys=paint.map(p=>p[1]);return Math.max(...ys)-Math.min(...ys);},centerY(){const ys=paint.map(p=>p[1]);return (Math.max(...ys)+Math.min(...ys))/2;}};
}
let checked=0,maxHeight=0;
for(const def of[...CHARACTERS,...BOSS_CHARACTERS])for(const role of['attacker','victim'])for(const facing of[-1,1])for(const progress of[0,.25,.5,.75]){
 const f=new CombatWorld(def,getCharacter('KEN'),'duel').player;f.facing=facing;f.beginThrowSync(role,'other',facing,24,def.id);f.throwSyncFrames=Math.max(1,Math.round(24*(1-progress)));
 const r=recorder();drawCombatFighter(r.ctx,f,0,0);const h=r.bounds()/def.heightScale;maxHeight=Math.max(maxHeight,h);
 assert.ok(h<=220,'Paired '+def.id+' '+role+' at '+progress+' expands to '+h.toFixed(1)+' worldpx; authored bodies are about150px');checked++;
}
for(const def of[...CHARACTERS,...BOSS_CHARACTERS])for(const facing of[-1,1])for(const progress of[0,.25,.5,.75]){
 const f=new CombatWorld(def,getCharacter('KEN'),'duel').player;f.facing=facing;f.state='hit';f.superVictimFrames=Math.max(1,Math.round(30*(1-progress)));f.superVictimTotal=30;
 const r=recorder();drawCombatFighter(r.ctx,f,0,0);const h=r.bounds()/def.heightScale;maxHeight=Math.max(maxHeight,h);
 assert.ok(h<=220,'Post-throw super victim '+def.id+' expands to '+h.toFixed(1)+' worldpx');checked++;
}
let heightChecks=0;
for(const def of[...CHARACTERS,...BOSS_CHARACTERS])for(const role of['attacker','victim'])for(const facing of[-1,1]){
 const f=new CombatWorld(def,getCharacter('KEN'),'duel').player;f.facing=facing;f.airborne=true;f.jumpVelocity=0;f.beginThrowSync(role,'other',facing,24,def.id);
 const ground=recorder();drawCombatFighter(ground.ctx,f,0,0);f.jumpHeight=40;const air=recorder();drawCombatFighter(air.ctx,f,0,0);
 assert.ok(Math.abs(ground.centerY()-air.centerY()-40)<1e-8,'Paired body must follow gameplay height exactly once');heightChecks++;
}
console.log('PAIRED_RENDER_SIZE_PASS',{checked,maxHeight,heightChecks,allRosterAndBosses:true});
