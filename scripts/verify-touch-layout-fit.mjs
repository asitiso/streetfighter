import assert from 'node:assert/strict';
import {resolveTouchLayout} from '../dist/assets/ui/TouchControls.js';
const defaults={stickScale:1,buttonScale:1,opacity:.72,stickX:38,stickY:28,buttonsX:32,buttonsY:26,vibrationEnabled:true};
const screens=[[480,270],[568,320],[640,360],[844,390],[1280,720],[1920,1080]],safes=[{left:0,right:0,top:0,bottom:0},{left:36,right:24,top:10,bottom:12},{left:0,right:44,top:4,bottom:20}];let cases=0;
for(const[width,height]of screens)for(const safe of safes)for(const stickScale of[.7,1,1.4])for(const buttonScale of[.7,1,1.4])for(const offsets of[{stickX:38,stickY:28,buttonsX:32,buttonsY:26},{stickX:2048,stickY:1024,buttonsX:2048,buttonsY:1024},{stickX:260,stickY:40,buttonsX:160,buttonsY:240},{stickX:180,stickY:640,buttonsX:180,buttonsY:26}]){
 const settings=Object.freeze({...defaults,...offsets,stickScale,buttonScale}),before=JSON.stringify(settings),r=resolveTouchLayout(settings,width,height,safe),uw=width-safe.left-safe.right,uh=height-safe.top-safe.bottom;
 assert.equal(JSON.stringify(settings),before,'Rendering must not change stored settings');assert(r.stickScale>0&&r.stickScale<=stickScale+1e-8);assert(r.buttonScale>0&&r.buttonScale<=buttonScale+1e-8);assert(r.stickScale>=.7-1e-8&&r.buttonScale>=.7-1e-8,'Supported viewports preserve minimum configured touch scale');
 const pad={left:r.stickX,right:r.stickX+r.padSize*r.stickScale,top:uh-r.stickY-r.padSize*r.stickScale,bottom:uh-r.stickY};
 const right={left:uw-r.buttonsX-r.jumpOffsetX-60*r.buttonScale,right:uw-r.buttonsX,top:uh-r.buttonsY-r.fightHeight*r.buttonScale,bottom:uh-r.buttonsY};
 for(const a of[pad,right]){assert(a.left>=8-1e-6&&a.right<=uw-8+1e-6&&a.top>=8-1e-6&&a.bottom<=uh-8+1e-6,JSON.stringify({width,height,safe,settings,r,a}));}
 const separated=pad.right+12<=right.left+1e-6||right.right+12<=pad.left+1e-6||pad.bottom+12<=right.top+1e-6||right.bottom+12<=pad.top+1e-6;
 assert(separated,'Pad and jump/attack region must not cover each other');assert(right.top>=72-1e-6,'Keep combat buttons below START');if(pad.right>uw-128)assert(pad.top>=72-1e-6,'Keep upper-right pad away from START');
 assert(Math.abs(r.jumpOffsetX-(r.fightWidth*r.buttonScale+10))<1e-8);assert(Math.abs(r.jumpOffsetY-37*r.buttonScale)<1e-8);cases++;
}
for(const scale of[.7,1,1.4]){const s={...defaults,stickScale:scale,buttonScale:scale},r=resolveTouchLayout(s,1280,720,safes[0]);for(const k of['stickX','stickY','buttonsX','buttonsY','stickScale','buttonScale'])assert.equal(r[k],s[k],'Comfortable large-screen layout remains exact');}
const small=resolveTouchLayout({...defaults,stickScale:1.4,buttonScale:1.4},640,360,safes[1]);assert.equal(small.fightWidth,180,'Short viewport uses actual52px grid width');assert.equal(resolveTouchLayout(defaults,1280,720,safes[0]).fightWidth,210);
console.log(JSON.stringify({passed:true,cases,comfortableLayoutControls:3,storedSettingsUnchanged:true,controlsSeparated:true,startKeptClear:true,shortGridWidthCorrect:true,noScaleIncrease:true,minimumTouchScalePreserved:true}));
