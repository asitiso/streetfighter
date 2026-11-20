import assert from 'node:assert/strict';
import {getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {targetComboFollowUp} from '../dist/assets/combat/TechniqueLibrary.js';
const rows=[['RYU','mp','hp'],['KEN','lp','mp'],['CHUNLI','mp','mk'],['ALEX','mp','hp'],['DUDLEY','lp','mp'],['MAKOTO','mp','hp'],['IBUKI','mp','mk'],['YUN','lp','mp']],q={held:()=>false,pressed:()=>false,released:()=>false};
function fixture(id,base,face,mode,art,hit){
 const c=getCharacter(id),w=new CombatWorld(c,c,mode,c.superArts[art-1]),f=w.player,e=w.enemy;f.x=f.previousX=500;e.x=e.previousX=500+(hit?58:400)*face;f.y=f.previousY=e.y=e.previousY=500;const ai=e.updateAiDirected.bind(e);e.updateAiDirected=(t,r,d)=>ai(t,r,{...d,desiredX:e.x,desiredY:e.y,attackAllowed:false,rangedAllowed:false});w.enemyDefenseDecision=()=>false;let tick=0;
 const step=(held=[],pressed=[])=>w.update({...q,held:k=>held.includes(k),pressed:k=>pressed.includes(k)},tick++);
 if(hit){step([],[base]);while(!f.attackConnected&&tick<80)step();assert(f.attackConnected&&e.hp<e.maxHp);while(f.hitStop>0)step();}
 return{c,w,f,step,jumpTicks:n=>tick+=n};
}
function command(s,face,button,twice=false,ex=false){const forward=face===1?'right':'left',motion=[['down'],['down',forward],[forward]],steps=twice?[...motion,...motion]:motion;for(const held of steps.slice(0,-1))s.step(held);s.step([...steps.at(-1),button,...(ex?[button==='lp'?'mp':'lp']:[])],[button]);}
let exCases=0,superCases=0,partialCases=0,staleCases=0,installCases=0;
for(const[id,base,target]of rows)for(const face of[-1,1])for(const mode of['belt','duel']){
 const punch=target.endsWith('p')?target:'hp';
 for(const budget of[0,24,25]){const s=fixture(id,base,face,mode,1,true);s.f.superGauge=budget;command(s,face,punch,false,true);const specials=specialMovesFor(id);assert.equal(s.f.currentMove.id,budget>=25?specials.exPrimary.id:specials.primary.id);assert.equal(s.f.superGauge,budget-(budget>=25?25:0));exCases++;}
 for(const art of[1,2,3]){const cost=getCharacter(id).superArts[art-1].gauge;for(const budget of[cost-1,cost]){const ground=fixture(id,base,face,mode,art,false),cancel=fixture(id,base,face,mode,art,true);ground.f.superGauge=cancel.f.superGauge=budget;command(ground,face,punch,true);command(cancel,face,punch,true);assert.equal(cancel.f.currentMove.id,ground.f.currentMove.id,'same affordable command selection while canceling');assert.equal(cancel.f.superGauge,ground.f.superGauge);assert(cancel.f.superGauge>=0);if(budget===cost)assert.equal(cancel.f.currentMove.id,id+'_SA'+art);superCases++;}}
 const forward=face===1?'right':'left';for(const prefix of[[['down'],[forward]],[['down'],['down',forward]],[[forward],['down']]]){const s=fixture(id,base,face,mode,1,true),expected=targetComboFollowUp(id,s.f.currentMove.id,target).id,gauge=s.f.superGauge;for(const held of prefix)s.step(held);s.step([],[target]);assert.equal(s.f.currentMove.id,expected,'incomplete command preserves target combo');assert.equal(s.f.superGauge,gauge);partialCases++;}
 const s=fixture(id,base,face,mode,1,true),expected=targetComboFollowUp(id,s.f.currentMove.id,target).id;s.step(['down']);s.step(['down',forward]);s.step([forward]);s.jumpTicks(40);s.step([],[target]);assert.equal(s.f.currentMove.id,expected,'paused elapsed ticks expire old motion before target button');staleCases++;
}
for(const id of['YUN','MAKOTO'])for(const face of[-1,1])for(const mode of['belt','duel']){const s=fixture(id,'lp',face,mode,3,false);s.f.superGauge=s.f.superGaugeMax;command(s,face,'lp',true);assert.equal(s.f.currentMove.id,id+'_SA3');let ticks=0;while(s.f.currentMove||s.w.superFreezeFrames>0){s.step();assert(++ticks<120);}const gauge=s.f.superGauge;s.step([],['lp']);assert.equal(s.f.currentMove.id,'5LP','completed install command must not spend another stock on a new punch');assert.equal(s.f.superGauge,gauge);installCases++;}
console.log(JSON.stringify({passed:true,exCases,superCases,partialCases,staleCases,installCases}));
