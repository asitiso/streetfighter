import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS], images=[], sequences=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
let autoLoad=true;
function finish(im){const s=sequences.get(im.src);im.complete=true;im.naturalWidth=s?s.frameWidth*s.frameCount:384;im.naturalHeight=448;im.onload?.();}
globalThis.Image=class{constructor(){images.push(this);this.complete=false;}set src(v){this.url=v;if(v&&autoLoad)finish(this);}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {animationTextureManager:animations}=await import('../dist/assets/render/AnimationTextureManager.js');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
const {Stage1Scene}=await import('../dist/assets/scenes/Stage1Scene.js');
const art=await import('../dist/assets/render/ImageAssets.js');


const expected=id=>animationSequencesFor(id,true).filter(s=>s.poseAuthored).length;
const idle=id=>animationSequencesFor(id,true).find(s=>s.kind==='idle'&&s.poseAuthored);
const input={held(){return false;},pressed(){return false;},released(){return false;}};
const audio={playStagePulse(){},playHit(){},playParry(){}};
function reset(mode='auto',tier='high'){textures.setMode('lite');runtimeQuality.setTier(tier);textures.setMode(mode);}
// Grunts draw from grunts-v1 atlases; only roster/boss actors own animation textures.
function actors(scene){return [...new Set([scene.playerDef.id,...scene.world.enemies.map(e=>e.character.id).filter(id=>!id.startsWith('GRUNT_'))])];}
function prepared(scene,high=true){
 const ids=actors(scene);
 for(const id of ids){assert.equal(animations.readyCount(id),high?expected(id):0,'Current wave must prepare all motion for '+id);if(high)for(const key of [art.combatSpriteHdKey(id),art.attackAtlasHdKey(id),art.combatSpriteHqKey(id)].filter(Boolean))assert(art.isArtAssetReady(key));}
 if(high&&textures.currentMode==='auto')assert(roster.filter(c=>animations.readyCount(c.id)>0).length<=Math.max(3,ids.length));
 return ids;
}
function nextWave(scene,tick){
 for(const e of scene.world.enemies)e.hp=0;
 scene.fixedUpdate(1/60,tick);assert.equal(scene.beltState,'travel');
 scene.world.player.x=scene.areaStarts[scene.beltWave]+160;
 scene.fixedUpdate(1/60,tick+1);assert.equal(scene.world.livingEnemies.length>0,true);assert.equal(scene.waveBreakFrames,54);
 for(let i=0;i<54;i++)scene.fixedUpdate(1/60,tick+2+i);
}
let waves=0,maxActors=0;
for(const p of CHARACTERS)for(const stage of [1,2,3,4,5]){
 reset();const scene=new Stage1Scene(input,audio,p,p.superArts[0],stage);scene.enter();scene.introFrames=0;
 for(let wave=0;wave<3;wave++){
  const ids=prepared(scene);maxActors=Math.max(maxActors,ids.length);waves++;
  const current=ids.map(id=>animations.selection(idle(id)).image),n=images.length;
  scene.enter();assert.equal(images.length,n,'Repeated wave entry must not restart requests');
  ids.forEach((id,i)=>assert.equal(animations.selection(idle(id)).image,current[i]));
  textures.setMode('auto');prepared(scene);
  if(wave<2)nextWave(scene,1000+wave*100);
 }
 scene.prepareDuel();prepared(scene);assert(roster.filter(c=>animations.readyCount(c.id)>0).length<=3,'Duel shrinks AUTO cache back to three');
 textures.focusCharacter(p.id);assert(roster.filter(c=>animations.readyCount(c.id)>0).length<=3,'Single character menu shrinks cache');
}
const ken=roster.find(c=>c.id==='KEN');
for(const [mode,tier,high]of [['lite','high',false],['auto','low',false],['hd','low',true]]){
 reset(mode,tier);const scene=new Stage1Scene(input,audio,ken,ken.superArts[0],2);scene.enter();scene.introFrames=0;prepared(scene,high);nextWave(scene,100);prepared(scene,high);
}
reset();autoLoad=false;const scene=new Stage1Scene(input,audio,ken,ken.superArts[0],1);scene.enter();
const pending=actors(scene).map(id=>images.findLast(im=>im.src===idle(id).asset));assert(pending.every(Boolean),'All current actors requested before drawing');
const n=images.length;scene.enter();textures.setMode('auto');assert.equal(images.length,n);assert(pending.every(im=>im.src));
for(const im of images)if(im.src&&!im.complete)finish(im);prepared(scene);
console.log('WAVE_TEXTURE_PRELOAD_PASS',{waves,maxActors,playableCharacters:8,stages:5,reentryReused:true,pendingReused:true,qualityCases:3,cacheShrinks:true});

// Incoming bosses need the full existing transition for asynchronous texture loading.
let bossPrewarmCases=0;
for(const c of CHARACTERS)for(const stage of [1,2,3,4,5])for(const phase of stage===5?['transition','final-transition']:['transition']){
 reset();autoLoad=false;
 const scene=new Stage1Scene(input,audio,c,c.superArts[0],stage);scene.enter();scene.introFrames=0;
 const id=phase==='final-transition'?'GILL':scene.stageBossDef().id;
 animations.releaseCharacter(id);const n=images.length;
 const outgoing=images.filter(im=>im.src&&im.src!==idle(id).asset);
 scene.phase=phase;scene.phaseFrames=90;
 const hp=scene.world.player.hp,gauge=scene.world.player.superGauge,worldTime=scene.world.time;
 scene.fixedUpdate(1/60,1);
 assert(images.slice(n).some(im=>im.src===idle(id).asset),'Boss idle must start loading at transition start '+c.id+'/'+stage+'/'+phase);
 assert.equal(scene.phaseFrames,89,'Prewarm cannot lengthen transition');
 assert.equal(scene.world.time,worldTime);assert.equal(scene.world.player.hp,hp);assert.equal(scene.world.player.superGauge,gauge);
 assert(outgoing.every(im=>im.src),'Prewarm must not evict outgoing textures');
 const after=images.length;scene.fixedUpdate(1/60,2);assert.equal(images.length,after,'Pending loads are reused');
 for(const im of images)if(im.src&&!im.complete)finish(im);
 assert(animations.selection(idle(id)),'Incoming idle can decode before world replacement');
 bossPrewarmCases++;
}
for(const [mode,tier]of [['lite','high'],['auto','low']]){
 reset(mode,tier);autoLoad=false;
 const scene=new Stage1Scene(input,audio,ken,ken.superArts[0],5);scene.enter();scene.introFrames=0;scene.phase='final-transition';scene.phaseFrames=90;
 const n=images.length;scene.fixedUpdate(1/60,1);
 assert(!images.slice(n).some(im=>sequences.has(im.src)),'Lite policy must not allocate high-frame boss textures');
}
reset();autoLoad=true;
console.log('BOSS_TRANSITION_PREWARM_PASS',{bossPrewarmCases,qualityPolicies:2});
