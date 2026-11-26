import assert from 'node:assert/strict';
import {AudioManager} from '../dist/assets/core/AudioManager.js';
import {SceneManager} from '../dist/assets/core/SceneManager.js';
import {CharacterSelectScene} from '../dist/assets/scenes/CharacterSelectScene.js';
import {SuperArtSelectScene} from '../dist/assets/scenes/SuperArtSelectScene.js';
import {getCharacter} from '../dist/assets/game/characters.js';
const flush=async()=>{for(let n=0;n<12;n++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture(){const requests=[],starts=[],decodes=[];globalThis.fetch=url=>{const gate=deferred();requests.push({url,gate});return gate.promise;};const audio=new AudioManager();audio.context={currentTime:1,decodeAudioData:async bytes=>{decodes.push(bytes);return{bytes};},createBufferSource(){const node={connect(){},start(){starts.push(node);},stop(){},loop:false};return node;},createGain(){return{connect(){},gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}}};}};audio.master={};return{audio,requests,starts,decodes};}
const respond=r=>r.gate.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
let cases=0;
{
 const f=fixture();
 f.audio.startFrontendTheme('title');
 await flush();
 assert.equal(f.requests.length,1);
 f.requests[0].gate.resolve({ok:false});
 await flush();
 assert.equal(f.requests.length,2,'A failed title load should retry while the title still owns music');
 respond(f.requests[1]);
 await flush();
 assert.equal(f.audio.musicLoopKey,'title-theme');
 assert.equal(f.starts.length,1);
 cases++;
}
for(const leaveDuringFailure of [false,true]){
 const f=fixture();
 f.audio.startFrontendTheme('title');
 await flush();
 if(leaveDuringFailure)f.audio.stopFrontendTheme();
 f.requests[0].gate.resolve({ok:false});
 await flush();
 assert.equal(f.requests.length,leaveDuringFailure?1:2);
 if(!leaveDuringFailure){f.requests[1].gate.resolve({ok:false});await flush();}
 assert.equal(f.requests.length,leaveDuringFailure?1:2,'Retry must be bounded and canceled by a scene exit');
 assert.equal(f.starts.length,0);
 cases++;
}
for (const track of ['stage5-theme', 'final-boss-theme']) {
 const f=fixture();
 f.audio.startStageSoundscape(5);
 await flush();
 if (track==='final-boss-theme') {
  respond(f.requests[0]);
  await flush();
  f.audio.setStageIntensity('final');
  await flush();
 }
 const initial=f.requests.at(-1);
 const count=f.requests.length;
 assert(initial.url.endsWith('/'+track+'.ogg'));
 initial.gate.resolve({ok:false});
 await flush();
 assert.equal(f.requests.length,count+1,'A failed active battle track should retry: '+track);
 respond(f.requests.at(-1));
 await flush();
 assert.equal(f.audio.musicLoopKey,track);
 cases++;
}
for(const key of ['title-theme','select-theme','ending-theme','stage1-theme','stage5-theme','final-boss-theme']){
 const f=fixture(),play=f.audio.playMusicAssetLoop(key,'/'+key,.2);await flush();assert.equal(f.requests.length,1);if(key.startsWith('stage')||key==='final-boss-theme')f.audio.stopSoundscape();else f.audio.stopFrontendTheme();respond(f.requests[0]);await play;assert.equal(f.starts.length,0,'Stopped pending '+key+' cannot resurrect');cases++;
}
{
 const f=fixture(),a=f.audio.playMusicAssetLoop('select-theme','/select',.2);await flush();f.audio.stopFrontendTheme();const b=f.audio.playMusicAssetLoop('select-theme','/select',.3);await flush();assert.equal(f.requests.length,1,'Same in-flight asset must share fetch/decode');respond(f.requests[0]);await Promise.all([a,b]);assert.equal(f.decodes.length,1);assert.equal(f.starts.length,1,'Only latest same-key owner starts');assert.equal(f.audio.musicLoopKey,'select-theme');cases++;
}
{const f=fixture(),old=f.audio.playMusicAssetLoop('title-theme','/title',.2);await flush();const active=f.audio.playMusicAssetLoop('stage1-theme','/stage',.2);await flush();respond(f.requests[1]);await active;respond(f.requests[0]);await old;assert.equal(f.starts.length,1);assert.equal(f.audio.musicLoopKey,'stage1-theme');cases++;}
{
 const f=fixture();
 const bad=f.audio.playMusicAssetLoop('select-theme','/select',.2);
 await flush();
 f.requests[0].gate.resolve({ok:false});
 await flush();
 f.requests[1].gate.resolve({ok:false});
 await bad;
 const retry=f.audio.playMusicAssetLoop('select-theme','/select',.2);
 await flush();
 assert.equal(f.requests.length,3,'A new request can recover after both earlier attempts failed');
 respond(f.requests[2]);
 await retry;
 await f.audio.playMusicAssetLoop('select-theme','/select',.4);
 assert.equal(f.requests.length,3);
 assert.equal(f.starts.length,1,'Already playing track updates volume without restart');
 cases++;
}
{
 const f=fixture();
 f.audio.startStageSoundscape(5);
 await flush();
 respond(f.requests[0]);
 await flush();
 f.audio.setStageIntensity('final');
 await flush();
 f.requests[1].gate.resolve({ok:false});
 await flush();
 assert.equal(f.requests.length,3);
 f.audio.setStageIntensity('belt');
 respond(f.requests[2]);
 await flush();
 assert.equal(f.audio.musicLoopKey,'stage5-theme','A delayed boss retry cannot replace music after leaving the boss');
 assert.equal(f.starts.length,1);
 cases++;
}
for(const [first,next,stop]of [['select-theme','stage1-theme','stopFrontendTheme'],['stage1-theme','select-theme','stopSoundscape']]){
 const f=fixture(),a=f.audio.playMusicAssetLoop(first,'/'+first,.2);await flush();respond(f.requests[0]);await a;const b=f.audio.playMusicAssetLoop(next,'/'+next,.2);await flush();f.audio[stop]();respond(f.requests[1]);await b;assert.equal(f.audio.musicLoopKey,next,'Stopping old category must preserve next pending owner');assert.equal(f.starts.length,2);cases++;
}
{const f=fixture(),gate=deferred();f.audio.context.decodeAudioData=()=>gate.promise;const play=f.audio.playMusicAssetLoop('title-theme','/title',.2);await flush();respond(f.requests[0]);await flush();f.audio.stopFrontendTheme();gate.resolve({});await play;assert.equal(f.starts.length,0,'Stopping during decode invalidates owner');cases++;}
for(const level of ['belt','duel'])for(const baseReady of [false,true])for(const finalFirst of [false,true]){
 const f=fixture();f.audio.currentStageId=5;f.audio.ambienceGain=f.audio.context.createGain();const base=f.audio.playMusicAssetLoop('stage5-theme','/stage5',.26);await flush();if(baseReady){respond(f.requests[0]);await base;}
 f.audio.setStageIntensity('final');await flush();assert.equal(f.requests.length,2);f.audio.setStageIntensity(level);await flush();assert.equal(f.audio.desiredMusicLoopKey,'stage5-theme','Leaving final must replace even a pending boss theme');
 if(finalFirst){respond(f.requests[1]);await flush();if(!baseReady)respond(f.requests[0]);}else{if(!baseReady)respond(f.requests[0]);await flush();respond(f.requests[1]);}await base;await flush();assert.equal(f.audio.musicLoopKey,'stage5-theme','Late final load cannot take over victory/belt music');assert.equal(f.starts.length,1,'Retain existing stage5 track or start it once');assert.equal(f.requests.length,2,'Stage5 pending/cache is reused');cases++;
}
{
 const f=fixture(),manager=new SceneManager(),ryu=getCharacter('RYU');
 const characters=()=>new CharacterSelectScene({},f.audio,ryu.id,()=>{});
 await manager.setScene(characters());
 await flush();
 respond(f.requests[0]);
 await flush();
 const source=f.audio.musicLoopSource;
 assert(source,'Character selection must start music');
 await manager.setScene(new SuperArtSelectScene({},f.audio,ryu,1,()=>{},()=>{}));
 await flush();
 assert.equal(f.audio.musicLoopSource,source,'Super Art selection must keep the playing track');
 await manager.setScene(characters());
 await flush();
 assert.equal(f.audio.musicLoopSource,source,'Going back must keep the same playing track');
 assert.equal(f.requests.length,1);
 assert.equal(f.starts.length,1);
 await manager.setScene({enter(){},exit(){},resize(){},destroy(){}});
 assert.equal(f.audio.musicLoopKey,null,'Leaving selection must release the shared track');
 cases++;

 await manager.setScene(characters());
 await flush();
 const failing=new SuperArtSelectScene({},f.audio,ryu,1,()=>{},()=>{});
 failing.enter=()=>{throw Error('Selection failed to enter');};
 await assert.rejects(manager.setScene(failing),/Selection failed to enter/);
 assert.equal(f.audio.musicLoopKey,null,'A failed selection handoff must release the shared track');
 cases++;
}
console.log(JSON.stringify({ok:true,cases,checks:['stopped pending theme cannot resurrect','same-key pending load shared','latest owner only','different track stays current','failure retry','cache and active volume reuse','selection music continuity']}));
