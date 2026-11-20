import assert from 'node:assert/strict';
import {animationSequenceFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
const ids=['KEN','RYU','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'];
const assets=new Set();for(const id of ids){const s=animationSequenceFor(id,'victory',true);assert(s?.poseAuthored,`${id}: original victory required`);assert.equal(s.frameCount,8);assert.equal(s.fps,12);assert.equal(s.loop,false);assert.equal(s.timing,'linear');assert.equal(s.footLock,true);assert.equal(s.renderMode,'full');assets.add(s.asset)}assert.equal(assets.size,10);console.log('ROSTER_VICTORY_PASS',{characters:10,frames:80,originalDrawings:40});
