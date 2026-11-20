import assert from 'node:assert/strict';
import {AudioManager} from '../dist/assets/core/AudioManager.js';
const requests=[],starts=[],oscillators=[];
class Param {value=0;setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node {gain=new Param();frequency=new Param();Q=new Param();playbackRate=new Param();connect(){}disconnect(){}start(){starts.push(this);}stop(){this.stopped=true;this.onended?.();}}
class Context {state='running';currentTime=0;sampleRate=44100;destination={};createGain(){return new Node();}createBufferSource(){return new Node();}createOscillator(){const n=new Node();oscillators.push(n);return n;}createBiquadFilter(){return new Node();}createBuffer(c,n){return{getChannelData:()=>new Float32Array(n)};}decodeAudioData(){return Promise.resolve({duration:.2});}suspend(){this.state='suspended';return Promise.resolve();}resume(){this.state='running';return Promise.resolve();}}
globalThis.AudioContext=Context;globalThis.fetch=async url=>{requests.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
const a=new AudioManager();await a.unlock();a.startFrontendTheme('title');await new Promise(setImmediate);
assert.equal(oscillators.length,0,'Produced music must not be masked by continuously running oscillator pads');
assert(requests.includes('/audio/score-v2/title-theme.ogg'));
a.startStageSoundscape(1);await new Promise(setImmediate);a.playStageBeat(1,0);assert.equal(oscillators.length,0,'Recorded battle music owns rhythm; no unrelated electronic beat overlay');
const beforeRequests=requests.length,before=starts.length;for(let n=0;n<20;n++)a.playHit(100);assert(starts.length>before,'Ready physical impacts must play synchronously');assert.equal(requests.length,beforeRequests,'Combat hits cannot fetch or decode on the input path');assert.equal(oscillators.length,0,'Produced impacts cannot fall through to legacy electronic chirps');
assert(a.sampledSfx.activeVoiceCount<=8,'Rapid hits must respect effect polyphony');const count=starts.length;a.setPaused(true);await new Promise(setImmediate);a.playHit(100);assert.equal(starts.length,count,'Paused sound events must not queue late playback');a.setPaused(false);await new Promise(setImmediate);a.playHit(100);assert.equal(starts.length,count+1,'Fresh hit resumes immediately');
for(let n=1;n<=5;n++)await a.playMusicAssetLoop('stage'+n+'-theme','/audio/score-v2/stage'+n+'-theme.ogg',.8);assert(a.musicBufferCache.size<=3,'Full campaign cannot retain all decoded long tracks');
a.stopSoundscape();a.stopFrontendTheme();console.log('PRODUCED_AUDIO_PASS',{sampleRequests:beforeRequests,synchronousHits:20,oscillators:oscillators.length,cache:a.musicBufferCache.size});

import {SampledSfxBank} from '../dist/assets/core/SampledSfxBank.js';
let firstVariantFails=true;const variantRequests=[];globalThis.fetch=async url=>{variantRequests.push(url);return{ok:!(firstVariantFails&&url.endsWith('/hit-heavy-0.ogg')),arrayBuffer:async()=>new ArrayBuffer(8)};};const bank=new SampledSfxBank(new Context(),{});await bank.preload();assert(bank.play('hit-heavy'),'One failed variant must not silence the other decoded physical impacts');assert(bank.play('hit-heavy'));firstVariantFails=false;await bank.preload();assert.equal(variantRequests.filter(u=>u.endsWith('/hit-heavy-0.ogg')).length,2,'Explicit preload can recover a failed sample');assert.equal(variantRequests.filter(u=>u.endsWith('/hit-heavy-1.ogg')).length,1,'Already decoded variants cannot be fetched again');console.log('PRODUCED_AUDIO_PARTIAL_FAILURE_PASS');

import {ASSET_GROUPS} from '../dist/assets/core/AssetManager.js';
import {PRODUCED_SFX_ASSETS} from '../dist/assets/core/SampledSfxBank.js';
import {readFileSync} from 'node:fs';
const grouped=new Set(Object.values(ASSET_GROUPS).flat()),worker=readFileSync('public/sw.js','utf8');
for(const url of PRODUCED_SFX_ASSETS){assert(grouped.has(url),'Offline preparation must include '+url);assert(worker.includes(url),'Worker shell must include small combat samples '+url);}
for(const key of ['title','select','ending','stage1','stage2','stage3','stage4','stage5','final-boss'])assert(grouped.has('/audio/score-v2/'+key+'-theme.ogg'),'Offline preparation must include produced score '+key);
console.log('PRODUCED_AUDIO_OFFLINE_ASSETS_PASS',{effects:PRODUCED_SFX_ASSETS.length,scores:9});
