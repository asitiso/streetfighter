import assert from 'node:assert/strict';
import {AudioManager} from '../dist/assets/core/AudioManager.js';
const requests=[],starts=[],oscillators=[];
class Param {value=0;events=[];setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.value=v;this.events.push(['ramp',v,t]);}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}cancelScheduledValues(t){this.events.push(['cancel',t]);}}
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

const duckTest = new AudioManager();
await duckTest.unlock();
duckTest.startStageSoundscape(1);
const ctx = duckTest.context;
const duckGain = (duckTest.musicDuckBus ?? duckTest.musicBus).gain;
ctx.currentTime = 1;
duckTest.playHit(100);
ctx.currentTime = 1.02;
duckTest.playHit(100);
const continuation = duckGain.events.findLast(event => event[0] === 'set');
assert(continuation[1] < (duckTest.musicDuckBus ? 1 : .82), 'A repeated hit must continue from the active gain');
ctx.currentTime = 2;
duckTest.playSuperStart();
const superEvents = duckGain.events.length;
ctx.currentTime = 2.03;
duckTest.playHit(40);
assert.equal(duckGain.events.length, superEvents, 'A light hit cannot replace the stronger super dip');
duckTest.setStageIntensity('duel');
assert.equal(duckGain.events.length, superEvents, 'Music intensity and impact ducking have independent gains');
ctx.currentTime = 2.25;
duckTest.playHit(40);
assert.equal(duckGain.events.findLast(event => event[0] === 'set')[1], 1, 'A completed dip returns to the base level');
duckTest.stopSoundscape();
assert.equal(duckGain.events.findLast(event => event[0] === 'set')[1], 1, 'Stage exit resets the duck gain');
console.log('COMBAT_DUCK_CONTINUITY_PASS');

for (const destination of ['title','select','ending',2]) {
  const audio = new AudioManager();
  await audio.unlock();
  audio.startStageSoundscape(5);
  audio.setStageIntensity('final');
  audio.context.currentTime = .05;
  if (typeof destination === 'number') audio.startStageSoundscape(destination);
  else audio.startFrontendTheme(destination);
  const expected = typeof destination === 'number' ? [.86,.78,1] : [.82,.72,1];
  const gains = [audio.musicBus, audio.ambienceBus, audio.sfxBus].map(node => node.gain);
  assert.deepEqual(gains.map(gain=>gain.value), expected,'The destination must set its own base mix: '+destination);
  for (const [index,gain] of gains.entries()) {
    assert.deepEqual(gain.events.slice(-2),[['cancel',.05],['set',expected[index],.05]],'Old ramps must be canceled before setting the new gain');
  }
}
console.log('AUDIO_SCENE_MIX_RESET_PASS');

import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';

const mix = new AudioManager();
const superSamples = [];
mix.effect = (kind, volume, rate) => superSamples.push({ kind, volume, rate });
mix.playSuperImpact(70, 1, 3);
mix.playSuperImpact(70, 2, 3);
mix.playSuperImpact(80, 3, 3);
mix.playSuperImpact(80);
assert.deepEqual(superSamples.map(sample => sample.kind), ['hit-heavy', 'hit-heavy', 'super-impact', 'super-impact']);
assert(superSamples[0].volume < superSamples[1].volume && superSamples[1].volume < superSamples[2].volume);
assert(superSamples[2].rate < superSamples[1].rate);

const quiet = { held: () => false, pressed: () => false, released: () => false };
const heard = [];
const audio = {
  playStagePulse() {}, playParry() {},
  playHit(power) { heard.push({ kind: 'hit', power }); },
  playAirHit(power) { heard.push({ kind: 'air-hit', power }); },
  playSuperImpact(power, index, total) { heard.push({ kind: 'super-impact', power, index, total }); },
};
const ken = getCharacter('KEN');
const art = ken.superArts[0];
const scene = new Stage1Scene(quiet, audio, ken, art, 1);
scene.prepareDuel();
scene.phase = 'duel';
scene.introFrames = scene.roundStartBannerFrames = 0;
const { player, enemy } = scene.world;
enemy.updateAi = () => {};
enemy.updateAiDirected = () => {};
player.x = player.previousX = 500;
enemy.x = enemy.previousX = 570;
player.superGauge = art.gauge;
player.startMove(superArtMoveFor('KEN', art.id, art.gauge));
let tick = 0;
const contacts = new Set();
while (player.currentMove && tick < 100) {
  scene.fixedUpdate(1 / 60, ++tick);
  for (const event of scene.world.events) {
    if ((event.type === 'hit' || event.type === 'air-hit') && event.moveId === 'KEN_SA1') contacts.add(event);
  }
}
assert.equal(contacts.size, 3, 'All visual contact events are preserved');
assert(heard.every(cue => cue.kind === 'super-impact'), 'Super audio must not double each contact with a normal or juggle hit');
assert.deepEqual(heard.map(cue => [cue.index, cue.total]), [[1, 3], [2, 3], [3, 3]]);
assert(enemy.hp < 1000);
scene.exit();
console.log('SUPER_IMPACT_AUDIO_PASS', { contacts: contacts.size, cues: heard.length, distinctFinisher: true });

const beltCues = [];
const belt = new Stage1Scene(quiet, {
  playStagePulse() {}, playParry() {},
  playHit: power => beltCues.push(['impact', power]),
  playKo: () => beltCues.push(['ko']),
  playUiConfirm: () => beltCues.push(['pickup']),
  playThrowEscape: () => beltCues.push(['grab']),
}, ken, art, 1);
belt.introFrames = 0;
belt.world.events.push(...['ko', 'prop-break', 'wall-impact', 'enemy-collision', 'pickup', 'grab'].map(type =>
  ({ type, x: 500, y: 450, power: 60, ttl: 12 })));
belt.fixedUpdate(1 / 60, 1);
belt.fixedUpdate(1 / 60, 2);
assert.deepEqual(beltCues, [['ko'], ['impact', 90], ['impact', 90], ['impact', 90], ['pickup'], ['grab']],
  'KO, stage impacts, pickups and grabs each play their cue exactly once');
belt.exit();

const finalCues = [];
const finale = new Stage1Scene(quiet, {
  playStagePulse() {}, playHit() {}, playParry() {},
  playKo: () => finalCues.push('ko'),
  playFinalKo: () => finalCues.push('final-ko'),
}, ken, art, 5);
finale.prepareFinalDuel();
finale.phase = 'final-duel';
finale.introFrames = 0;
finale.playerRoundWins = 1;
finale.world.enemy.hp = 0;
finale.world.events.push({ type: 'ko', x: 500, y: 450, power: 999, ttl: 12 });
finale.fixedUpdate(1 / 60, 1);
assert.equal(finale.phase, 'final-ko');
assert.deepEqual(finalCues, ['final-ko'], 'The cinematic KO owns its cue on the last round');
finale.exit();

import {SampledSfxBank} from '../dist/assets/core/SampledSfxBank.js';
let firstVariantFails=true;const variantRequests=[];globalThis.fetch=async url=>{variantRequests.push(url);return{ok:!(firstVariantFails&&url.endsWith('/hit-heavy-0.ogg')),arrayBuffer:async()=>new ArrayBuffer(8)};};const bank=new SampledSfxBank(new Context(),{});await bank.preload();assert(bank.play('hit-heavy'),'One failed variant must not silence the other decoded physical impacts');assert(bank.play('hit-heavy'));firstVariantFails=false;await bank.preload();assert.equal(variantRequests.filter(u=>u.endsWith('/hit-heavy-0.ogg')).length,2,'Explicit preload can recover a failed sample');assert.equal(variantRequests.filter(u=>u.endsWith('/hit-heavy-1.ogg')).length,1,'Already decoded variants cannot be fetched again');console.log('PRODUCED_AUDIO_PARTIAL_FAILURE_PASS');

import {ASSET_GROUPS} from '../dist/assets/core/AssetManager.js';
import {PRODUCED_SFX_ASSETS} from '../dist/assets/core/SampledSfxBank.js';
import {readFileSync} from 'node:fs';
const grouped=new Set(Object.values(ASSET_GROUPS).flat()),worker=readFileSync('public/sw.js','utf8');
for(const url of PRODUCED_SFX_ASSETS){assert(grouped.has(url),'Offline preparation must include '+url);assert(worker.includes(url),'Worker shell must include small combat samples '+url);}
for(const key of ['title','select','ending','stage1','stage2','stage3','stage4','stage5','final-boss'])assert(grouped.has('/audio/score-v2/'+key+'-theme.ogg'),'Offline preparation must include produced score '+key);
console.log('PRODUCED_AUDIO_OFFLINE_ASSETS_PASS',{effects:PRODUCED_SFX_ASSETS.length,scores:9});
