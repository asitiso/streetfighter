import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const audio=new Proxy({},{get:()=>()=>{}}),input={pressed:()=>false,held:()=>false,released:()=>false,historyEpoch:0,directionChanges:()=>[]};let cases=0,samples=0;
for(const character of CHARACTERS)for(let stage=1;stage<=5;stage++){
 const scene=new Stage1Scene(input,audio,character,character.superArts[0],stage);scene.introFrames=0;scene.beltWave=1;scene.beltState='travel';scene.world.enemies.length=0;scene.world.rules.arenaRight=1480;scene.world.player.x=1370;scene.fixedUpdate(1/60,1);assert.equal(scene.waveBreakFrames,54,'Fast arrival duration must remain 54 ticks');
 const duration=scene.waveBreakFrames,alphas=[];for(let elapsed=0;elapsed<duration;elapsed++){scene.waveBreakFrames=duration-elapsed;const paints=[],ctx={fillStyle:'',fillRect(){},fillText(text){if(text.startsWith('AREA '))paints.push(Number(this.fillStyle.match(/,([^,]+)\)$/)[1]));}};scene.drawWaveCard(ctx);assert.equal(paints.length,1);const alpha=paints[0];assert(Number.isFinite(alpha)&&alpha>=0&&alpha<=.86);alphas.push(alpha);samples++;}
 assert.equal(alphas[0],0,character.id+'/'+stage+' arrival card must fade in from transparent');assert(alphas[1]>0&&alphas[1]<.1,'First tick must appear gradually');assert(Math.max(...alphas)>.85);
 assert(alphas[36]>.7,'The arrival card must remain readable when the combat lock still has 18 ticks left');
 assert(alphas.slice(1).every(alpha=>alpha>.04),'There must be no transparent tail while combat is locked');
 assert(alphas.at(-1)<.1,'The card should disappear gradually before fighting resumes');
 for(let i=1;i<=18;i++)assert(alphas[i]>=alphas[i-1]);for(let i=19;i<alphas.length;i++)assert(alphas[i]<=alphas[i-1]);
 scene.waveBreakFrames=0;let painted=false;scene.drawWaveCard({fillRect(){painted=true;},fillText(){painted=true;}});assert.equal(painted,false);scene.destroy();cases++;
}
console.log(JSON.stringify({passed:true,cases,samples,roster:8,stages:5,arrivalFrames:54,fadeInFromZero:true,visibleUntilCombat:true}));

let compactCases=0;
for(let stage=1;stage<=5;stage++){
 const character=CHARACTERS[0],scene=new Stage1Scene(input,audio,character,character.superArts[0],stage);
 for(const wave of [1,2]){
  scene.beltWave=wave;scene.waveBreakFrames=18;
  const fills=[],lines=[];
  const ctx={fillRect(x,y,w,h){fills.push({x,y,w,h});},fillText(text,x,y,width){lines.push({text,x,y,width,font:this.font});}};
  scene.drawWaveCard(ctx,true);
  const [panel]=fills;
  assert(panel&&panel.x>=526&&panel.x+panel.w<=1005&&panel.y>60&&panel.y+panel.h<=136,
   'Compact wave card must clear the health panels, timer and START');
  assert.equal(lines[0]?.text,`AREA ${wave+1} / 3`);
  assert(lines.length>=2&&lines.length<=3);
  assert(lines.slice(1).every(line=>!line.text.includes('•')&&line.font.includes('22px')&&line.width<panel.w
   &&line.y>panel.y&&line.y<panel.y+panel.h),'Compact card must give the tactical cue room to breathe');
  compactCases++;
 }
 scene.destroy();
}
console.log('COMPACT_WAVE_CARD_PASS',{compactCases});
