import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {SceneManager} from '../dist/assets/core/SceneManager.js';
import {TitleScene} from '../dist/assets/scenes/TitleScene.js';
import {CharacterSelectScene} from '../dist/assets/scenes/CharacterSelectScene.js';
import {SuperArtSelectScene} from '../dist/assets/scenes/SuperArtSelectScene.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {StageSelectScene} from '../dist/assets/scenes/StageSelectScene.js';
const input={},ken=CHARACTERS.find(c=>c.id==='KEN');
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function audioFixture(){const requests=[],starts=[];let soundscape=false;return {requests,starts,get soundscape(){return soundscape;},unlock(){return new Promise((resolve,reject)=>requests.push({resolve,reject}));},startFrontendTheme(mode){soundscape=false;starts.push(mode);},stopFrontendTheme(){},startStageSoundscape(){soundscape=true;},stopSoundscape(){soundscape=false;},playStagePulse(){}};}
const factories=[['title',audio=>new TitleScene(input,audio,[])],['select',audio=>new CharacterSelectScene(input,audio,'KEN',()=>{})],['select',audio=>new SuperArtSelectScene(input,audio,ken,1,()=>{},()=>{})],['select',audio=>new StageSelectScene(input,audio,1,()=>{},()=>{})]];
let cases=0;
for(const [mode,make]of factories){
 {
  const audio=audioFixture(),scenes=new SceneManager();await scenes.setScene(make(audio));assert.equal(audio.requests.length,1,'Active menu entry must request audio unlock');
  await scenes.setScene(new Stage1Scene(input,audio,ken,ken.superArts[0]));assert(audio.soundscape);
  audio.requests[0].resolve();await flush();
  assert.deepEqual(audio.starts,[],'Exited '+mode+' unlock must not restart stale menu theme');
  assert(audio.soundscape,'Late menu request must not stop active stage soundscape');cases++;
 }
 {
  const audio=audioFixture(),scene=make(audio);scene.enter();scene.destroy();audio.requests[0].resolve();await flush();assert.deepEqual(audio.starts,[],'Destroy invalidates pending unlock');cases++;
 }
 for(const latestFirst of [false,true]){
  const audio=audioFixture(),scene=make(audio);scene.enter();scene.exit();scene.enter();
  const order=latestFirst?[1,0]:[0,1];
  audio.requests[order[0]].resolve();await flush();assert.deepEqual(audio.starts,latestFirst?[mode]:[],'Only latest entry may start theme');
  audio.requests[order[1]].resolve();await flush();assert.deepEqual(audio.starts,[mode],'Reentry theme starts exactly once');scene.exit();cases++;
 }
 {
  const audio=audioFixture(),scene=make(audio);scene.enter();audio.requests[0].resolve();await flush();assert.deepEqual(audio.starts,[mode],'Active entry starts expected theme');scene.exit();cases++;
 }
 {
  const audio=audioFixture(),scene=make(audio);scene.enter();audio.requests[0].reject(new Error('Audio resume rejected'));await flush();assert.deepEqual(audio.starts,[]);scene.exit();scene.enter();audio.requests[1].resolve();await flush();assert.deepEqual(audio.starts,[mode],'New entry recovers after unlock rejection');scene.exit();cases++;
 }
}
console.log('MENU_AUDIO_LIFETIME_PASS',{scenes:factories.length,cases,actualStageTransitions:factories.length,destroyInvalidates:true,reentryOrders:2,activeThemeOnce:true,rejectionRecovery:true});
