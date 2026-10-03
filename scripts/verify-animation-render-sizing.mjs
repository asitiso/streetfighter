import assert from 'node:assert/strict';
import { animationSequencesFor } from '../dist/assets/render/AnimationSequenceLibrary.js';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
const sequences=new Map(['CHUNLI','KEN'].flatMap(id=>animationSequencesFor(id,false)).map(s=>[s.asset,s]));
globalThis.Image=class {
  complete=true;
  set src(value) { this.url=value; const seq=sequences.get(value); this.naturalWidth=seq ? seq.frameWidth*seq.frameCount : 384; this.naturalHeight=448; this.onload?.(); }
  get src() { return this.url; }
};
const { runtimeQuality }=await import('../dist/assets/core/RuntimeQuality.js');
const { drawCombatFighter }=await import('../dist/assets/render/Visuals.js');
runtimeQuality.setTier('high');
for(const id of ['CHUNLI','KEN']) {
  const def=getCharacter(id), fighter=new Fighter(def,'player',300,460,1,def.superArts[0]);
  const calls=[],translations=[];
  const ctx=new Proxy({globalAlpha:1,translate:(...args)=>translations.push(args),drawImage:(...args)=>calls.push(args),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{})});
  for(const facing of [-1,1]) {
    fighter.facing=facing; fighter.state='idle'; fighter.stateFrame=0;
    drawCombatFighter(ctx,fighter,0,0);
    let call=calls.findLast(c=>c[0].src?.includes(`/animation-hq/${id.toLowerCase()}/idle.webp`));
    assert.ok(call,`${id} idle must use authored strip`);
    assert.deepEqual(call.slice(5),[-96,-220,192,224]);
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
