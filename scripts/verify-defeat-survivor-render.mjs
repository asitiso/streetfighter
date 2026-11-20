import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const audio=new Proxy({},{get:()=>()=>{}}),input={pressed:()=>false,held:()=>false,released:()=>false,historyEpoch:0,directionChanges:()=>[]};let cases=0;
for(const character of CHARACTERS)for(const mode of ['time-over','ko-survivors','ko-motion']){
 const scene=new Stage1Scene(input,audio,character,character.superArts[0]);scene.introFrames=0;
 if(mode==='time-over')scene.stageTime=0;else{scene.world.player.hp=0;scene.world.player.state='ko';scene.world.player.stateFrame=-90;}
 scene.fixedUpdate(1/60,1);assert.equal(scene.phase,'defeat');assert.equal(scene.defeatReason,mode==='time-over'?'time-over':'ko');
 for(const name of Object.getOwnPropertyNames(Stage1Scene.prototype))if(name.startsWith('draw'))scene[name]=()=>{};
 for(const fighter of [...scene.world.enemies,scene.world.player]){const moving=mode==='ko-motion'?fighter.state==='ko':fighter.state!=='ko';fighter.previousX=fighter.x-(moving?12:0);fighter.previousY=fighter.y-(moving?6:0);}
 const render=alpha=>{const points=[],gradient={addColorStop(){}};const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:k==='translate'?(...v)=>points.push(v):k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:()=>{}});scene.render({ctx,width:1280,height:720,dpr:1},alpha);return points;};const first=render(.1),second=render(.9);assert(first.length>2);
 if(mode==='ko-motion')assert.notDeepEqual(first,second,'KO movement must retain interpolation');else assert.deepEqual(first,second,character.id+'/'+mode+' stationary survivors must not replay prior movement');scene.destroy();cases++;
}
console.log(JSON.stringify({passed:true,cases,roster:CHARACTERS.length,timeOverSurvivorsFrozen:true,koSurvivorsFrozen:true,koMotionInterpolationPreserved:true}));
