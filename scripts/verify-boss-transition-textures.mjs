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
function reset(mode='auto',tier='high'){textures.setMode('lite');runtimeQuality.setTier(tier);textures.setMode(mode);}
function prepared(scene,label,high=true){
 for(const id of new Set([scene.playerDef.id,scene.world.enemy.character.id])){
  assert.equal(animations.readyCount(id),high?expected(id):0,label+' must prepare '+id+' motion before rendering');
  if(high)for(const key of [art.combatSpriteHdKey(id),art.attackAtlasHdKey(id),art.combatSpriteHqKey(id)].filter(Boolean))assert(art.isArtAssetReady(key),label+' must prepare '+key);
 }
 if(high&&textures.currentMode==='auto')assert(roster.filter(c=>animations.readyCount(c.id)>0).length<=3);
}
const ken=roster.find(c=>c.id==='KEN');
const first=new Stage1Scene({}, {playStagePulse(){}},ken,ken.superArts[0],1);
reset();first.enter();animations.releaseCharacter('DUDLEY');assert.equal(animations.readyCount('DUDLEY'),0);first.prepareDuel();prepared(first,'Boss transition');
let transitions=0;
for(const player of CHARACTERS)for(const stage of [1,2,3,4,5]){
 reset();const scene=new Stage1Scene({}, {playStagePulse(){}},player,player.superArts[0],stage);scene.enter();
 scene.world.player.hp=321;scene.world.player.superGauge=37;
 const playerImage=animations.selection(idle(player.id)).image;
 scene.prepareDuel();prepared(scene,player.id+' stage '+stage);
 assert.equal(scene.world.player.hp,321);assert.equal(scene.world.player.superGauge,37);
 assert.equal(animations.selection(idle(player.id)).image,playerImage,'Transition retains player image');
 let n=images.length;scene.enter();assert.equal(images.length,n,'Entered prepared duel must reuse requests');
 transitions++;
 if(stage===5){scene.prepareFinalDuel();prepared(scene,player.id+' final');assert.equal(scene.world.enemy.character.id,'GILL');assert.equal(scene.world.enemy.hp,1500);assert.equal(scene.world.player.hp,321);assert.equal(scene.world.player.superGauge,37);n=images.length;scene.enter();assert.equal(images.length,n);transitions++;}
}
for(const [mode,tier,high]of [['lite','high',false],['auto','low',false],['hd','low',true]]){
 reset(mode,tier);const scene=new Stage1Scene({}, {playStagePulse(){}},ken,ken.superArts[0],5);scene.enter();scene.prepareDuel();prepared(scene,mode+' duel',high);scene.prepareFinalDuel();prepared(scene,mode+' final',high);
}
reset();autoLoad=false;
const pendingScene=new Stage1Scene({}, {playStagePulse(){}},ken,ken.superArts[0],5);pendingScene.enter();pendingScene.prepareDuel();pendingScene.prepareFinalDuel();
const gill=images.findLast(im=>im.src===idle('GILL').asset);assert(gill,'Final transition starts Gill request before draw');
const n=images.length;pendingScene.enter();assert.equal(images.length,n,'Pending final art is not duplicated');assert.equal(gill.src,idle('GILL').asset);
for(const im of images)if(im.src&&!im.complete)finish(im);prepared(pendingScene,'Pending completion');
console.log('BOSS_TRANSITION_TEXTURES_PASS',{transitions,playableCharacters:CHARACTERS.length,stages:5,finalBosses:CHARACTERS.length,qualityCases:3,pendingReused:true,playerStatePreserved:true});
