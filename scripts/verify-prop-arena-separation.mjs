import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
const edges=[['bottom',600,565,600,580],['top',600,410,600,394],['left',140,500,128,500],['right',1140,500,1152,500],['top-left',140,410,128,394],['top-right',1140,410,1152,394],['bottom-left',140,565,128,580],['bottom-right',1140,565,1152,580]];
let edgeCases=0,stagePropCases=0,stableTicks=0,validControls=0,exclusionControls=0;
function inside(w,f){return f.x>=w.rules.arenaLeft&&f.x<=w.rules.arenaRight&&f.y>=w.rules.arenaTop&&f.y<=w.rules.arenaBottom;}
function overlaps(f,p){return Math.abs(f.x-p.x)<p.width*.5+28&&Math.abs(f.y-p.y)<p.depth*.5+16;}
function check(w,f,p,label){assert(inside(w,f),label+' collision cannot push beyond arena');assert(!overlaps(f,p),label+' must separate instead of clamping inside obstacle');}
function selected(f){return[f.x,f.y,f.previousX,f.previousY,f.hp,f.superGauge,f.state,f.stateFrame,f.airborne,f.jumpHeight];}
for(const c of roster)for(const side of ['player','enemy'])for(const [name,px,py,x,y]of edges){
 const w=new CombatWorld(c,c,'belt'),f=side==='player'?w.player:w.enemy;w.player.x=side==='player'?x:900;w.player.y=side==='player'?y:450;w.enemy.x=side==='enemy'?x:900;w.enemy.y=side==='enemy'?y:450;f.previousX=f.x;f.previousY=f.y;w.addProp({id:'edge',label:'BIN',x:px,y:py,width:54,depth:34,hp:130,solid:true});const prop=w.props[0],hp=f.hp,gauge=f.superGauge;
 w.resolveBodyCollisions();if(!recording)check(w,f,prop,c.id+'/'+side+'/'+name);assert.equal(f.hp,hp);assert.equal(f.superGauge,gauge);assert.equal(prop.hp,130);edgeCases++;
 if(side==='player'){w.enemies.length=0;for(let t=0;t<12;t++){w.update({...q,held:k=>k===(y===580?'down':y===394?'up':x===128?'left':'right')},t);if(!recording)check(w,f,prop,'Repeated edge movement');stableTicks++;}}
}
// Existing stage props use their real dimensions; simulate the matching scroll window.
for(let stage=1;stage<=5;stage++){
 const c=getCharacter('KEN'),scene=new Stage1Scene(q,{playStagePulse(){}},c,c.superArts[0],stage);scene.enter();const actual=scene.world.props.map(p=>({...p}));
 for(const prop of actual)for(const boundary of [scene.world.rules.arenaTop,scene.world.rules.arenaBottom]){const w=new CombatWorld(c,c,'belt');w.enemies.length=0;w.rules.arenaTop=scene.world.rules.arenaTop;w.rules.arenaBottom=scene.world.rules.arenaBottom;w.rules.arenaLeft=prop.x-512;w.rules.arenaRight=prop.x+512;w.props.push({...prop});const f=w.player;f.x=f.previousX=prop.x;f.y=f.previousY=boundary;if(!overlaps(f,prop))continue;w.resolveBodyCollisions();if(!recording)check(w,f,prop,'Stage'+stage+'/'+prop.id);stagePropCases++;}
}
// All contacts whose original chosen exit already fits must remain byte-identical.
for(const c of roster)for(const side of ['player','enemy'])for(const dx of [-40,-20,0,20,40])for(const dy of [-25,-10,0,10,25]){
 const w=new CombatWorld(c,c,'belt'),f=side==='player'?w.player:w.enemy;w.player.x=side==='player'?600+dx:900;w.player.y=side==='player'?480+dy:450;w.enemy.x=side==='enemy'?600+dx:900;w.enemy.y=side==='enemy'?480+dy:450;f.previousX=f.x;f.previousY=f.y;w.addProp({id:'central',label:'CRATE',x:600,y:480,width:70,depth:44,hp:170,solid:true});w.resolveBodyCollisions();check(w,f,w.props[0],'Unchanged central contact');records.push({c:c.id,side,dx,dy,fighter:selected(f),prop:{...w.props[0]}});validControls++;
}
for(const c of roster)for(const kind of ['high-air','broken','nonsolid','outside']){
 const w=new CombatWorld(c,c,'belt');w.enemies.length=0;const f=w.player;f.x=f.previousX=600;f.y=f.previousY=480;w.addProp({id:'excluded',label:'CRATE',x:600,y:480,width:70,depth:44,hp:170,solid:kind!=='nonsolid',broken:kind==='broken'});if(kind==='high-air'){f.airborne=true;f.jumpHeight=53;}if(kind==='outside')f.x=f.previousX=800;const before=selected(f);w.resolveBodyCollisions();assert.deepEqual(selected(f),before);records.push({c:c.id,kind,fighter:selected(f),prop:{...w.props[0]}});exclusionControls++;
}
if(recording)console.log(JSON.stringify(records));else console.log('PROP_ARENA_SEPARATION_PASS',{edgeCases,stagePropCases,stableTicks,validControls,exclusionControls,characters:roster.length});
