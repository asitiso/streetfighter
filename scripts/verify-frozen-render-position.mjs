import assert from 'node:assert/strict';
import {CHARACTERS} from '../dist/assets/game/characters.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const audio=new Proxy({},{get:()=>()=>{}}), input={pressed:()=>false,held:()=>false,released:()=>false,historyEpoch:0,directionChanges:()=>[]};
let cases=0;
for(const character of CHARACTERS) for(const mode of ['paused','unpause','freeze','last-freeze','active']) {
 const scene=new Stage1Scene({...input,pressed:k=>mode==='unpause'&&k==='start'},audio,character,character.superArts[0]);scene.introFrames=0;
 for(const name of Object.getOwnPropertyNames(Stage1Scene.prototype))if(name.startsWith('draw'))scene[name]=()=>{};
 if(mode==='paused')scene.paused=true;
 if(mode==='unpause'){scene.paused=true;scene.fixedUpdate(1/60,1);assert.equal(scene.paused,false);}
 if(mode==='freeze')scene.world.superFreezeFrames=5;
 if(mode==='last-freeze'){scene.world.superFreezeFrames=1;scene.fixedUpdate(1/60,1);assert.equal(scene.world.superFreezeFrames,0);}
 for(const fighter of [...scene.world.enemies,scene.world.player]){fighter.previousX=fighter.x-12;fighter.previousY=fighter.y-6;}
 const render=alpha=>{const points=[],gradient={addColorStop(){}};const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:k==='translate'?(...v)=>points.push(v):k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:()=>{}});scene.render({ctx,width:1280,height:720,dpr:1},alpha);return points;};
 const first=render(.1),second=render(.9);assert(first.length>2,'Real body translations must be observed');
 if(mode==='active')assert.notDeepEqual(first,second,'Normal movement must retain interpolation');else assert.deepEqual(first,second,character.id+'/'+mode+' frozen body must not interpolate its previous movement');
 scene.destroy();cases++;
}
console.log(JSON.stringify({passed:true,cases,roster:CHARACTERS.length,paused:true,superFreeze:true,lastFreezeTick:true,activeInterpolationPreserved:true}));

let cameraClockCases=0;
const cameraState=s=>Object.fromEntries(Object.entries(s).filter(([key])=>key.startsWith('camera')||key.startsWith('superCamera')||key==='hitPulse'));
for(const character of CHARACTERS)for(const stage of [1,2,3,4,5])for(const mode of ['belt','duel']){
 const scenes=[0,1,4].map(()=>{const s=new Stage1Scene(input,audio,character,character.superArts[0],stage);s.introFrames=0;s.phase=mode;s.world.rules.mode=mode;s.cameraFocusFrames=0;s.cameraFocusZoom=1.2;return s;});
 const before=cameraState(scenes[1]);scenes[1].cameraPresentation(0);assert.deepEqual(cameraState(scenes[1]),before,'Rendering cannot advance camera recovery');
 for(let tick=0;tick<14;tick++)for(const [index,s]of scenes.entries()){s.tickCameraPresentation();for(let n=0;n<[0,1,4][index];n++)s.cameraPresentation(0);}
 assert(Math.abs(scenes[0].cameraFocusZoom-(1+.2*.85**14))<1e-12,'Recovery advances once per fixed camera tick');
 for(const s of scenes)s.triggerCameraForEvent({type:'hit',x:640,y:350,power:30,ttl:16});
 assert.deepEqual(cameraState(scenes[0]),cameraState(scenes[1]),'Skipped renders cannot change next hit camera');assert.deepEqual(cameraState(scenes[0]),cameraState(scenes[2]),'High render rates cannot change next hit camera');assert.deepEqual(scenes[0].cameraPresentation(0),scenes[2].cameraPresentation(0));
 for(const s of scenes){s.paused=true;const paused=cameraState(s);s.fixedUpdate(1/60,100);assert.deepEqual(cameraState(s),paused,'Paused combat retains camera pose');s.destroy();}cameraClockCases++;
}
console.log('CAMERA_RENDER_CLOCK_PASS',{cameraClockCases,renderSchedules:[0,1,4],readOnlyRendering:true,pausedPosePreserved:true});
let cameraExpiryCases=0;
for(const character of CHARACTERS)for(const stage of [1,2,3,4,5])for(const mode of ['belt','duel']){
 const s=new Stage1Scene(input,audio,character,character.superArts[0],stage);s.phase=mode;s.world.rules.mode=mode;s.cameraFocusFrames=1;s.cameraFocusZoom=1.2;assert.equal(s.cameraPresentation(0).zoom,1.2);s.tickCameraPresentation();assert.equal(s.cameraFocusFrames,0);assert(Math.abs(s.cameraFocusZoom-1.17)<1e-12);assert(Math.abs(s.cameraPresentation(0).zoom-1.17)<1e-12,'Zoom must ease home instead of snapping at focus expiry');s.triggerCameraForEvent({type:'hit',x:640,y:350,power:30,ttl:16});assert(Math.abs(s.cameraPresentation(0).zoom-1.17)<1e-12,'Same-tick hit uses current recovered zoom');s.destroy();cameraExpiryCases++;
}
console.log('CAMERA_FOCUS_EXPIRY_PASS',{cameraExpiryCases,smoothReturn:true,sameTickHit:true});
let cameraPanExpiryCases=0;
for(const character of CHARACTERS)for(const stage of [1,2,3,4,5])for(const mode of ['belt','duel']){
 const s=new Stage1Scene(input,audio,character,character.superArts[0],stage);s.phase=mode;s.world.rules.mode=mode;s.cameraFocusZoom=1;s.cameraFocusFrames=0;const base=s.cameraPresentation(0);s.cameraFocusX=360;s.cameraFocusY=400;s.cameraFocusFrames=6;const start=s.cameraPresentation(0);assert(Math.abs((start.panX-base.panX)-280*Math.min(.34,.13+6/110))<1e-12,'Initial hit emphasis remains unchanged');let last=Infinity;for(let frame=6;frame>0;frame--){s.cameraFocusFrames=frame;const offset=Math.abs(s.cameraPresentation(0).panX-base.panX);assert(offset<=last,'Focus pan settles monotonically');last=offset;}assert(last<3,'Last focus tick cannot snap roughly39 pixels');s.cameraFocusFrames=0;assert.deepEqual(s.cameraPresentation(0),base,'Expired pan returns to base framing');s.destroy();cameraPanExpiryCases++;
}
console.log('CAMERA_PAN_EXPIRY_PASS',{cameraPanExpiryCases,initialHitEmphasisPreserved:true,lastTickOffsetBelow3:true});