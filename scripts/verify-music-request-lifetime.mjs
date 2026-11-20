import assert from 'node:assert/strict';
import {AudioManager} from '../dist/assets/core/AudioManager.js';
const flush=async()=>{for(let n=0;n<12;n++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture(){const requests=[],starts=[],decodes=[];globalThis.fetch=url=>{const gate=deferred();requests.push({url,gate});return gate.promise;};const audio=new AudioManager();audio.context={currentTime:1,decodeAudioData:async bytes=>{decodes.push(bytes);return{bytes};},createBufferSource(){const node={connect(){},start(){starts.push(node);},stop(){},loop:false};return node;},createGain(){return{connect(){},gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}}};}};audio.master={};return{audio,requests,starts,decodes};}
const respond=r=>r.gate.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
let cases=0;
for(const key of ['title-theme','select-theme','ending-theme','stage1-theme','stage5-theme','final-boss-theme']){
 const f=fixture(),play=f.audio.playMusicAssetLoop(key,'/'+key,.2);await flush();assert.equal(f.requests.length,1);if(key.startsWith('stage')||key==='final-boss-theme')f.audio.stopSoundscape();else f.audio.stopFrontendTheme();respond(f.requests[0]);await play;assert.equal(f.starts.length,0,'Stopped pending '+key+' cannot resurrect');cases++;
}
{
 const f=fixture(),a=f.audio.playMusicAssetLoop('select-theme','/select',.2);await flush();f.audio.stopFrontendTheme();const b=f.audio.playMusicAssetLoop('select-theme','/select',.3);await flush();assert.equal(f.requests.length,1,'Same in-flight asset must share fetch/decode');respond(f.requests[0]);await Promise.all([a,b]);assert.equal(f.decodes.length,1);assert.equal(f.starts.length,1,'Only latest same-key owner starts');assert.equal(f.audio.musicLoopKey,'select-theme');cases++;
}
{const f=fixture(),old=f.audio.playMusicAssetLoop('title-theme','/title',.2);await flush();const active=f.audio.playMusicAssetLoop('stage1-theme','/stage',.2);await flush();respond(f.requests[1]);await active;respond(f.requests[0]);await old;assert.equal(f.starts.length,1);assert.equal(f.audio.musicLoopKey,'stage1-theme');cases++;}
{const f=fixture(),bad=f.audio.playMusicAssetLoop('select-theme','/select',.2);await flush();f.requests[0].gate.resolve({ok:false});await bad;const retry=f.audio.playMusicAssetLoop('select-theme','/select',.2);await flush();assert.equal(f.requests.length,2,'Failed load can retry');respond(f.requests[1]);await retry;assert.equal(f.starts.length,1);const cached=f.audio.playMusicAssetLoop('select-theme','/select',.4);await cached;assert.equal(f.requests.length,2);assert.equal(f.starts.length,1,'Already playing track updates volume without restart');cases++;}
for(const [first,next,stop]of [['select-theme','stage1-theme','stopFrontendTheme'],['stage1-theme','select-theme','stopSoundscape']]){
 const f=fixture(),a=f.audio.playMusicAssetLoop(first,'/'+first,.2);await flush();respond(f.requests[0]);await a;const b=f.audio.playMusicAssetLoop(next,'/'+next,.2);await flush();f.audio[stop]();respond(f.requests[1]);await b;assert.equal(f.audio.musicLoopKey,next,'Stopping old category must preserve next pending owner');assert.equal(f.starts.length,2);cases++;
}
{const f=fixture(),gate=deferred();f.audio.context.decodeAudioData=()=>gate.promise;const play=f.audio.playMusicAssetLoop('title-theme','/title',.2);await flush();respond(f.requests[0]);await flush();f.audio.stopFrontendTheme();gate.resolve({});await play;assert.equal(f.starts.length,0,'Stopping during decode invalidates owner');cases++;}
for(const level of ['belt','duel'])for(const baseReady of [false,true])for(const finalFirst of [false,true]){
 const f=fixture();f.audio.currentStageId=5;f.audio.ambienceGain=f.audio.context.createGain();const base=f.audio.playMusicAssetLoop('stage5-theme','/stage5',.26);await flush();if(baseReady){respond(f.requests[0]);await base;}
 f.audio.setStageIntensity('final');await flush();assert.equal(f.requests.length,2);f.audio.setStageIntensity(level);await flush();assert.equal(f.audio.desiredMusicLoopKey,'stage5-theme','Leaving final must replace even a pending boss theme');
 if(finalFirst){respond(f.requests[1]);await flush();if(!baseReady)respond(f.requests[0]);}else{if(!baseReady)respond(f.requests[0]);await flush();respond(f.requests[1]);}await base;await flush();assert.equal(f.audio.musicLoopKey,'stage5-theme','Late final load cannot take over victory/belt music');assert.equal(f.starts.length,1,'Retain existing stage5 track or start it once');assert.equal(f.requests.length,2,'Stage5 pending/cache is reused');cases++;
}
console.log(JSON.stringify({ok:true,cases,checks:['stopped pending theme cannot resurrect','same-key pending load shared','latest owner only','different track stays current','failure retry','cache and active volume reuse']}));
