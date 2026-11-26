import assert from'node:assert/strict';import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';import{Fighter}from'../dist/assets/combat/Fighter.js';import{CHARACTERS,BOSS_CHARACTERS,getCharacter}from'../dist/assets/game/characters.js';import{normalFor,specialMovesFor,throwMoveFor}from'../dist/assets/combat/MoveLibrary.js';import{Stage1Scene}from'../dist/assets/scenes/Stage1Scene.js';const q={held:()=>false,pressed:()=>false,released:()=>false,historyEpoch:0,directionChanges:()=>[]};let cases=0;
function setup(c,face,kind){const w=new CombatWorld(c,getCharacter('RYU'),'belt'),p=w.player;p.x=p.previousX=600;p.y=495;p.facing=face;const far=w.enemies[0];far.x=600+face*420;far.y=495;const target=new Fighter(getCharacter('RYU'),'enemy',600+face*(kind==='projectile'?160:58),495,-face);target.hp=target.maxHp=2000;w.enemies.push(target);for(const e of w.enemies){e.updateAi=()=>{};e.updateAiDirected=()=>{};e.aiCooldown=0;}w.enemyDefenseDecision=()=>false;return{w,p,target,far};}
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1]){const{w,p,target,far}=setup(c,face,'melee');assert.equal(w.focusedEnemy,target,'Belt HUD must initially identify nearest live threat, not array order');p.startMove(normalFor('lp',false,c.id));let n=0;while(target.hp===target.maxHp){w.update(q,n++);assert(n<80);}assert.equal(w.focusedEnemy,target);assert.equal(w.lastPlayerTargetUid,target.uid);assert.equal(w.comboLinkProgress,1);const before=JSON.stringify([p.x,p.y,p.hp,p.superGauge,p.moveFrame,p.animationFrame,w.playerComboTimer,w.enemies.map(e=>[e.x,e.y,e.hp,e.state])]);for(let i=0;i<50;i++){void w.focusedEnemy;void w.comboLinkProgress;}assert.equal(JSON.stringify([p.x,p.y,p.hp,p.superGauge,p.moveFrame,p.animationFrame,w.playerComboTimer,w.enemies.map(e=>[e.x,e.y,e.hp,e.state])]),before,'HUD reads cannot alter combat');w.playerComboTimer=41;assert.equal(w.comboLinkProgress,.5);w.playerComboTimer=0;assert.equal(w.comboLinkProgress,0);target.hp=0;assert.equal(w.focusedEnemy,far,'Defeated target cannot pin the target panel');w.replaceEnemies([{character:getCharacter('YUN'),x:700,y:495,hp:300}]);assert.equal(w.lastPlayerTargetUid,null);assert.equal(w.focusedEnemy,w.enemies[0]);cases++;}
for(const id of['RYU','KEN','CHUNLI','IBUKI','URIEN','GILL'])for(const face of[-1,1]){const{w,p,target}=setup(getCharacter(id),face,'projectile');p.startMove(specialMovesFor(id).primary);let n=0;while(target.hp===target.maxHp){w.update(q,n++);assert(n<100);}assert.equal(w.lastPlayerTargetUid,target.uid,'Projectile damage owns HUD focus');assert.equal(w.focusedEnemy,target);cases++;}
{const c=getCharacter('KEN'),w=new CombatWorld(c,c,'belt'),p=w.player;p.x=p.previousX=600;p.y=495;w.enemies[0].x=658;w.enemies[0].y=495;const second=new Fighter(c,'enemy',758,495,-1);w.enemies.push(second);for(const e of w.enemies){e.hp=e.maxHp=2000;e.aiCooldown=0;e.updateAi=()=>{};e.updateAiDirected=()=>{};}w.enemyDefenseDecision=()=>false;p.startMove(throwMoveFor('KEN'));let n=0;while(second.hp===2000){w.update(q,n++);assert(n<80);}assert.equal(w.lastPlayerTargetUid,second.uid,'Thrown-body collateral damage updates focus');cases++;}
{const c=getCharacter('KEN'),scene=new Stage1Scene(q,{},c,c.superArts[0],1),texts=[],bars=[];scene.world.enemies[0].character=getCharacter('DUDLEY');scene.world.enemies[0].hp=120;scene.world.enemies[0].maxHp=300;scene.drawHudPortrait=()=>{};scene.drawSuperMeter=()=>{};scene.drawHudHp=(...args)=>bars.push(args);const ctx={save(){},restore(){},createLinearGradient(){return{addColorStop(){}}},beginPath(){},roundRect(){},fill(){},stroke(){},fillRect(){},fillText:t=>texts.push(t)};scene.drawBeltHud(ctx,scene.world.player);assert(texts.includes('DUDLEY'),'Target name must be readable in HUD');assert(bars.some(b=>b[4]===.4),'Target bar must show actual target HP');cases++;}
console.log('COMBAT_READABILITY_PASS',{cases,characters:10,facings:2,projectiles:12});


// The camera's full transform must keep the painted stage behind the viewport.
const cameraCharacter = getCharacter('KEN');
let cameraCases = 0;
for (const stageId of [1, 2, 3, 4, 5]) for (const mode of ['duel', 'belt']) {
  for (const side of [-1, 1]) for (const effect of ['super', 'bounce', 'shake']) {
    const s = new Stage1Scene(q, {}, cameraCharacter, cameraCharacter.superArts[0], stageId);
    s.phase = mode;
    s.world.rules.mode = mode;
    const width = mode === 'belt' ? s.stageLength : 1280;
    const scroll = mode === 'duel' ? 0 : side < 0 ? 0 : width - 1280;
    const {player, enemy} = s.world;
    player.x = side < 0 ? 130 : width - 130;
    enemy.x = player.x - side * 70;
    if (effect === 'super') {
      s.superCameraFrames = 12;
      s.superCameraZoom = 1.14;
      s.superCameraForward = -side * 32;
      s.superCameraPanY = side * 65;
      s.cameraFocusFrames = 48;
      s.cameraFocusX = player.x;
      s.cameraFocusY = 350 + side * 240;
    } else if (effect === 'bounce') {
      s.cameraCatchFrames = 12;
      s.cameraCatchTotal = 24;
      s.cameraCatchX = player.x;
      s.cameraCatchY = 350 + side * 230;
      s.cameraCatchZoom = 1.07;
    }
    s.cameraKickFrames = 10;
    s.cameraKickPower = 10;
    s.hitPulse = 8;
    const camera = s.cameraPresentation(scroll);
    const {panX: x, panY: y} = camera;
    const projectX = value => 640 + (value - scroll - 640 + x) * camera.zoom;
    const projectY = value => 360 + (value - 360 + y) * camera.zoom;
    const label = [stageId, mode, side, effect].join('/');
    assert(projectX(0) <= 1e-6, 'Left stage edge must cover the viewport ' + label);
    assert(projectX(width) >= 1280 - 1e-6, 'Right stage edge must cover the viewport ' + label);
    assert(projectY(0) <= 1e-6, 'Top stage edge must cover the viewport ' + label);
    assert(projectY(720) >= 720 - 1e-6, 'Bottom stage edge must cover the viewport ' + label);
    cameraCases++;
  }
}
const centeredCamera = new Stage1Scene(q, {}, cameraCharacter, cameraCharacter.superArts[0], 1);
centeredCamera.cameraFocusZoom = 1.1;
centeredCamera.cameraKickFrames = 6;
centeredCamera.cameraKickPower = 8;
const centered = centeredCamera.cameraPresentation(900);
assert(Math.abs(centered.panX - Math.sin(6 * 2.73) * 4) < 1e-6);
assert(Math.abs(centered.panY - Math.cos(6 * 2.73 * 1.43) * 4 * .42) < 1e-6);
console.log('STAGE_CAMERA_COVERAGE_PASS', {cameraCases, centeredShakePreserved:true});
