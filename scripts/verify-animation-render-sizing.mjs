import assert from 'node:assert/strict';
import { animationSequencesFor } from '../dist/assets/render/AnimationSequenceLibrary.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
const sequences=new Map(['CHUNLI','KEN','IBUKI'].flatMap(id=>animationSequencesFor(id,false)).map(s=>[s.asset,s]));
globalThis.Image=class {
  complete=true;
  set src(value) { this.url=value; const seq=sequences.get(value); this.naturalWidth=seq ? seq.frameWidth*seq.frameCount : 384; this.naturalHeight=448; this.onload?.(); }
  get src() { return this.url; }
};
const { runtimeQuality }=await import('../dist/assets/core/RuntimeQuality.js');
const { drawCombatFighter }=await import('../dist/assets/render/Visuals.js');
runtimeQuality.setTier('high');
for(const id of ['CHUNLI','KEN','IBUKI']) {
  const def=getCharacter(id), fighter=new Fighter(def,'player',300,460,1,def.superArts[0]);
  const calls=[],translations=[];
  const ctx=new Proxy({globalAlpha:1,translate:(...args)=>translations.push(args),drawImage:(...args)=>calls.push(args),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{})});
  for(const facing of [-1,1]) {
    fighter.facing=facing; fighter.state='idle'; fighter.stateFrame=0;
    drawCombatFighter(ctx,fighter,0,0);
    let call=calls.findLast(c=>c[0].src?.includes(`/animation-hq/${id.toLowerCase()}/idle.webp`));
    assert.ok(call,`${id} idle must use authored strip`);
    assert.deepEqual(call.slice(5),[-96,-220,192,224]);
    for(const scenario of ['ground-hit','air-hit','launch-hit']) {
      const victim=new Fighter(def,'player',600,460,facing,def.superArts[0]);
      const attacker=new Fighter(getCharacter('RYU'),'enemy',650,460,-facing);
      const quiet={held:()=>false,pressed:()=>false,released:()=>false};
      const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
      if(scenario==='air-hit') {
        victim.updatePlayer({...quiet,pressed:key=>key==='jump'},rules);
        for(let tick=0;tick<5;tick++)victim.updatePlayer(quiet,rules);
        assert.ok(victim.airborne&&victim.jumpHeight>0,'Fixture must jump before getting hit');
      }
      const move={...normalFor('lp'),hitStun:24,...(scenario==='launch-hit'?{launch:82}:{})};
      assert.equal(victim.receiveHit(move,attacker,false),'hit');
      let hitDraws=0,airDraws=0;
      for(let tick=0;tick<160;tick++) {
        calls.length=0;translations.length=0;
        drawCombatFighter(ctx,victim,0,0);
        if(victim.state==='hit') {
          const strip=calls.find(c=>c[0].src?.endsWith(`/${id.toLowerCase()}/hit.webp`));
          assert.ok(strip,`${id} ${scenario} must use its authored hit strip`);
          assert.deepEqual(strip.slice(5),[-96,-220,192,224]);hitDraws++;
          if(victim.jumpHeight>0) {
            airDraws++;
            assert.equal(translations.filter(([x,y])=>x===0&&y===-victim.jumpHeight).length,1,`${id} ${scenario} body must follow gameplay height exactly once`);
          }
        }
        if(victim.state==='idle'&&!victim.airborne&&victim.landingFrames===0)break;
        victim.updatePlayer(quiet,rules);
      }
      assert.ok(hitDraws>0);assert.equal(airDraws>0,scenario!=='ground-hit');
      assert.equal(victim.state,'idle');assert.equal(victim.jumpHeight,0);
      console.log('HIT_RENDER_HEIGHT_PASS',{id,facing,scenario,hitDraws,airDraws});
    }
    if(id==='KEN') {
      const quiet={held:()=>false,pressed:()=>false,released:()=>false};
      const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
      for(const move of [specialMovesFor(id).antiAir,superArtMoveFor(id,1),superArtMoveFor(id,2)]) {
        const rising=new Fighter(def,'player',600,460,facing,def.superArts[0]);
        rising.superGauge=rising.superGaugeMax;
        rising.startMove(move);
        assert.equal(rising.currentMove?.id,move.id,`${move.id} must actually start`);
        let airborneDraws=0,landed=false,landingDraws=0;
        for(let tick=0;tick<180;tick++) {
          calls.length=0;translations.length=0;
          drawCombatFighter(ctx,rising,0,0);
          if(rising.state==='attack'&&rising.currentMove?.id===move.id) {
            const strip=calls.find(c=>c[0].src?.endsWith('/ken/shoryuken.webp'));
            assert.ok(strip,`${move.id} must keep its authored rising strip`);
            assert.deepEqual(strip.slice(5),[-96,-220,192,224]);
            if(rising.jumpHeight>0) {
              airborneDraws++;
              assert.equal(translations.filter(([x,y])=>x===0&&y===-rising.jumpHeight).length,1,`${move.id} must follow gameplay jump height exactly once`);
            }
          }
          if(airborneDraws&&!rising.airborne)landed=true;
          if(landed&&rising.state==='idle'&&rising.landingFrames>0) {
            assert.ok(calls.some(c=>c[0].src?.endsWith('/ken/landing.webp')),'Available landing frames must render');
            landingDraws++;
          }
          // Longer Super Art recovery can consume landingFrames while the
          // attack still owns the visual; do not invent an extra landing clip.
          if(landed&&rising.state==='idle'&&rising.landingFrames===0) {
            assert.ok(calls.some(c=>c[0].src?.endsWith('/ken/idle.webp')),'Recovery must return to idle');
            break;
          }
          rising.updatePlayer(quiet,rules);
        }
        assert.ok(airborneDraws>0,`${move.id} must exercise actual airborne rendering`);
        assert.ok(landed,`${move.id} must return to ground`);
        assert.equal(rising.state,'idle');assert.equal(rising.jumpHeight,0);
        console.log('KEN_RISING_HEIGHT_PASS',{move:move.id,facing,airborneDraws,landingDraws});
      }
    }
    if(id==='IBUKI') {
      fighter.state='walk';fighter.previousX=fighter.x-facing*2;fighter.stateFrame=0;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/walk.webp'));
      assert.ok(call,'Ibuki forward walk must use authored strip');
      assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      fighter.previousX=fighter.x+facing*2;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/walk-back.webp'));
      assert.ok(call,'Ibuki retreat must use its distinct authored strip');
      assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      fighter.previousX=fighter.x;
      fighter.dashFrames=8;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/dash.webp'));
      assert.ok(call,'Ibuki dash must use authored strip');
      assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      fighter.dashFrames=0;
      fighter.state='jump';fighter.airborne=true;fighter.jumpHeight=61;fighter.jumpVelocity=3;translations.length=0;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/jump.webp'));
      assert.ok(call,'Ibuki jump needs authored strip');assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      assert.ok(translations.some(([x,y])=>x===0&&y===-61),'Jump follows physical height');
      fighter.state='idle';fighter.airborne=false;fighter.jumpHeight=0;fighter.landingFrames=7;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/landing.webp'));
      assert.ok(call,'Ibuki landing needs authored strip');assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      fighter.landingFrames=0;
      fighter.currentMove=specialMovesFor('IBUKI').primary;fighter.state='attack';fighter.moveFrame=fighter.currentMove.startup;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/hadoken.webp'));
      assert.ok(call,'Kunai release uses its wide authored strip');assert.equal(call[3],640);
      assert.deepEqual(call.slice(5),[-160,-220,320,224],'Wide Kunai preserves source pixel scale');
      fighter.currentMove=null;fighter.state='idle';
      fighter.currentMove=superArtMoveFor('IBUKI',3);fighter.state='attack';fighter.moveFrame=fighter.currentMove.startup;
      drawCombatFighter(ctx,fighter,0,0);call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/super-rush.webp'));
      assert.ok(call,'Hashin Sho uses its wide authored strip');assert.deepEqual(call.slice(5),[-160,-220,320,224]);fighter.currentMove=null;fighter.state='idle';
      fighter.currentMove=specialMovesFor('IBUKI').antiAir;fighter.state='attack';fighter.moveFrame=fighter.currentMove.startup;fighter.airborne=true;fighter.jumpHeight=61;translations.length=0;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/shoryuken.webp'));
      assert.ok(call,'Kazekiri retains authored art during flight');assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      assert.ok(translations.some(([x,y])=>x===0&&y===-61),'Kazekiri follows gameplay height');
      fighter.currentMove=null;fighter.state='idle';fighter.airborne=false;fighter.jumpHeight=0;
      fighter.currentMove=specialMovesFor('IBUKI').mobility;fighter.state='attack';fighter.moveFrame=fighter.currentMove.startup;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/ibuki/tatsumaki.webp'));
      assert.ok(call,'Tsumuji uses its wide rotation strip');assert.deepEqual(call.slice(5),[-160,-220,320,224]);
      fighter.currentMove=null;fighter.state='idle';
    }
    if(id==='CHUNLI') {
      fighter.currentMove=specialMovesFor(id).mobility; fighter.state='attack'; fighter.moveFrame=fighter.currentMove.startup;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/chunli/tatsumaki.webp'));
      assert.ok(call,'Spin must use authored strip');
      assert.equal(call[3],640);
      assert.deepEqual(call.slice(5),[-160,-220,320,224],'Wide spin must preserve the same pixel scale as idle');
      fighter.currentMove=specialMovesFor(id).antiAir; fighter.moveFrame=fighter.currentMove.startup; fighter.airborne=true; fighter.jumpHeight=61; translations.length=0;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/chunli/shoryuken.webp'));
      assert.ok(call,'Airborne rising kick must use authored strip');
      assert.ok(translations.some(([x,y])=>x===0&&y===-61),'Rising sprite must follow gameplay jump height');
      fighter.airborne=false; fighter.jumpHeight=0;
      fighter.currentMove=specialMovesFor(id).super; fighter.moveFrame=fighter.currentMove.startup;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/chunli/super-rush.webp'));
      assert.ok(call,'Houyokusen must use authored strip');
      assert.equal(call[3],640);
      assert.deepEqual(call.slice(5),[-160,-220,320,224]);
      fighter.currentMove=superArtMoveFor(id,1); fighter.moveFrame=fighter.currentMove.startup;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/chunli/kikosho.webp'));
      assert.ok(call,'SA1 must use its own authored strip');
      assert.deepEqual(call.slice(5),[-160,-220,320,224]);
      fighter.currentMove=superArtMoveFor(id,3); fighter.moveFrame=fighter.currentMove.startup; fighter.airborne=true; fighter.jumpHeight=83; translations.length=0;
      drawCombatFighter(ctx,fighter,0,0);
      call=calls.findLast(c=>c[0].src?.endsWith('/chunli/tensei-ranka.webp'));
      assert.ok(call,'Airborne SA3 must use its own authored strip');
      assert.deepEqual(call.slice(5),[-96,-220,192,224]);
      assert.ok(translations.some(([x,y])=>x===0&&y===-83),'SA3 sprite must follow gameplay jump height');
      fighter.airborne=false;fighter.jumpHeight=0;
    }
  }
}
console.log('ANIMATION_RENDER_SIZING_PASS');
