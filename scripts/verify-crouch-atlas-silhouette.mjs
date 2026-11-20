import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {attackSpriteSample} from '../dist/assets/render/AttackSpriteProfiles.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const record=process.argv.includes('--record-standing'),standing=[];let crouchFrames=0,standingFrames=0,authoredFrames=0;const buttons=['lp','mp','hp','lk','mk','hk'];
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of [-1,1])for(const button of buttons)for(const crouch of [false,true]){const f=new Fighter(c,'player',400,500,face),m=normalFor(button,crouch,c.id);f.startMove(m);for(let frame=0;frame<m.startup+m.active+m.recovery;frame++){f.moveFrame=frame;const before=JSON.stringify(f),sample=attackSpriteSample(f),seq=animationSequenceSample(f,0);assert.equal(JSON.stringify(f),before);if(crouch){if(!record)assert.equal(sample.useAtlas,false,c.id+' '+m.id+' frame '+frame+' must retain crouched articulated or authored silhouette');crouchFrames++;if(seq)authoredFrames++;}else{standing.push([c.id,face,button,frame,sample]);standingFrames++;}}}
if(record)console.log(JSON.stringify(standing));else console.log('CROUCH_ATLAS_SILHOUETTE_PASS',JSON.stringify({crouchFrames,standingFrames,authoredFrames,characters:10,facings:2,buttons:6,renderSamplingPure:true}));
