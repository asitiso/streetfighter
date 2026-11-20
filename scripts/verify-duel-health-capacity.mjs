import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],audio=new Proxy({},{get:()=>()=>{}}),input={pressed:()=>false,held:()=>false,released:()=>false};let cases=0,finalControls=0;
for(const c of roster)for(let stage=1;stage<=5;stage++){
 const s=new Stage1Scene(input,audio,c,c.superArts[0],stage),p=s.world.player;p.hp=Math.round(p.maxHp*.6);p.superGauge=37;const playerHp=p.hp,playerMax=p.maxHp;s.prepareDuel();const w=s.world,e=w.enemy;assert.equal(e.hp,1000,'Existing duel opponent health must remain unchanged');assert.equal(e.maxHp,1000,c.id+'/'+stage+'/'+e.character.id+' duel capacity must match configured starting health');assert.equal(e.hp/e.maxHp,1,'A new opponent starts with a full HP bar');assert.equal(w.player.hp,playerHp);assert.equal(w.player.maxHp,playerMax);assert.equal(w.player.superGauge,37);e.hp=500;assert.equal(e.hp/e.maxHp,.5,'500 HP is half of the configured1000 HP');s.destroy();cases++;
}
for(const c of roster){const s=new Stage1Scene(input,audio,c,c.superArts[0],5),p=s.world.player;p.hp=Math.round(p.maxHp*.6);p.superGauge=37;const hp=p.hp,max=p.maxHp;s.prepareFinalDuel();assert.equal(s.world.enemy.character.id,'GILL');assert.equal(s.world.enemy.hp,1500);assert.equal(s.world.enemy.maxHp,1500);assert.equal(s.world.player.hp,hp);assert.equal(s.world.player.maxHp,max);assert.equal(s.world.player.superGauge,37);s.destroy();finalControls++;}
console.log(JSON.stringify({passed:true,cases,finalControls,roster:10,stages:5,duelHealthUnchanged:1000,finalBossHealthUnchanged:1500,playerHealthAndGaugePreserved:true}));
