import assert from'node:assert/strict';import{Stage1Scene}from'../dist/assets/scenes/Stage1Scene.js';import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';import{normalFor}from'../dist/assets/combat/MoveLibrary.js';import{runtimeQuality}from'../dist/assets/core/RuntimeQuality.js';import{preloadArtAssets,unloadArtAsset}from'../dist/assets/render/ImageAssets.js';let loaded=true;globalThis.Image=class{complete=true;naturalWidth=1254;naturalHeight=1254;set src(v){this.url=v;if(v)(loaded?this.onload:this.onerror)?.();}get src(){return this.url;}};const quiet={held:()=>false,pressed:()=>false,released:()=>false},key='combat-impact-atlas';function context(){const text=[],paints=[],geometry=[];const ctx=new Proxy({globalAlpha:1,fillText:(t,x,y)=>text.push({text:t,x,y}),drawImage:(im,...args)=>paints.push({src:im.src,args}),fill:()=>geometry.push('fill'),stroke:()=>geometry.push('stroke'),fillRect:()=>geometry.push('rect'),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});return{ctx,text,paints,geometry};}let cases=0;for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const mode of['belt','duel'])for(const tier of['low','balanced','high'])for(const available of[true,false])for(const type of['command-hit','target-hit'])for(const side of['player','enemy']){loaded=available;unloadArtAsset(key);preloadArtAssets([key]);runtimeQuality.setTier(tier);const s=new Stage1Scene(quiet,{},c,c.superArts[0],1);s.phase=mode;s.world.rules.mode=mode;const move={...normalFor('mp',false,c.id),label:'READABLE MOVE'};s.world.player.startMove(move);s.world.playerComboHits=3;s.world.playerComboDamage=120;s.world.playerComboTimer=60;s.world.events.splice(0,s.world.events.length,...[0,1,2].map(n=>({type,x:500+n*12,y:400,power:92,ttl:16-n*3,label:'READABLE MOVE',attackerSide:side,moveId:'FIXTURE',audioPlayed:false})));const before=JSON.stringify(s.world.events),world=context();s.drawFx(world.ctx);assert(!world.text.some(t=>t.text==='READABLE MOVE'),'Move labels must not obscure bodies: '+c.id+'/'+type+'/'+side+'/'+available);assert(available?world.paints.length===3:world.geometry.length>0,'Impact feedback remains visible');assert.equal(JSON.stringify(s.world.events),before,'Rendering must preserve events, audio labels and TTL');const hud=context();s.drawHudPortrait=()=>{};s.drawHud(hud.ctx);assert.equal(hud.text.filter(t=>t.text==='READABLE MOVE').length,1,'Current move stays once in HUD');assert(hud.text.some(t=>t.text==='READABLE MOVE'&&t.x===640&&t.y===139));assert(hud.text.some(t=>t.text==='3 HIT'));assert(hud.text.some(t=>t.text==='120 DAMAGE'));cases++;}
let critical=0;loaded=true;unloadArtAsset(key);preloadArtAssets([key]);for(const tier of['low','balanced','high'])for(const[type,want]of[['counter','COUNTER!'],['throw-escape','THROW ESCAPE!'],['super-impact','SUPER NAME'],['boss-warning','DANGER'],['boss-burst','BURST'],['juggle','JUGGLE'],['wall-bounce','WALL BOUNCE'],['ground-bounce','GROUND BOUNCE'],['ko','K.O.']]){runtimeQuality.setTier(tier);const c=CHARACTERS[0],s=new Stage1Scene(quiet,{},c,c.superArts[0],1);s.world.events.splice(0,s.world.events.length,{type,x:500,y:400,power:100,ttl:16,label:type==='super-impact'?want:type.startsWith('boss-')?want:undefined});const r=context();s.drawFx(r.ctx);assert(r.text.some(t=>t.text===want),'Critical combat outcome stays visible '+type);critical++;}for(const type of['parry','red-parry','hit','air-hit','block']){const c=CHARACTERS[0],s=new Stage1Scene(quiet,{},c,c.superArts[0],1);s.world.events.push({type,x:500,y:400,power:92,ttl:16});const r=context();s.drawFx(r.ctx);assert(r.paints.length>0||r.geometry.length>0,'Other impact feedback stays visible '+type);}console.log('COMBAT_LABEL_READABILITY_PASS',{cases,characters:10,qualityTiers:3,critical,otherImpacts:5});

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
