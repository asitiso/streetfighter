import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor,animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {EndingScene} from '../dist/assets/scenes/EndingScene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],seqs=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=seqs.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:960;this.naturalHeight=s?s.frameHeight:896;if(v)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {characterTextureManager:textures}=await import('../dist/assets/render/CharacterTextureManager.js');
function frame(scene){const draws=[],stack=[],o={globalAlpha:1};const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];return ({save(){stack.push(o.globalAlpha);},restore(){o.globalAlpha=stack.pop();},drawImage(im,...args){draws.push({asset:im.src,alpha:o.globalAlpha,sourceX:args[0]});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});scene.drawHero(ctx,1);assert.equal(stack.length,0);return draws.at(-1);}
const quiet={pressed:()=>false,touchPressed:()=>false},audio={playStagePulse(){}};
function make(c,input=quiet,finish=()=>{}){return new EndingScene(input,audio,c,c.superArts[0],[],finish);}
let visibleFrames=0,repeatedDraws=0,sparseChecks=0;
for(const c of roster){
 textures.setMode('lite');textures.setMode('hd');textures.preloadCharacter(c.id);
 const scene=make(c),sequence=animationSequenceFor(c.id,'victory',true),seen=new Set();scene.enter();
 for(let tick=1;tick<=240;tick++){
  scene.fixedUpdate(1/60);const im=frame(scene);assert.equal(im.asset,sequence.asset);
  const index=im.sourceX/sequence.frameWidth;
  if(im.alpha>=1-1e-10)seen.add(index);
  const state=scene.hero.stateFrame;assert.deepEqual(frame(scene),im,'Repeated render must not advance victory');assert.equal(scene.hero.stateFrame,state);repeatedDraws++;
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7],c.id+' must show complete victory animation at full opacity');visibleFrames+=seen.size;assert.equal(scene.hero.animationFrame,scene.hero.stateFrame,'Ending clocks must advance together');
 assert.equal(frame(scene).sourceX,7*sequence.frameWidth,'Last victory pose stays held');
 const dense=make(c),sparse=make(c);dense.enter();sparse.enter();
 for(let tick=0;tick<180;tick++){dense.fixedUpdate(1/60);sparse.fixedUpdate(1/60);const expected=frame(dense);if(tick%6===5){assert.deepEqual(frame(sparse),expected,'Skipped draws must not change animation time');sparseChecks++;}}
}
textures.setMode('lite');const c=CHARACTERS[0],lite=make(c);lite.enter();
for(let tick=0;tick<90;tick++)lite.fixedUpdate(1/60);assert.equal(lite.hero.stateFrame,0,'LITE also holds initial pose during reveal');
for(let tick=0;tick<60;tick++)lite.fixedUpdate(1/60);assert(lite.hero.stateFrame>0);assert.equal(lite.hero.stateFrame,lite.hero.animationFrame);
let finished=0;const skip=make(c,{pressed:k=>k==='confirm',touchPressed:()=>false},()=>finished++);skip.enter();skip.fixedUpdate(1/60);assert.equal(finished,1,'Fresh confirm returns immediately');for(let i=0;i<410;i++)skip.fixedUpdate(1/60);assert.equal(finished,1,'Return dispatch remains unique');
const { endingProfileFor } = await import('../dist/assets/game/EndingProfiles.js');
let readableEndingCases = 0;
for (const character of roster) {
  const scene = make(character);
  scene.time = 2.2;
  const profile = endingProfileFor(character.id);
  const labels = [];
  let panel;
  const ctx = {
    beginPath() {},
    roundRect(x, y, width, height) { panel = { x, y, width, height, color: this.fillStyle }; },
    fill() {}, stroke() {},
    fillText(label, x, y, maxWidth) {
      labels.push({ label, x, y, maxWidth, alpha: this.globalAlpha, align: this.textAlign, font: this.font });
    },
  };
  scene.drawEndingCopy(ctx);
  assert(panel);
  assert(scene.hero.x + 150 < panel.x, character.id + ' hero must be clear of story text');
  const story = labels.filter(label => profile.epilogue.includes(label.label));
  assert.equal(story.length, 3);
  assert(labels.some(label => label.label === profile.closing));
  for (const label of story) {
    assert.equal(label.alpha, 1, 'Story should be readable by 2.2 seconds');
    assert.equal(label.align, 'left');
    assert.match(label.font, /18px/);
    assert(label.x > panel.x && label.x + label.maxWidth < panel.x + panel.width);
    assert(label.y > panel.y && label.y < panel.y + panel.height);
  }
  assert.equal(ctx.globalAlpha, 1, 'Text reveal must not fade later UI');
  readableEndingCases++;
}
console.log('ENDING_VICTORY_REVEAL_PASS',{characters:10,fullyVisibleAuthoredFrames:visibleFrames,repeatedDraws,sparseChecks,readableEndingCases,liteTiming:true,clocksSynchronized:true,finalPoseHeld:true,immediateReturn:true});


// A pending or failed file gets the fallback city. An authored image owns that layer once ready.
const { preloadArtAssets, unloadArtAsset } = await import('../dist/assets/render/ImageAssets.js');
const OriginalImage = globalThis.Image;
let pendingBackdrop;
globalThis.Image = class {
  complete = false;
  naturalWidth = 0;
  set src(url) { if (url) pendingBackdrop = this; }
};
let backdropCases = 0;
try {
  for (const character of roster) {
    const ending = make(character);
    ending.time = 2.2;
    unloadArtAsset('ending-keyart');
    preloadArtAssets(['ending-keyart']);
    function backdropFrame() {
      const rects = [], images = [], glows = [];
      const ctx = {
        createLinearGradient() { return { addColorStop() {} }; },
        beginPath() {},
        arc(...args) { glows.push(args); },
        fill() {},
        drawImage(...args) { images.push(args); },
        fillRect(...args) { rects.push(args); },
      };
      ending.drawBackdrop(ctx);
      return { buildings: rects.filter(([, , width]) => width === 68), rects, images, glows };
    }
    const waiting = backdropFrame();
    assert(waiting.buildings.length > 0 && waiting.images.length === 0, 'Pending art keeps the fallback skyline');
    pendingBackdrop.onerror();
    const failed = backdropFrame();
    assert.deepEqual(failed.buildings, waiting.buildings, 'Failure keeps the fallback skyline');

    preloadArtAssets(['ending-keyart']);
    pendingBackdrop.complete = true;
    pendingBackdrop.naturalWidth = 1280;
    pendingBackdrop.onload();
    const ready = backdropFrame();
    assert.equal(ready.images.length, 1);
    assert.equal(ready.buildings.length, 0, 'Authored art must never be covered by fallback buildings');
    assert(ready.rects.some(([x, y, width, height]) => x === 0 && y === 545 && width === 1280 && height === 175));
    assert.deepEqual(ready.glows, waiting.glows, 'Keep the character accent and prompt contrast');
    assert.equal(ending.time, 2.2, 'A late image cannot restart the ending sequence');
    backdropCases++;
  }
} finally {
  unloadArtAsset('ending-keyart');
  globalThis.Image = OriginalImage;
}
console.log('ENDING_BACKDROP_LAYER_PASS', { backdropCases });


let compactStoryCases = 0;
for (const character of roster) {
  const scene = make(character);
  scene.time = 2.2;
  const profile = endingProfileFor(character.id);
  const text = [];
  let panel, measures = 0;
  const ctx = {
    beginPath() {}, fill() {}, stroke() {},
    measureText(value) { measures++; return {width:value.length * 14}; },
    roundRect(x,y,width,height) { panel = {x,y,width,height}; },
    fillText(value,x,y,maxWidth) { text.push({value,x,y,maxWidth,font:this.font}); },
  };
  scene.drawEndingCopy(ctx, true);
  const story=text.filter(line=>line.font.includes('27px'));
  assert.equal(story.map(line=>line.value).join(' '),profile.epilogue.join(' '),'Compact story preserves the original text');
  assert(story.length>=4 && story.length<=6,'Story wraps to readable rows');
  assert(panel.y>=240&&panel.y+panel.height<=486,'Story panel stays above record cards and below status');
  assert(story.every(line=>line.x>panel.x&&line.y>panel.y&&line.y<panel.y+panel.height&&line.value.length*14<=line.maxWidth));
  const closing=text.find(line=>line.value===profile.closing);
  assert(closing.y>story.at(-1).y&&closing.y<panel.y+panel.height);
  const before=measures;
  scene.drawEndingCopy(ctx, true);
  assert.equal(measures,before,'Wrapping should be cached across render frames');
  compactStoryCases++;
}
console.log('ENDING_COMPACT_STORY_PASS', { compactStoryCases });
