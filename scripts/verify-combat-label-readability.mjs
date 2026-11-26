import assert from'node:assert/strict';import{Stage1Scene}from'../dist/assets/scenes/Stage1Scene.js';import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';import{normalFor}from'../dist/assets/combat/MoveLibrary.js';import{runtimeQuality}from'../dist/assets/core/RuntimeQuality.js';import{preloadArtAssets,unloadArtAsset}from'../dist/assets/render/ImageAssets.js';let loaded=true;globalThis.Image=class{complete=true;naturalWidth=1254;naturalHeight=1254;set src(v){this.url=v;if(v)(loaded?this.onload:this.onerror)?.();}get src(){return this.url;}};const quiet={held:()=>false,pressed:()=>false,released:()=>false},key='combat-impact-atlas';function context(){const text=[],paints=[],geometry=[];const ctx=new Proxy({globalAlpha:1,fillText:(t,x,y)=>text.push({text:t,x,y}),drawImage:(im,...args)=>paints.push({src:im.src,args}),fill:()=>geometry.push('fill'),stroke:()=>geometry.push('stroke'),fillRect:()=>geometry.push('rect'),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});return{ctx,text,paints,geometry};}let cases=0;for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const mode of['belt','duel'])for(const tier of['low','balanced','high'])for(const available of[true,false])for(const type of['command-hit','target-hit'])for(const side of['player','enemy']){loaded=available;unloadArtAsset(key);preloadArtAssets([key]);runtimeQuality.setTier(tier);const s=new Stage1Scene(quiet,{},c,c.superArts[0],1);s.phase=mode;s.world.rules.mode=mode;const move={...normalFor('mp',false,c.id),label:'READABLE MOVE'};s.world.player.startMove(move);s.world.playerComboHits=3;s.world.playerComboDamage=120;s.world.playerComboTimer=60;s.world.events.splice(0,s.world.events.length,...[0,1,2].map(n=>({type,x:500+n*12,y:400,power:92,ttl:16-n*3,label:'READABLE MOVE',attackerSide:side,moveId:'FIXTURE',audioPlayed:false})));const before=JSON.stringify(s.world.events),world=context();s.drawFx(world.ctx);assert(!world.text.some(t=>t.text==='READABLE MOVE'),'Move labels must not obscure bodies: '+c.id+'/'+type+'/'+side+'/'+available);assert(available?world.paints.length===3:world.geometry.length>0,'Impact feedback remains visible');assert.equal(JSON.stringify(s.world.events),before,'Rendering must preserve events, audio labels and TTL');const hud=context();s.drawHudPortrait=()=>{};s.drawHud(hud.ctx);assert.equal(hud.text.filter(t=>t.text==='READABLE MOVE').length,1,'Current move stays once in HUD');assert(hud.text.some(t=>t.text==='READABLE MOVE'&&t.x===640&&t.y===139));assert(hud.text.some(t=>t.text==='3 HIT'));assert(hud.text.some(t=>t.text==='120 DAMAGE'));cases++;}
let critical=0;loaded=true;unloadArtAsset(key);preloadArtAssets([key]);for(const tier of['low','balanced','high'])for(const[type,want]of[['counter','COUNTER!'],['throw-escape','THROW ESCAPE!'],['boss-warning','DANGER'],['boss-burst','BURST'],['juggle','JUGGLE'],['wall-bounce','WALL BOUNCE'],['ground-bounce','GROUND BOUNCE'],['ko','K.O.']]){runtimeQuality.setTier(tier);const c=CHARACTERS[0],s=new Stage1Scene(quiet,{},c,c.superArts[0],1);s.world.events.splice(0,s.world.events.length,{type,x:500,y:400,power:100,ttl:16,label:type==='super-impact'?want:type.startsWith('boss-')?want:undefined});const r=context();s.drawFx(r.ctx);assert(r.text.some(t=>t.text===want),'Critical combat outcome stays visible '+type);critical++;}for(const type of['parry','red-parry','hit','air-hit','block']){const c=CHARACTERS[0],s=new Stage1Scene(quiet,{},c,c.superArts[0],1);s.world.events.push({type,x:500,y:400,power:92,ttl:16});const r=context();s.drawFx(r.ctx);assert(r.paints.length>0||r.geometry.length>0,'Other impact feedback stays visible '+type);}console.log('COMBAT_LABEL_READABILITY_PASS',{cases,characters:10,qualityTiers:3,critical,otherImpacts:5});

// Ordinary belt KOs belong to the victim's world position, including after scrolling.
let localKoCases = 0;
function koContext() {
  const text = [], rects = [], points = [], arcs = [];
  const ctx = new Proxy({
    fillText(t,x,y) { text.push({text:t,x,y,font:this.font}); },
    strokeText() {}, fillRect(...args) { rects.push(args); },
    moveTo(x,y) { points.push([x,y]); }, lineTo(x,y) { points.push([x,y]); },
    arc(x,y,r) { arcs.push({x,y,r}); }
  }, {get:(o,k)=>k in o?o[k]:(()=>{})});
  return {ctx,text,rects,points,arcs};
}
for (const tier of ['low','balanced','high']) for (const x of [500,1800,3000]) for (const ttl of [90,45,1]) {
  runtimeQuality.setTier(tier);
  const c=CHARACTERS[0], s=new Stage1Scene(quiet,{},c,c.superArts[0],1);
  s.world.rules.mode='belt'; s.world.player.hp=1000;
  const event={type:'ko',x,y:370,power:999,ttl,audioPlayed:true};
  s.world.events.splice(0,s.world.events.length,event);
  const before=JSON.stringify(s.world.events), r=koContext(); s.drawFx(r.ctx);
  const label=r.text.find(t=>t.text==='K.O.');
  assert(label && label.x===x && Math.abs(label.y-event.y)<=40, 'Mob KO must follow victim '+x+'/'+ttl);
  assert(!label.font.includes('108px'),'Ordinary KO must stay compact');
  assert(!r.text.some(t=>t.text==='FINAL HIT'),'Ordinary KO is not a match result');
  assert.equal(r.rects.length,0,'Ordinary KO must not wash the full scrolling viewport');
  assert(r.points.every(([px,py])=>Math.abs(px-x)<=80&&Math.abs(py-event.y)<=80),'KO streaks stay local');
  assert(r.arcs.every(a=>Math.abs(a.x-x)<=1&&Math.abs(a.y-event.y)<=1&&a.r<=80),'KO ring stays local');
  assert.equal(JSON.stringify(s.world.events),before,'KO drawing preserves combat TTL and audio state');
  localKoCases++;
}
for (const [mode,hp] of [['belt',0],['duel',1000],['duel',0]]) {
  const c=CHARACTERS[0], s=new Stage1Scene(quiet,{},c,c.superArts[0],1);
  s.world.rules.mode=mode; s.world.player.hp=hp;
  s.world.events.splice(0,s.world.events.length,{type:'ko',x:1800,y:370,power:999,ttl:90});
  const r=koContext(); s.drawFx(r.ctx);
  assert(r.text.some(t=>t.text==='K.O.'&&t.x===640&&t.font.includes('108px')),'Match/defeat KO presentation stays intact');
  assert(r.text.some(t=>t.text==='FINAL HIT'));
}
console.log('LOCAL_KO_PRESENTATION_PASS',{localKoCases,matchResults:3});

// Defeat already owns a screen-space result; the world FX must not draw a second one.
let defeatKoCases = 0;
for (const mode of ['belt','duel']) for (const reason of ['ko','double-ko','time-over']) for (const x of [500,1800,3000]) {
  const c=CHARACTERS[0], s=new Stage1Scene(quiet,{},c,c.superArts[0],1);
  s.phase='defeat'; s.defeatReason=reason; s.defeatFrames=reason==='time-over'?42:72;
  s.world.rules.mode=mode; s.world.player.hp=0;
  s.world.events.splice(0,s.world.events.length,{type:'ko',x,y:370,power:999,ttl:42,audioPlayed:true});
  const before=JSON.stringify(s.world.events), world=koContext(); s.drawFx(world.ctx);
  assert(!world.text.some(t=>t.text==='K.O.'||t.text==='FINAL HIT'),'Defeat must not duplicate the result in scrolling world space');
  assert.equal(world.rects.length,0,'Defeat world FX must not add a misplaced full-screen flash');
  assert.equal(JSON.stringify(s.world.events),before,'Defeat rendering preserves KO event lifetime/audio');
  const screen=koContext(); s.drawDefeat(screen.ctx);
  const title=reason==='double-ko'?'DOUBLE K.O.':reason==='time-over'?'TIME OVER':'K.O.';
  assert.equal(screen.text.filter(t=>t.text===title&&t.x===640&&t.y===350).length,1,'Defeat owns exactly one centered result');
  defeatKoCases++;
}
console.log('DEFEAT_KO_OWNERSHIP_PASS',{defeatKoCases});

let gillReadabilityCases=0;
for(const tier of ['low','balanced','high'])for(const phase of [1,2,3])for(const frozen of [false,true]){
 runtimeQuality.setTier(tier);
 const c=CHARACTERS[0],s=new Stage1Scene(quiet,{},c,c.superArts[0],5);s.prepareFinalDuel();s.phase='final-duel';s.gillPhase=phase;s.gillPhaseBanner=phase===1?90:phase===2?125:150;s.world.superFreezeFrames=frozen?18:0;
 let portraits=0;s.drawBossCinematicPortrait=()=>{portraits++;};
 const before=JSON.stringify({hp:s.world.enemy.hp,freeze:s.world.superFreezeFrames,banner:s.gillPhaseBanner,time:s.world.time}),r=koContext();s.drawGillPhaseOverlay(r.ctx);
 assert(r.text.some(t=>t.text.startsWith('FINAL BOSS • PHASE '+phase)),'Persistent phase/HP cue remains');
 if(frozen){assert(r.rects.some(([x,y,w,h])=>w===1280&&h>=300));assert.equal(portraits,phase>=2?1:0,'Frozen phase cinematic remains');}
 else{
  assert(!r.rects.some(([x,y,w,h])=>w>=1000&&h>=200),'Active combat cannot have arena-sized phase veil');
  assert.equal(portraits,0,'Active combat cannot have a giant foreground boss portrait');
  const message=phase===1?'THE FINAL DUEL BEGINS':phase===2?'ATTACK TEMPO INCREASED • SUPER READY':'MAXIMUM PRESSURE • SUPER FREQUENCY UP';
  assert(r.text.some(t=>t.text===message&&t.x===640&&t.y<210),'Active phase warning stays above actors');
 }
 assert.equal(JSON.stringify({hp:s.world.enemy.hp,freeze:s.world.superFreezeFrames,banner:s.gillPhaseBanner,time:s.world.time}),before,'Presentation cannot change combat timing');
 gillReadabilityCases++;
}
console.log('GILL_PHASE_READABILITY_PASS',{gillReadabilityCases});


let superFxCases = 0;
for (const tier of ['low', 'balanced', 'high']) {
  runtimeQuality.setTier(tier);
  const c = CHARACTERS[0], s = new Stage1Scene(quiet, {}, c, c.superArts[0], 1);
  s.phase = 'duel';
  const flash = { type: 'super-flash', x: 500, y: 405, power: 260, ttl: 32, label: 'SUPER NAME', color: '#ffe080', style: 'uppercut' };
  const first = { type: 'super-impact', x: 530, y: 390, power: 70, ttl: 34, hitIndex: 1, hitTotal: 3, label: flash.label };
  const last = { ...first, hitIndex: 3 };
  const normal = { ...first, type: 'hit', ttl: 16, superContact: true };
  s.world.events.splice(0, s.world.events.length, flash);
  s.world.superFreezeFrames = 5;
  const startup = context();
  s.drawSuperOverlay(startup.ctx, 0);
  assert(startup.geometry.length > 0, 'Startup still has a readable cue');
  s.world.superFreezeFrames = 0;
  const active = context();
  s.drawSuperOverlay(active.ctx, 0);
  assert.equal(active.geometry.length, 0, 'The startup flash must end before active combat');
  const hud = context();
  s.drawHudPortrait = () => {};
  s.drawHud(hud.ctx);
  assert.equal(hud.text.filter(t => t.text === flash.label && t.y < 155).length, 1, 'The super name belongs in the HUD');

  function renderEvents(events) {
    s.world.events.splice(0, s.world.events.length, ...events);
    const before = JSON.stringify(s.world.events), r = context();
    s.drawFx(r.ctx);
    assert.equal(JSON.stringify(s.world.events), before, 'The renderer cannot mutate combat events');
    return r;
  }
  const fresh = renderEvents([first]);
  assert(fresh.geometry.length > 0, 'The intermediate hit still has a local spark');
  assert.equal(fresh.text.length, 0, 'No duplicate move names over fighters');
  const overlap = renderEvents([flash, { ...first, ttl: 23 }, normal, last]);
  const finisher = renderEvents([last]);
  assert.deepEqual(overlap.geometry, finisher.geometry, 'Spent sparks, startup and generic hit cannot stack with the finisher');
  assert.deepEqual(overlap.paints, finisher.paints, 'No underlying generic hit atlas spark');
  assert(finisher.geometry.length > fresh.geometry.length, 'The finisher is stronger than intermediate hits');
  s.world.events.splice(0, s.world.events.length, { ...last, ttl: 23 });
  const screen = context();
  s.drawImpactFrameOverlay(screen.ctx);
  assert.equal(screen.geometry.length, 0, 'No sustained screen veil after super contact');
  superFxCases++;
}
console.log('SUPER_FX_READABILITY_PASS', { superFxCases });

{
 const {specialMovesFor}=await import('../dist/assets/combat/MoveLibrary.js');
 const c=CHARACTERS[0],scene=new Stage1Scene(quiet,{},c,c.superArts[0],4);
 scene.prepareDuel();scene.phase='duel';
 const {player,enemy}=scene.world;
 const read=compact=>{
  const rec=context(),panels=[];
  rec.ctx.roundRect=(x,y,w,h)=>panels.push({x,y,w,h});
  scene.drawHud(rec.ctx,compact);
  scene.drawLondonPatternGuide(rec.ctx,compact);
  return {text:rec.text,panels};
 };
 const normal=normalFor('lp',false,c.id);
 player.startMove(normal);
 assert(!read(true).text.some(t=>t.text===normal.label),'Ordinary moves do not crowd the compact tactical HUD');
 assert(read(false).text.some(t=>t.text===normal.label&&t.x===640&&t.y===139),'Desktop retains ordinary move labels');
 const special=specialMovesFor(c.id).primary;
 const rush=specialMovesFor(enemy.character.id).mobility;
 enemy.startMove(rush);scene.rematchPattern=enemy.currentMove;
 player.startMove(special);
 const live=read(true), label=live.text.find(t=>t.text===special.label);
 assert(label&&label.x>1000,'Special name is on its own side panel');
 assert(live.text.some(t=>t.text===rush.label&&t.x<500),'Boss guard strip remains readable alongside the move name');
 assert(live.panels.some(p=>p.x>=974&&p.y>=156&&p.y+p.h<190&&p.x+p.w<=1260),'Move banner is clear of center controls and other status rows');
 const flash={type:'super-flash',x:0,y:0,power:200,ttl:30,label:'TEST SUPER',color:'#ffff88'};
 scene.world.events.push(flash);scene.world.superFreezeFrames=5;
 assert(read(true).text.some(t=>t.text===flash.label&&t.x>1000),'Active Super Art flash takes precedence');
 player.currentMove=null;scene.world.superFreezeFrames=0;
 assert(!read(true).text.some(t=>t.text===flash.label),'The compact HUD should drop expired activation names');
}
console.log('COMPACT_MOVE_BANNER_PASS');

// Keep keyboard hints available on desktop, but clear the active touch-control lanes.
let combatHelpCases = 0;
for (const mode of ['belt','duel','final-duel']) {
  const c = CHARACTERS[0];
  const s = new Stage1Scene(quiet,{},c,c.superArts[0],1);
  s.phase = mode;
  s.world.rules.mode = mode === 'belt' ? 'belt' : 'duel';
  const desktop = context();
  s.drawHelp(desktop.ctx, false);
  assert(desktop.text.some(label => label.text.includes('MOVE LIST & PAUSE')));
  const compact = context();
  s.drawHelp(compact.ctx, true);
  assert.equal(compact.text.length, 0, 'Combat shortcuts must not sit beneath touch controls');
  assert.equal(compact.geometry.length, 0);
  combatHelpCases++;
}
const c = CHARACTERS[0], match = new Stage1Scene(quiet,{},c,c.superArts[0],1);
match.phase = 'duel';
match.versus = {};
const versusHelp = context();
match.drawHelp(versusHelp.ctx, true);
assert(versusHelp.text.some(label => label.text.includes('P2 ARROWS')), 'Local versus retains P2 shortcuts');

const { TrainingSession } = await import('../dist/assets/training/TrainingSession.js');
const trainingScene = new Stage1Scene(quiet,{},c,c.superArts[0],1);
const session = new TrainingSession();
trainingScene.startTraining(session,c);
for (const compact of [false,true]) {
  const render = context();
  session.render(render.ctx, compact);
  assert.equal(render.text.some(label => label.text.includes('ESC : RESET POSITION')), !compact);
  assert(render.text.some(label => label.text.includes('COMBO / DAMAGE')));
  assert(render.text.some(label => label.text.includes('TRAINING')));
  combatHelpCases++;
}
console.log('COMPACT_TOUCH_COMBAT_HELP_PASS', { combatHelpCases });


session.lastMove = normalFor('lp', false, c.id);
for (const compact of [false,true]) {
  const render = context(), cards = [], labels = [];
  render.ctx.roundRect = (x,y,width,height) => { cards.push({x,y,width,height}); };
  render.ctx.fillText = function(text,x,y,maxWidth) { labels.push({text,x,y,maxWidth,font:this.font}); };
  session.render(render.ctx, compact);
  const frameCard = cards.find(card => card.width === 660 && card.height === 52);
  assert(frameCard);
  assert.equal(frameCard.y, compact ? 180 : 574, 'Compact frame data needs to clear the control lanes');
  const data = labels.find(line => line.text.startsWith('STARTUP'));
  assert(data && data.text.includes('RECOVERY') && data.text.includes('ON HIT'));
  assert.equal(data.font.includes(compact ? '15px' : '12px'), true);
  assert(data.y > frameCard.y && data.y < frameCard.y + frameCard.height);
  assert(data.maxWidth < frameCard.width);
}
console.log('COMPACT_TRAINING_FRAME_DATA_PASS');

{
 const c=CHARACTERS[0],scene=new Stage1Scene(quiet,{},c,c.superArts[0],1);
 scene.introFrames=0;
 scene.drawHudPortrait=()=>{};
 const readHud=()=>{const recording=context();scene.drawBeltHud(recording.ctx,scene.world.player);return recording.text;};
 const read=()=>readHud().map(t=>t.text);
 assert(readHud().some(t=>t.text.includes('LINE UP WITH ENEMIES') && t.y>110 && t.y<150),'Opening guidance sits between the HUD panels and combat callouts');
 const player=scene.world.player;
 const item=scene.world.belt.spawnPickup('apple',player.x,player.y);
 item.z=item.vz=0;
 assert(!read().some(t=>t.includes('PICK UP')),'Full-health food cannot advertise pickup');
 player.hp-=200;
 assert(read().includes('ATTACK TO PICK UP APPLE'),'Eligible food explains the action in the existing objective area');
 item.y+=29;
 assert(!read().some(t=>t.includes('PICK UP')),'Items in another lane cannot advertise pickup');
 item.y=player.y;
 player.hitStop=1;
 assert(!read().some(t=>t.includes('PICK UP')),'Frozen players cannot pick up food');
 scene.beltState='travel';
 assert(read().includes('MOVE RIGHT TO THE NEXT AREA'),'Travel shows the current objective');
 scene.travelExitInput='release';
 const protectedTravel=read();
 assert(protectedTravel.includes('AREA CLEAR • COLLECT REWARDS'));
 assert(protectedTravel.includes('RELEASE, THEN HOLD RIGHT FOR NEXT AREA'));
 assert(!protectedTravel.includes('MOVE RIGHT TO THE NEXT AREA'), 'Protected travel must not present conflicting instructions');
 player.hitStop=0;
 item.x+=75;
 scene.travelExitInput='right';
 assert(read().includes('AREA CLEAR • COLLECT REWARDS')&&read().includes('MOVE RIGHT TO THE NEXT AREA'),
  'Releasing right does not erase the reminder for a usable reward just out of reach');
 player.hp=player.maxHp;
 assert(!read().includes('AREA CLEAR • COLLECT REWARDS')&&read().includes('MOVE RIGHT TO THE NEXT AREA'),
  'A full-health apple should leave only the next-area instruction');
 player.hp-=200;
 item.x=player.x;
 scene.beltState='loot';
 assert(read().includes('ATTACK TO PICK UP APPLE'),'Pickup instructions remain available while collecting');
 const touchHud=context(), panels=[];
 touchHud.ctx.roundRect=(x,y,width,height)=>panels.push({x,y,width,height});
 scene.drawHud(touchHud.ctx,true);
 const pickupCue=touchHud.text.find(t=>t.text==='TAP LP • PICK UP APPLE');
 const exitCue=touchHud.text.find(t=>t.text==='LET GO OF →, THEN HOLD → FOR BOSS');
 assert(pickupCue&&exitCue,'Compact HUD names the pickup button and the right control');
 assert(panels.some(p=>p.y+p.height<=136&&p.y<pickupCue.y&&p.y+p.height>exitCue.y
  &&p.x>=526&&p.x+p.width<1005),'Both touch instructions must fit between health panels and above START');
 scene.lootExitArmed=true;
 const armedHud=context();
 scene.drawHud(armedHud.ctx,true);
 assert(armedHud.text.some(t=>t.text==='HOLD → FOR BOSS'),'Armed touch exit names the right control');
 scene.world.props.length=0;
 const pickupIndex=scene.world.belt.pickups.indexOf(item);
 scene.world.belt.pickups.splice(pickupIndex,1);
 scene.lootExitArmed=true;
 const afterPickup=read();
 assert(!afterPickup.includes('AREA CLEAR • COLLECT REWARDS')&&afterPickup.includes('MOVE RIGHT FOR BOSS'),
  'After the last usable reward, show only the boss exit instruction');
 scene.world.belt.pickups.push(item);
 scene.beginBossTransition();
 const transition=context();
 scene.drawHud(transition.ctx);
 scene.drawTransition(transition.ctx);
 const transitionLabels=transition.text.map(line=>line.text);
 assert(transitionLabels.includes('A CHALLENGER APPROACHES'));
 assert(transitionLabels.some(label=>label.startsWith('SCORE ')),'Score stays visible during the handoff');
 assert(!transitionLabels.some(label=>/PICK UP|COLLECT REWARDS|RIGHT FOR BOSS|CLEAR THE AREA/.test(label)),
  'The boss handoff must hide belt objectives from its first frame');
}
console.log('BELT_OBJECTIVE_HINT_PASS');

{
 const scene=new Stage1Scene(quiet,{},CHARACTERS[0],CHARACTERS[0].superArts[0],1);
 scene.introFrames=0;
 const {player,enemy,belt}=scene.world;
 const read=(compact)=>{
  const recording=context(), panels=[];
  recording.ctx.roundRect=(x,y,width,height)=>panels.push({x,y,width,height});
  scene.drawHud(recording.ctx,compact);
  return {lines:recording.text,panels};
 };
 belt.hold={holder:enemy,victim:player,frames:0,knees:0,mash:6,byPlayer:false,limit:84,queued:null};
 const escape=read(true);
 const label=escape.lines.find(t=>t.text==='TAP LP / LK FAST • ESCAPE 50%');
 assert(label&&escape.panels.some(p=>p.x>=526&&p.y<label.y&&p.y+p.height>label.y&&p.y+p.height<=136),
  'Compact escape shows a visible button cue and progress above START');
 assert(!escape.lines.some(t=>/LINE UP WITH ENEMIES|CLEAR THE AREA/.test(t.text)),'Grab instructions own the compact objective panel');
 assert(read(false).lines.some(t=>/MASH TO ESCAPE!.*50%/.test(t.text)),'Desktop escape cue is preserved');
 belt.hold={...belt.hold,holder:player,victim:enemy,byPlayer:true};
 for(const facing of [1,-1]){
  player.facing=facing;
  const [front,back]=facing===1?['→','←']:['←','→'];
  const {lines}=read(true);
  assert(lines.some(t=>t.text==='TAP LP • KNEE'));
  assert(lines.some(t=>t.text===`${front} + LP THROW  /  ${back} + LP BACK DROP`),'Throw arrows follow the player’s facing');
 }
 belt.hold=null;
 assert(!read(true).lines.some(t=>/ESCAPE|TAP LP • KNEE/.test(t.text)),'Grab cues disappear immediately after release');
}
console.log('COMPACT_BELT_GRAB_CUE_PASS');

{
 const {GRUNTS}=await import('../dist/assets/combat/GruntLibrary.js');
 const scene=new Stage1Scene(quiet,{},CHARACTERS[0],CHARACTERS[0].superArts[0],5);
 scene.introFrames=0;
 const {player,enemy}=scene.world;
 scene.world.spawnScriptedProjectile(enemy,GRUNTS.thrower.specials.primary);
 const shot=scene.world.projectiles[0];
 shot.x=player.x+170;shot.y=player.y-88;shot.vx=-6.8;
 const read=(compact=true)=>{
  const recording=context();
  scene.drawHud(recording.ctx,compact);
  return recording.text.find(line=>line.text.startsWith('BOTTLE • '));
 };
 assert.equal(read()?.text,'BOTTLE • HOLD ← TO BLOCK','Show the real guard direction for an incoming bottle');
 assert(read().y<136,'Bottle cue must clear START');
 assert(!read(false),'The tactical strip is limited to compact touch');
 shot.y+=120;
 assert(!read(),'Bottle in another lane must not warn');
 shot.y-=120;shot.x=player.x+430;
 assert(!read(),'Distant bottles must not distract from nearer enemies');
 shot.x=player.x-170;shot.vx=6.8;player.facing=1;
 assert.equal(read()?.text,'BOTTLE • HOLD → TO BLOCK','Rear guard must use the projectile direction');
 player.state='knockdown';
 assert(!read(),'Knocked down players cannot use the guard cue');
 player.state='idle';shot.hitVictims.add(player.uid);
 assert(!read(),'Already resolved bottles must not warn');
}
console.log('COMPACT_BOTTLE_GUARD_CUE_PASS');

{
 const {GRUNTS}=await import('../dist/assets/combat/GruntLibrary.js');
 const scene=new Stage1Scene(quiet,{},CHARACTERS[0],CHARACTERS[0].superArts[0],5);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);
 const {player}=scene.world, knife=scene.world.enemies.find(e=>e.character.id===GRUNTS.knife.id);
 knife.x=player.x+70;knife.y=player.y;knife.facing=-1;player.facing=1;
 knife.startMove(GRUNTS.knife.specials.primary);
 const read=()=>{
  const recording=context();
  scene.drawHud(recording.ctx,true);
  return recording.text.find(t=>t.text.startsWith('FLURRY'));
 };
 const guard=read();
 assert.equal(guard?.text,'FLURRY • HOLD ← FOR ALL HITS');
 assert(guard.y<136,'Guard cue clears START');
 knife.x=player.x-70;knife.facing=1;
 assert.equal(read()?.text,'FLURRY • HOLD → FOR ALL HITS','Guard must point away from a rear flurry even when the player faces right');
 knife.x=player.x+70;knife.facing=-1;
 const flurry=knife.currentMove, activeEnd=flurry.startup+flurry.active;
 knife.moveFrame=activeEnd-flurry.multiHit.interval-1;
 knife.markHitTarget(player);
 assert.equal(read()?.text,'FLURRY • HOLD ← FOR ALL HITS','Retain guard when the last active frame can still hit');
 knife.startMove(GRUNTS.knife.specials.primary);
 knife.moveFrame=activeEnd-flurry.multiHit.interval;
 knife.markHitTarget(player);
 assert(!read(),'A late first contact with no time for another hit must clear the guard cue');
 knife.moveFrame=activeEnd;
 assert.equal(read()?.text,'FLURRY OPEN • TAP MP');
 knife.x=player.x+58;
 assert.equal(read()?.text,'FLURRY OPEN • TAP LP');
 knife.x=player.x+70;
 player.y+=110;
 assert(!read(),'Counter cannot hit from another lane');
 player.y=knife.y;player.state='block';player.stateFrame=-5;
 assert(!read(),'Do not cue outside the guard recovery input window');
 player.stateFrame=-4;
 assert.equal(read()?.text,'FLURRY OPEN • TAP MP','Cue an attack that can be queued before guard recovery ends');
 player.hitStop=1;
 assert(!read(),'Do not cue a normal while the guard pose is still frozen');
 player.hitStop=0;
 knife.moveFrame=activeEnd+knife.currentMove.recovery-8;
 assert(!read(),'Include the rest of guard recovery in the time needed to land the counter');
 knife.moveFrame=activeEnd;
 player.state='idle';
 const bruiser=scene.world.enemies.find(e=>e.character.id===GRUNTS.bruiser.id);
 bruiser.x=player.x-74;bruiser.y=player.y;bruiser.facing=1;
 bruiser.startMove(GRUNTS.bruiser.heavy);
 bruiser.moveFrame=bruiser.currentMove.startup-1;
 assert(!read(),'Another enemy already swinging from behind makes the counter unsafe');
 bruiser.moveFrame=bruiser.currentMove.startup+bruiser.currentMove.active-1;
 assert.equal(read()?.text,'FLURRY OPEN • TAP MP','A neighboring attack that expires before collision cannot suppress the counter');
 bruiser.hitStop=1;
 assert(!read(),'A frozen active frame can still interrupt the counter');
 bruiser.moveFrame=bruiser.currentMove.startup-1;
 bruiser.hitStop=18;
 assert.equal(read()?.text,'FLURRY OPEN • TAP MP','An attack whose startup is frozen until after the counter can land should not suppress it');
 bruiser.hitStop=0;
 bruiser.startMove(GRUNTS.knife.specials.primary);
 const otherFlurry=bruiser.currentMove;
 bruiser.moveFrame=otherFlurry.startup+otherFlurry.active-otherFlurry.multiHit.interval;
 bruiser.markHitTarget(player);
 assert.equal(read()?.text,'FLURRY OPEN • TAP MP','A spent flurry from another enemy must not hide a viable counter');
 bruiser.state='idle';
 knife.moveFrame+=knife.currentMove.recovery-1;
 assert(!read(),'Do not advertise a counter after the last usable opening');
}
console.log('COMPACT_FLURRY_CUE_PASS');

{
 const {GRUNTS}=await import('../dist/assets/combat/GruntLibrary.js');
 const market=new Stage1Scene(quiet,{},CHARACTERS[0],CHARACTERS[0].superArts[0],2);
 market.introFrames=0;market.beltWave=0;market.spawnBeltWave(0);
 const {player,enemies}=market.world;
 const knife=enemies.find(e=>e.character.id===GRUNTS.knife.id);
 assert(knife&&!knife.lateElite,'Use a normal knife enemy in the opening market wave');
 knife.x=player.x+68;knife.y=player.y;knife.facing=-1;
 knife.startMove(GRUNTS.knife.specials.primary);
 const hud=compact=>{
  const target=context();
  market.drawHud(target.ctx,compact);
  return target.text.map(line=>line.text);
 };
 for(const compact of [false,true]){
  assert(hud(compact).includes('FLURRY • HOLD ← FOR ALL HITS'),'The opening market flurry must teach its guard direction');
 }
 knife.moveFrame=knife.currentMove.startup+knife.currentMove.active;
 assert(!hud(true).some(label=>label.startsWith('FLURRY')),'A regular knife does not advertise an elite punish window');
 market.beltWave=1;market.spawnBeltWave(1);
 const thrower=market.world.enemies.find(e=>e.character.id===GRUNTS.thrower.id);
 market.world.spawnScriptedProjectile(thrower,GRUNTS.thrower.specials.primary);
 const shot=market.world.projectiles[0];
 shot.x=player.x+150;shot.y=player.y-88;shot.vx=-6.8;
 assert(hud(false).includes('BOTTLE • HOLD ← TO BLOCK'),'Keyboard players also need a warning during market crossfire');
 const rearKnife=market.world.enemies.find(e=>e.character.id===GRUNTS.knife.id);
 rearKnife.x=player.x-68;rearKnife.y=player.y;rearKnife.facing=1;
 rearKnife.startMove(GRUNTS.knife.specials.primary);
 rearKnife.moveFrame=rearKnife.currentMove.startup-2;
 for(const compact of [false,true]){
  assert(hud(compact).includes('FLURRY • HOLD → FOR ALL HITS'),'An earlier rear flurry must take priority over the bottle');
 }
 shot.x=player.x+34;
 for(const compact of [false,true]){
  assert(hud(compact).includes('BOTTLE • HOLD ← TO BLOCK'),'An earlier bottle must take priority over the rear flurry');
 }
 const finalFlurryFrame = rearKnife.currentMove.startup + rearKnife.currentMove.active - 1;
 rearKnife.moveFrame = finalFlurryFrame;
 for (const compact of [false,true]) {
  assert(hud(compact).includes('BOTTLE • HOLD ← TO BLOCK'),'A flurry that expires before the next collision cannot hide an incoming bottle');
 }
 rearKnife.moveFrame = finalFlurryFrame - 1;
 assert(hud(true).includes('FLURRY • HOLD → FOR ALL HITS'),'The last reachable active frame still has priority');
 rearKnife.moveFrame = finalFlurryFrame;
 rearKnife.hitStop = 2;
 assert(hud(true).includes('FLURRY • HOLD → FOR ALL HITS'),'Hitstop can keep the last active frame live');
 rearKnife.interruptMove();
 const kicker=market.world.enemies.find(e=>e.character.id===GRUNTS.kicker.id);
 kicker.x=player.x-76;kicker.y=player.y;kicker.facing=1;
 kicker.startMove(GRUNTS.kicker.specials.primary);
 kicker.moveFrame=kicker.currentMove.startup-2;
 shot.x=player.x+150;
 for(const compact of [false,true]){
  assert(hud(compact).includes('SPIN KICK • HOLD → TO BLOCK'),'An imminent rear Spin Kick should take priority over the distant bottle');
 }
 shot.x=player.x+34;
 for(const compact of [false,true]){
  assert(hud(compact).includes('BOTTLE • HOLD ← TO BLOCK'),'An imminent bottle should still take priority over the Spin Kick');
 }
 kicker.moveFrame=kicker.currentMove.startup-1;
 assert.equal(market.world.projectileContactTick(player,shot),1);
 for(const compact of [false,true]){
  assert(hud(compact).includes('SPIN KICK • HOLD → TO BLOCK'),'On a tie, guard the melee contact that actually resolves first');
 }
 market.world.projectiles.length=0;
 kicker.markHitTarget(player);
 assert(!hud(true).some(label=>label.startsWith('SPIN KICK')),'A spent kick should clear its warning');
 kicker.startMove(GRUNTS.kicker.heavy);
 kicker.moveFrame=kicker.currentMove.startup-1;
 market.world.projectiles.push(shot);
 for(const compact of [false,true]){
  assert(hud(compact).includes('ROUNDHOUSE • HOLD → TO BLOCK'),'Coach the market roundhouse when melee resolves before the opposite bottle');
 }
 kicker.moveFrame=kicker.currentMove.startup-2;
 assert(hud(true).includes('BOTTLE • HOLD ← TO BLOCK'),'Give an earlier bottle priority over the roundhouse');
 market.world.projectiles.length=0;
 kicker.y+=100;
 assert(!hud(true).some(label=>label.startsWith('ROUNDHOUSE')),'Skip roundhouse in another lane');
 kicker.y=player.y;
 kicker.markHitTarget(player);
 assert(!hud(true).some(label=>label.startsWith('ROUNDHOUSE')),'Skip a roundhouse that has already connected');
 market.beltWave=2;
 kicker.startMove(GRUNTS.kicker.heavy);
 assert(!hud(true).some(label=>label.startsWith('ROUNDHOUSE')),'Roundhouse teaching is limited to the market opening');
}
console.log('MARKET_THREAT_CUE_PASS');

{
 const {GRUNTS}=await import('../dist/assets/combat/GruntLibrary.js');
 const {DEFAULT_KEY_BINDINGS}=await import('../dist/assets/input/InputManager.js');
 const hero=CHARACTERS[0];
 const dojo=new Stage1Scene({...quiet,bindings:DEFAULT_KEY_BINDINGS},{},hero,hero.superArts[0],3);
 dojo.introFrames=0;dojo.beltWave=2;dojo.spawnBeltWave(2);
 const {player,enemies}=dojo.world;
 const knife=enemies.find(enemy=>enemy.character.id===GRUNTS.knife.id);
 const bruiser=enemies.find(enemy=>enemy.character.id===GRUNTS.bruiser.id);
 assert(knife&&!knife.lateElite&&bruiser);
 const read=compact=>{
  const recording=context();
  dojo.drawHud(recording.ctx,compact);
  return recording.text.map(line=>line.text);
 };
 for(const side of [-1,1]){
  knife.x=player.x+68*side;knife.y=player.y;knife.facing=-side;
  knife.startMove(GRUNTS.knife.specials.primary);
  for(const compact of [false,true]){
   assert(read(compact).includes(`FLURRY • HOLD ${side===1?'←':'→'} FOR ALL HITS`),'Dojo final wave should teach which way to guard');
  }
 }
 knife.moveFrame=knife.currentMove.startup+knife.currentMove.active;
 assert(!read(true).some(label=>label.startsWith('FLURRY OPEN')),'Keep the existing recovery rules');
 bruiser.x=player.x+65;bruiser.y=player.y;bruiser.facing=-1;
 bruiser.startMove(GRUNTS.bruiser.specials.primary);
 assert(read(false).includes('BODY PRESS • JUMP (SPACE)'),'Use the actual keyboard jump key during the Dojo final wave');
 assert(read(true).includes('BODY PRESS • TAP JUMP'));
}
console.log('DOJO_FINAL_WAVE_THREAT_CUE_PASS');

{
 const {GRUNTS}=await import('../dist/assets/combat/GruntLibrary.js');
 const scene=new Stage1Scene(quiet,{},CHARACTERS[0],CHARACTERS[0].superArts[0],5);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);
 const {player}=scene.world;
 const bruiser=scene.world.enemies.find(e=>e.character.id===GRUNTS.bruiser.id);
 const soldier=scene.world.enemies.find(e=>e.character.id===GRUNTS.soldier.id);
 for(const [enemy,move] of [[bruiser,GRUNTS.bruiser.specials.primary],[soldier,GRUNTS.soldier.specials.mobility]]){
  enemy.x=player.x+65;enemy.y=player.y;enemy.facing=-1;enemy.startMove(move);
  const read=(compact=true)=>{
   const recording=context();
   scene.drawHud(recording.ctx,compact);
   return recording.text.find(t=>t.text.startsWith(move.label+' •'));
  };
  assert.equal(read()?.text,move.label+' • TAP JUMP','Early grounded guard break needs a jump instruction');
  assert(read().y<136,'Guard-break cue clears START');
  assert(!read(false),'Keep the existing desktop HUD');
  scene.world.spawnScriptedProjectile(enemy,GRUNTS.thrower.specials.primary);
  const shot=scene.world.projectiles[0];
  shot.x=player.x+145;shot.y=player.y-88;shot.vx=-6.8;
  assert.equal(read()?.text,move.label+' • TAP JUMP','An unblockable gets priority over a bottle guard');
  scene.world.projectiles.length=0;
  player.state='block';
  assert.equal(read()?.text,move.label+' • UNBLOCKABLE','Do not promise a jump while blockstun owns input');
  player.state='idle';
  enemy.moveFrame=enemy.currentMove.startup-1;
  assert.equal(read()?.text,move.label+' • UNBLOCKABLE','With no time to gain height, show the danger without a jump instruction');
  enemy.moveFrame=0;enemy.y+=120;
  assert(!read(),'Attacks in other lanes must not prompt a jump');
  enemy.state='idle';
 }
}
console.log('COMPACT_GUARD_BREAK_CUE_PASS');

for (const stage of [2,5]) {
 const scene=new Stage1Scene({...quiet,bindings:[['KeyS','down'],['KeyA','left'],['KeyD','right']]},{},CHARACTERS[0],CHARACTERS[0].superArts[0],stage);
 scene.introFrames=0;
 const {player,enemy,rules}=scene.world;
 const read=(compact=true)=>{
  const recording=context();
  scene.drawHud(recording.ctx,compact);
  return recording.text.filter(t=>/QUICK RISE|ROLL BACK/.test(t.text));
 };
 player.receiveHit({...normalFor('hk',false,enemy.character.id),knockdown:true,launch:undefined},enemy,false);
 player.airborne=false;player.hitStop=0;player.stateFrame=-35;player.x=rules.arenaLeft+150;player.facing=1;
 enemy.x=player.x+65;enemy.y=player.y;
 assert.deepEqual(read().map(t=>t.text),['TAP ↓ • QUICK RISE','TAP ↙ • ROLL BACK']);
 assert(read().every(t=>t.y<136),'Knockdown cue must clear START');
 if(stage===2){
  assert.deepEqual(read(false).map(t=>t.text),['TAP S • QUICK RISE','HOLD A + TAP S • ROLL BACK'],'Show the actual keyboard keys in the market opening');
  scene.beltWave=2;
  assert(!read(false).length,'Keyboard guidance is limited to the first two market waves');
  scene.beltWave=0;
 }else assert(!read(false).length,'Other desktop stages stay unchanged');
 enemy.x=player.x-65;
 assert(read().some(t=>t.text==='TAP ↘ • ROLL BACK'),'Diagonal follows the next tick’s facing');
 player.x=rules.arenaRight;
 assert.deepEqual(read().map(t=>t.text),['TAP ↓ • QUICK RISE'],'Do not offer a roll into the wall');
 player.airborne=true;
 assert(!read().length,'Quick rise is not available before landing');
 player.airborne=false;
 player.hitStop=1;
 assert(!read().length,'Quick rise is not accepted during hit stop');
 player.hitStop=0;
 assert(player.quickRise());
 assert(!read().length,'An accepted quick rise clears both instructions');
}
{
 const hero=CHARACTERS[0];
 const scene=new Stage1Scene({...quiet,bindings:[['KeyS','down'],['KeyD','right']]},{},hero,hero.superArts[0],2);
 scene.introFrames=0;scene.beltWave=1;scene.spawnBeltWave(1);
 const {player,props}=scene.world;
 const stall=props.find(prop=>prop.id==='stall-market-b');
 player.state='knockdown';player.stateFrame=-35;
 player.x=stall.x-stall.width/2-28;player.y=stall.y;
 assert(scene.world.closestEnemyToPlayer().x<player.x,'The target should make a right roll the back direction');
 const read=compact=>{
  const recording=context();
  scene.drawHud(recording.ctx,compact);
  return recording.text.map(line=>line.text);
 };
 for(const compact of [false,true]){
  assert(read(compact).some(line=>line.includes('QUICK RISE')));
  assert(!read(compact).some(line=>line.includes('ROLL BACK')),'Do not suggest a roll directly into an intact stall');
 }
 stall.broken=true;
 assert(read(true).includes('TAP ↘ • ROLL BACK'),'A broken stall no longer prevents the cue');
 stall.broken=false;
 stall.y+=100;
 assert(read(true).includes('TAP ↘ • ROLL BACK'),'A stall in another lane does not prevent the cue');
}
console.log('COMPACT_QUICK_RISE_CUE_PASS');

{
 const scene=new Stage1Scene(quiet,{},CHARACTERS[0],CHARACTERS[0].superArts[0],5);
 scene.introFrames=0;
 scene.prepareFinalDuel();
 scene.phase='final-duel';
 const {player,enemy}=scene.world;
 player.receiveHit({...normalFor('hk',false,enemy.character.id),knockdown:true,launch:undefined},enemy,false);
 player.airborne=false;player.hitStop=0;player.stateFrame=-35;
 const read=(compact=true)=>{
  const recording=context(),panels=[];
  recording.ctx.roundRect=(x,y,w,h)=>panels.push({x,y,w,h});
  scene.drawGillPhaseOverlay(recording.ctx,compact);
  scene.drawBossWakeGuide?.(recording.ctx,compact);
  return {text:recording.text.map(t=>t.text),panels};
 };
 const wake=read();
 assert(wake.text.includes('TAP ↓ • QUICK RISE')&&wake.text.some(t=>t.includes('ROLL BACK')));
 assert(wake.text.includes('THE FINAL DUEL BEGINS'),'Keep Gill’s phase message visible');
 assert.equal(wake.panels.length,2);
 assert(wake.panels[0].x+wake.panels[0].w<wake.panels[1].x,'Duel wake cue clears Gill’s phase strip');
 assert(!read(false).text.some(t=>t.includes('QUICK RISE')));
 for(const field of ['paused','roundAnnounceFrames','roundBreakFrames']){
  scene[field]=1;
  assert(!read().text.some(t=>t.includes('QUICK RISE')),field+' must hide blocked wake controls');
  scene[field]=0;
 }
 assert(player.quickRise());
 assert(!read().text.some(t=>t.includes('QUICK RISE')),'Accepted input clears the duel cue');
}
console.log('COMPACT_DUEL_QUICK_RISE_PASS');


{
 const c=CHARACTERS.find(c=>c.id==='RYU');
 let heldDirection;
 const coachInput={...quiet,held:action=>action===heldDirection,bindings:[['KeyJ','lp'],['KeyK','mp']]};
 const s=new Stage1Scene(coachInput,{},c,c.superArts[0],1);
 s.prepareDuel();
 s.enterBossMatch('duel');
 s.stageTime=80;
 s.drawHudPortrait=()=>{};
 const {player,enemy}=s.world;
 const hint=(compactTouchControls=true)=>{
  const target=context();
  s.drawHud(target.ctx,compactTouchControls);
  return target.text.find(t=>/^(BLOCK NOW|HIT BACK|GET READY)/.test(t.text));
 };
 player.x=500; player.facing=1; enemy.x=560; enemy.facing=-1;
 const heavy=normalFor('hk',false,enemy.character.id);
 enemy.startMove(heavy);
 assert.equal(hint()?.text,'BLOCK NOW • HOLD ←');
 const compactHint=context();s.drawFirstBossGuide(compactHint.ctx,player,enemy,true);assert.match(compactHint.ctx.font,/28px/);
 assert(hint().y>120&&hint().y<165,'Guide stays in the top center, above fighters');
 enemy.moveFrame=heavy.startup+heavy.active-1;
 assert.equal(hint()?.text,'BLOCK NOW • HOLD ←','An unresolved strike can still hit on its last active tick');
 enemy.markHitTarget(player);
 assert.equal(hint(),undefined,'A spent single hit must stop asking for guard before recovery');
 enemy.moveFrame++;
 player.state='block';
 assert.equal(hint(),undefined,'Do not tell an input-locked player to attack');
 player.state='idle';
 player.hitStop=2;
 assert.equal(hint(),undefined,'Do not advertise an action during a frozen tick');
 player.hitStop=0;
 assert.equal(hint()?.text, 'HIT BACK • LP');
 enemy.x=575;
 assert.equal(hint()?.text, 'HIT BACK • MP', 'A medium punch can reach when a light punch cannot');
 assert.match(hint(false)?.text??'',/K \/ MP/, 'Desktop players get the bound key alongside the attack button');
 enemy.moveFrame=heavy.startup+heavy.active+heavy.recovery-9;
 assert.equal(hint()?.text, 'HIT BACK • MP', 'Neutral MP fits in a short opening');
 heldDirection='right';
 assert.equal(hint(),undefined,'Held forward triggers a command attack too slow for this opening');
 enemy.x=595;enemy.moveFrame=heavy.startup+heavy.active;
 assert.equal(hint()?.text, 'HIT BACK • MP', 'Held forward can reach with its real command attack');
 heldDirection=undefined;
 enemy.x=900;
 assert.equal(hint(),undefined,'Do not suggest a whiff');
 enemy.x=560;
 enemy.moveFrame=heavy.startup+heavy.active+heavy.recovery-2;
 assert.equal(hint(),undefined,'Do not suggest a punish too late to connect');
 player.x=560; player.facing=-1; enemy.x=500; enemy.facing=1;
 enemy.startMove(heavy);
 assert.equal(hint()?.text,'BLOCK NOW • HOLD →','Guard direction follows the current side');
 const { specialMovesFor } = await import('../dist/assets/combat/MoveLibrary.js');
 const barrage = specialMovesFor('DUDLEY').primary;
 enemy.startMove(barrage);
 enemy.moveFrame = barrage.startup;
 for (let hit = 1; hit <= barrage.multiHit.hits; hit++) {
  enemy.markHitTarget(player);
  assert(enemy.hasHitTarget(player),'Immediate rehit is locked after each contact');
  assert.equal(hint()?.text,hit === barrage.multiHit.hits ? undefined : 'BLOCK NOW • HOLD →',
   'Keep guarding between contacts and clear the hint after the last hit');
  if (hit < barrage.multiHit.hits) enemy.moveFrame += barrage.multiHit.interval;
 }
 enemy.startMove({...heavy,guardBreak:true});
 assert.equal(hint(),undefined,'A guard break cannot advertise blocking');
 enemy.startMove({...heavy,kind:'throw',level:'throw'});
 assert.equal(hint(),undefined,'A throw cannot advertise blocking');
 enemy.startMove(heavy);
 for(const field of ['paused','training','versus','roundBreakFrames','roundAnnounceFrames']){
  s[field]=true;assert.equal(hint(),undefined,field+' must hide the guide');s[field]=false;
 }
 s.world.superFreezeFrames=2;
 assert.equal(hint(),undefined);
 s.world.superFreezeFrames=0;
 s.stageId=2;
 assert.equal(hint(),undefined,'Coaching is limited to the first campaign boss');
}
for (const facing of [-1, 1]) for (const distance of [72.3, 65]) {
 const ryu = CHARACTERS.find(character => character.id === 'RYU');
 const input = { ...quiet };
 const scene = new Stage1Scene(input, {}, ryu, ryu.superArts[0], 1);
 scene.prepareDuel();
 scene.enterBossMatch('duel');
 scene.stageTime = 80;
 const { player, enemy } = scene.world;
 const heavy = normalFor('hk', false, enemy.character.id);
 const hint = () => {
  const { ctx, text } = context();
  scene.drawFirstBossGuide(ctx, player, enemy, true);
  return text.find(entry => entry.text.startsWith('HIT BACK'))?.text;
 };

 player.x = player.previousX = 600;
 enemy.x = enemy.previousX = 600 + facing * 120;
 player.facing = facing;
 enemy.facing = -facing;
 player.receiveHit(normalFor('hk', true, enemy.character.id), enemy, false);
 for (let i = 0; i < 60 && (player.hitStop || player.airborne); i++) player.updatePlayer(input, scene.world.rules);
 assert(player.quickRise(true), 'Fixture must enter a real tech roll');
 for (let i = 0; i < 20 && player.state === 'knockdown'; i++) player.updatePlayer(input, scene.world.rules);
 assert(player.techRolling && player.state === 'idle', 'The standing tail of a tech roll can still move the fighter');
 enemy.x = enemy.previousX = player.x + facing * distance;
 enemy.startMove(heavy);
 enemy.moveFrame = heavy.startup + heavy.active + 2;
 const hp = enemy.hp, duringRoll = hint();
 let tick = 0;
 const step = () => scene.world.update(input, ++tick);
 if (distance === 65) {
  for (let i = 0; i < 3 && player.techRolling; i++) step();
  assert(!player.techRolling);
  assert.match(hint() ?? '', /^HIT BACK • MP$/, 'A reachable counter must return after the roll');
 }
 input.pressed = action => action === 'mp';
 step();
 input.pressed = () => false;
 for (let i = 0; i < 8; i++) step();
 assert.equal(enemy.hp < hp, distance === 65, 'The roll causes the farther MP cue to whiff');
 assert.equal(duringRoll, undefined, 'Do not suggest a counter while a tech roll can still move the player');
}
console.log('FIRST_BOSS_COACHING_PASS');

const compactGill = new Stage1Scene(quiet, {}, CHARACTERS[0], CHARACTERS[0].superArts[0], 5);
compactGill.prepareFinalDuel();
compactGill.phase = 'final-duel';
const compactGillLabels = new Map();
const compactGillBounds = [];
const compactGillCtx = new Proxy({}, {
  get: (_, key) => key === 'fillText' ? (label, x, y) => compactGillLabels.set(label, {x,y})
    : key === 'roundRect' ? (x, y, w, h) => compactGillBounds.push(y + h) : () => {},
});
compactGill.drawBossPatternGuide(compactGillCtx, 'HIT BACK • MP', true, true);
assert.equal(compactGillLabels.get('HIT BACK • MP')?.y, 129);
assert(compactGillLabels.has('PHASE 1 • 1500/1500'));
const {resolveTouchStartPosition} = await import('../dist/assets/ui/TouchControls.js');
for (const [width, height] of [[568, 240], [568, 320], [844, 390], [1200, 540]]) {
  const start = resolveTouchStartPosition(width, height, {left: 0, right: 0, top: 0, bottom: 0}, []);
  assert(Math.max(...compactGillBounds) * height / 720 < start.top, 'The strip ends before the earliest preferred START position');
}
compactGillLabels.clear();
compactGill.drawGillPhaseOverlay(compactGillCtx, true);
assert.equal(compactGillLabels.get('THE FINAL DUEL BEGINS')?.y, 129);
assert(compactGillLabels.has('PHASE 1 • 1500/1500'));
compactGillLabels.clear();
compactGill.drawGillPhaseOverlay(compactGillCtx, false);
assert(compactGillLabels.has('FINAL BOSS • PHASE 1 • 1500 / 1500'));
assert.equal(compactGillLabels.get('THE FINAL DUEL BEGINS')?.y, 171);
console.log('COMPACT_GILL_ACTION_STRIP_PASS');

const {specialMovesFor} = await import('../dist/assets/combat/MoveLibrary.js');
const gillMoves = specialMovesFor('GILL');
for (const side of [-1, 1]) {
  const {player, enemy} = compactGill.world;
  player.x = 640;
  player.facing = side;
  enemy.x = 640 + 185 * side;
  enemy.facing = -side;
  for (const [move, suffix] of [[gillMoves.primary, 'TO GUARD'], [gillMoves.exPrimary, '• GUARD ALL SHOTS']]) {
    compactGill.world.projectiles.length = 0;
    compactGill.world.spawnScriptedProjectile(enemy, move);
    compactGillLabels.clear();
    compactGill.drawGillPhaseOverlay(compactGillCtx, true);
    const arrow = side === 1 ? '←' : '→';
    assert(compactGillLabels.has(`HOLD ${arrow} ${suffix}`), 'Standard Gill projectile should use the existing guard strip');
    compactGill.world.projectiles[0].hitVictims.add(player.uid);
    compactGillLabels.clear();
    compactGill.drawGillPhaseOverlay(compactGillCtx, true);
    assert(!compactGillLabels.has(`HOLD ${arrow} ${suffix}`), 'A spent projectile should not show a guard prompt');
  }
}
console.log('GILL_STANDARD_PROJECTILE_GUIDE_PASS');

const {chipDamageFor} = await import('../dist/assets/combat/Fighter.js');
for (const side of [-1, 1]) {
  const {world} = compactGill;
  const {player, enemy} = world;
  player.x = 640;
  player.facing = side;
  player.hp = chipDamageFor(gillMoves.primary) + 1;
  assert(chipDamageFor(gillMoves.super) >= player.hp);
  enemy.facing = -side;
  world.projectiles.length = 0;
  world.spawnScriptedProjectile(enemy, gillMoves.primary);
  world.spawnScriptedProjectile(enemy, gillMoves.super);
  const [farther, imminent] = world.projectiles;
  farther.x = player.x + 170 * side;
  imminent.x = player.x + 62 * side;
  assert(world.projectileContactTick(player, farther) > 1);
  assert.equal(world.projectileContactTick(player, imminent), 1);
  for (const reverse of [false, true]) {
    if (reverse) world.projectiles.reverse();
    compactGillLabels.clear();
    compactGill.drawGillPhaseOverlay(compactGillCtx, true);
    assert(compactGillLabels.has('GUARD CHIP CAN KO'), 'The first contact should set the warning regardless of projectile creation order');
  }
  imminent.hitVictims.add(player.uid);
  compactGillLabels.clear();
  compactGill.drawGillPhaseOverlay(compactGillCtx, true);
  assert(compactGillLabels.has(`HOLD ${side === 1 ? '←' : '→'} TO GUARD`), 'After the close threat passes, guide the remaining projectile');
}
const overlapWorld = compactGill.world;
const {player: airbornePlayer, enemy: volleyBoss} = overlapWorld;
airbornePlayer.hp = airbornePlayer.maxHp;
airbornePlayer.airborne = true;
airbornePlayer.jumpHeight = 200;
overlapWorld.projectiles.length = 0;
const volley = {
  ...gillMoves.primary,
  projectile: {...gillMoves.primary.projectile, bossBurst: {label: 'ELEMENTAL SPHERE', speedScale: 1}},
};
overlapWorld.spawnScriptedProjectile(volleyBoss, volley);
const [airborneShot] = overlapWorld.projectiles;
airborneShot.x = airbornePlayer.x + 120;
assert.equal(overlapWorld.projectileContactTick(airbornePlayer, airborneShot), undefined);
compactGillLabels.clear();
compactGill.drawGillPhaseOverlay(compactGillCtx, true);
assert(compactGillLabels.has('GUARD ON LANDING'), 'When airborne, retain the scripted warning for an approaching shot below the player');

console.log('GILL_FIRST_PROJECTILE_CONTACT_GUIDE_PASS');

const {DEFAULT_KEY_BINDINGS} = await import('../dist/assets/input/InputManager.js');
for (const [bossId, side, back, forward] of [
  ['GILL', 1, '← OR A', '→ OR D'],
  ['GILL', -1, '→ OR D', '← OR A'],
  ['URIEN', 1, '← OR A', '→ OR D'],
  ['URIEN', -1, '→ OR D', '← OR A'],
]) {
  const hero = CHARACTERS[0];
  const scene = new Stage1Scene({...quiet, bindings: DEFAULT_KEY_BINDINGS}, {}, hero, hero.superArts[0], 5);
  if (bossId === 'GILL') {
    scene.prepareFinalDuel();
    scene.phase = 'final-duel';
  } else {
    scene.prepareDuel();
    scene.phase = 'duel';
  }
  const {world} = scene;
  const {player, enemy} = world;
  player.x = 640;
  player.facing = side;
  enemy.x = player.x + 116 * side;
  enemy.facing = -side;
  const primary = specialMovesFor(bossId).primary;
  const move = {...primary, projectile: {...primary.projectile, bossBurst: {label: primary.label, speedScale: 1}}};
  world.spawnScriptedProjectile(enemy, move);
  const [incoming] = world.projectiles;
  assert.equal(world.projectileContactTick(player, incoming), 1);
  const read = compact => {
    compactGillLabels.clear();
    scene.drawScriptedBossGuide(compactGillCtx, {move, label: move.label}, compact);
    return [...compactGillLabels.keys()];
  };
  assert(read(false).some(label => label.endsWith(`HOLD ${back} TO GUARD`)));
  assert(read(true).includes(`HOLD ${back[0]} TO GUARD`));
  player.hp = chipDamageFor(move);
  assert(read(false).some(label => label.endsWith(`TAP ${forward} TO PARRY`)));
  assert(read(true).includes(`TAP ${forward[0]} TO PARRY`));
}
console.log('STAGE5_BOSS_DIRECTION_KEYS_PASS');

{
  const hero = CHARACTERS[0];
  const scene = new Stage1Scene(quiet, {}, hero, hero.superArts[0], 2);
  scene.introFrames = 0;
  for (const compact of [false, true]) {
    for (const [state, seconds, paused, urgent] of [
      ['fight', 10.1, false, false],
      ['fight', 10, false, true],
      ['fight', 0.1, false, true],
      ['travel', 3, false, false],
      ['loot', 3, false, false],
      ['fight', 3, true, false],
    ]) {
      Object.assign(scene, {beltState: state, stageTime: seconds, paused});
      const recording = context();
      const timerPanels = [];
      const timer = [];
      recording.ctx.roundRect = (x, y, width, height) => {
        if (x < 640 && x + width > 640 && y < 49 && y + height >= 49) timerPanels.push({x,y,width,height});
      };
      recording.ctx.fillText = (text, x, y) => { if (x === 640 && y === 49) timer.push(text); };
      scene.drawBeltHud(recording.ctx, scene.world.player, compact);
      assert.deepEqual(timer, [String(Math.ceil(seconds)).padStart(2, '0')], 'Keep the countdown in its existing position');
      assert.equal(timerPanels.length, Number(urgent), 'Emphasize the active wave countdown at ten seconds or less');
    }
  }
}
console.log('BELT_LOW_TIME_READABILITY_PASS');

{
 const {DEFAULT_KEY_BINDINGS}=await import('../dist/assets/input/InputManager.js');
 const hero=CHARACTERS[0];
 const market=new Stage1Scene({...quiet,bindings:DEFAULT_KEY_BINDINGS},{},hero,hero.superArts[0],2);
 market.introFrames=0;market.beltWave=1;market.spawnBeltWave(1);
 const {player}=market.world;
 player.state='knockdown';player.stateFrame=-35;player.airborne=true;player.jumpHeight=48;
 const read=compact=>{
  const recording=context();
  market.drawHud(recording.ctx,compact);
  return recording.text.map(line=>line.text);
 };
 player.jumpVelocity=4;
 assert(!read(true).some(label=>label.includes('RISE ON LANDING')),'No cue while the fighter is still rising');
 player.jumpVelocity=-6;
 assert(read(true).includes('TAP ↓ • RISE ON LANDING'));
 assert(read(false).includes('TAP ↓ OR S • RISE ON LANDING'));
 assert(!read(true).some(label=>label.includes('ROLL BACK')),'Wait until landing to show the roll choice');
 player.stateFrame=-13;
 assert(!read(true).some(label=>label.includes('RISE ON LANDING')),'Skip the preview if the fall outlasts the remaining quick-rise opportunity');
 player.stateFrame=-11;player.jumpHeight=4;player.jumpVelocity=-8;
 assert(read(true).includes('TAP ↓ • RISE ON LANDING'),'Show the preview if landing itself is the last valid input tick');
 player.stateFrame=-35;
 player.airborne=false;
 assert(read(true).includes('TAP ↓ • QUICK RISE'));
 assert(!read(true).some(label=>label.includes('RISE ON LANDING')));
 assert(player.quickRise());
 assert(!read(true).some(label=>/RISE ON LANDING|QUICK RISE/.test(label)));
}
console.log('MARKET_QUICK_RISE_LANDING_CUE_PASS');
