import assert from 'node:assert/strict';
import {TitleScene} from '../dist/assets/scenes/TitleScene.js';
const audio={unlock:()=>Promise.resolve(),startFrontendTheme(){},stopFrontendTheme(){}};
const modes=[];const scene=new TitleScene({},audio,[{id:'new-game',enabled:true}],undefined,undefined,active=>modes.push(active));
scene.enter();assert.deepEqual(modes,[true],'Entering title must request compact menu controls');
scene.exit();assert.deepEqual(modes,[true,false],'Leaving title must restore controls for the next screen');
scene.enter();scene.destroy();assert.deepEqual(modes,[true,false,true,false],'Destroyed title must release its menu mode');
console.log('TITLE_TOUCH_MODE_PASS',{enterExitDestroy:true});
