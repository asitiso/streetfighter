import assert from 'node:assert/strict';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {runtimeQuality} from '../dist/assets/core/RuntimeQuality.js';
runtimeQuality.setTier('high',true);
let cases=0;const close=(a,b,label)=>assert(Math.abs(a-b)<1e-7,label+': '+a+' vs '+b);
for(const [width,height]of [[1024,768],[1024,720],[960,640],[1280,720],[1920,1080],[2048,720],[640,360],[568,320],[979,710],[1200,1600]])for(const dpr of [1,1.5,2]){
 const app=Object.create(GameApp.prototype),matrices=[],clears=[];let rendered;
 const logicalHeight=720,logicalWidth=Math.max(1280,Math.round(logicalHeight*width/height));
 Object.assign(app,{canvas:{width:Math.round(width*dpr),height:Math.round(height*dpr)},logicalWidth,logicalHeight,dpr,viewScale:Math.min(width/logicalWidth,height/logicalHeight),ctx:{setTransform(...a){matrices.push(a);},clearRect(...a){clears.push(a);}},telemetry:{sampleFrame(){}},scenes:{render(...a){rendered=a;}}});
 app.render(.4,1/60);const [a,b,c,d,x,y]=matrices.at(-1),right=x+a*logicalWidth,bottom=y+d*logicalHeight;
 assert.equal(b,0);assert.equal(c,0);close(a,d,'Uniform aspect scale');assert(x>=-1e-7&&y>=-1e-7);assert(right<=app.canvas.width+1e-7&&bottom<=app.canvas.height+1e-7,'Whole logical viewport remains inside canvas');close(x,app.canvas.width-right,'Centered horizontal margins');close(y,app.canvas.height-bottom,'Centered vertical margins');
 assert.deepEqual(clears,[[0,0,app.canvas.width,app.canvas.height]],'Clear letterbox as well as scene');assert.equal(rendered[0].width,logicalWidth);assert.equal(rendered[0].height,720);assert.equal(rendered[1],.4);assert.equal(rendered[2],1/60);cases++;
}
console.log(JSON.stringify({ok:true,cases,checks:['whole scene inside canvas','uniform scaling','centered margins','full canvas clear','logical scene dimensions and interpolation unchanged']}));
