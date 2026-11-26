// V081: duels are best-of-3; fixtures start in the FINAL ROUND (1-1) so one KO decides the match.
import assert from 'node:assert/strict';import{InputManager}from'../dist/assets/input/InputManager.js';import{Stage1Scene}from'../dist/assets/scenes/Stage1Scene.js';import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';import{normalFor}from'../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS];globalThis.window=new EventTarget();globalThis.document=new EventTarget();let pad;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[pad]:[]}});const audio={playStagePulse(){},playHit(){},playParry(){}};const flush=async()=>{for(let n=0;n<5;n++)await Promise.resolve();};function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{code:{value:code},repeat:{value:false}});window.dispatchEvent(e);}const codes={start:'KeyP',lp:'KeyJ',lk:'KeyU'},buttons={start:9,lp:0,lk:2};
function fixture(c,stage,reason,onDefeat){pad={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};const input=new InputManager();let calls=0;const s=new Stage1Scene(input,audio,c,c.superArts[0],stage,undefined,()=>{calls++;return onDefeat?.();});s.enter();s.prepareDuel();s.phase='duel';s.playerRoundWins=s.enemyRoundWins=1;s.introFrames=0;for(const e of s.world.enemies)e.aiCooldown=10000;if(reason==='time-over')s.stageTime=.001;else{const e=s.world.enemy;s.world.player.receiveHit({...normalFor('hp',false,e.character.id),damage:99999},e,false);if(reason==='double-ko')e.receiveHit({...normalFor('hp',false,c.id),damage:99999},s.world.player,false);}let tick=100;const step=()=>{input.prepareTick();s.fixedUpdate(1/60,tick++);input.endTick();};step();assert.equal(s.phase,'defeat');const tap=(a,source)=>{if(source==='touch'){input.setTouch(a,true);input.setTouch(a,false);}else if(source==='keyboard'){key('keydown',codes[a]);key('keyup',codes[a]);}else pad.buttons[buttons[a]].pressed=true;};return{s,input,step,tap,calls:()=>calls,releasePad(){for(const b of pad.buttons)b.pressed=false;},close(){s.exit();s.destroy();input.destroy();pad=null;}};}let cases=0,controls=0;
for(const c of roster)for(const stage of[1,5])for(const reason of['ko','double-ko','time-over'])for(const source of['touch','keyboard','gamepad'])for(const action of['start','lp','lk'])for(const when of['early','last']){const t=fixture(c,stage,reason),delay=t.s.defeatFrames,f=t.s.world.player,stats=[f.hp,f.superGauge,t.s.world.time,t.s.elapsedCombatFrames];for(let n=0;n<delay;n++){if(n===(when==='early'?0:delay-1))t.tap(action,source);t.step();t.releasePad();assert.equal(t.calls(),0,'KO presentation must not be truncated');}assert.equal(t.s.defeatFrames,0);t.step();assert.equal(t.calls(),1,c.id+'/'+stage+'/'+reason+'/'+source+'/'+action+'/'+when+' early retry must dispatch without a second tap');for(let n=0;n<6;n++)t.step();assert.equal(t.calls(),1,'Queued retry dispatches once');assert.deepEqual([f.hp,f.superGauge,t.s.world.time,t.s.elapsedCombatFrames],stats);t.close();cases++;}
{const t=fixture(roster[0],1,'ko');t.input.setTouch('lp',true);t.input.endTick();for(let n=0;n<121;n++)t.step();assert.equal(t.calls(),0,'Held pre-existing attack must not auto-retry');t.input.setTouch('lp',false);t.input.endTick();t.tap('lp','touch');t.step();assert.equal(t.calls(),1);t.close();controls++;}
{let reject;const t=fixture(roster[0],1,'ko',()=>new Promise((_,r)=>reject=r));t.tap('start','touch');t.step();while(t.s.defeatFrames>0)t.step();t.step();assert.equal(t.calls(),1);t.tap('lp','touch');t.step();reject(Error('quota'));await flush();assert.match(t.s.routeError,/RETRY/);for(let n=0;n<10;n++)t.step();assert.equal(t.calls(),1,'Failed queued request must not auto-retry');t.tap('start','touch');t.step();assert.equal(t.calls(),2);t.close();controls++;}
for(const end of['exit','destroy','reenter']){const t=fixture(roster[0],1,'ko');t.tap('start','touch');t.step();if(end==='reenter'){t.s.exit();t.s.enter();}else t.s[end]();for(let n=0;n<121;n++)t.step();assert.equal(t.calls(),0,'Lifecycle reset must discard queued retry');t.close();controls++;}
{const t=fixture(roster[0],1,'ko');t.tap('start','touch');t.step();const texts=[],styles=[],ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:k==='fillText'?(text)=>{texts.push(text);styles.push(o.fillStyle);}:()=>{}});t.s.drawDefeat(ctx);assert(texts.some(v=>v.includes('RETRY QUEUED')),'Queued tap must have visible feedback');assert(styles.some(v=>v==='rgba(241,189,81,1)'));t.close();controls++;}
console.log(JSON.stringify({passed:true,cases,controls,roster:10,stages:2,reasons:3,sources:3,buttons:3,earlyAndLastFrame:true,koDurationUnchanged:true,statsFrozen:true,retryFailureRequiresFreshPress:true}));

for (const boss of [false, true]) {
  const t = fixture(roster[0], 1, 'ko');
  if (boss) t.s.bossEntry = {phase: 'duel', hp: 361, gauge: 7, beltScore: 4650};
  const labels = [];
  const ctx = new Proxy({}, {get: (_, key) => key === 'fillText' ? text => labels.push(text) : () => {}});
  t.s.drawDefeat(ctx, true);
  assert(labels.includes(boss ? 'TAP START TO RETRY BOSS' : 'TAP START TO RETRY'));
  assert(!labels.some(label => label.includes('P / ENTER')));
  if (boss) {
    assert(labels.some(label=>label.includes('361 HP / 7 METER / 4650 SCORE')), 'Retry must preview the actual checkpoint values');
    labels.length = 0;
    t.s.drawDefeat(ctx, false);
    assert(labels.some(label=>label.includes('361 HP / 7 METER / 4650 SCORE')), 'The checkpoint preview must also be readable on desktop');
  }
  t.tap('start', 'touch');
  t.step();
  labels.length = 0;
  t.s.drawDefeat(ctx, true);
  assert(labels.includes('RETRY QUEUED'));
  t.close();
}
console.log('TOUCH_DEFEAT_ACTION_PASS');
