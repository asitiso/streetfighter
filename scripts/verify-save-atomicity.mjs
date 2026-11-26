import assert from'node:assert/strict';import{SaveManager,DEFAULT_SAVE,encodeSaveRecord,decodeSaveRecord,createPortableSave}from'../dist/assets/save/SaveManager.js';
class MemoryDatabase{records=new Map();transactions=[];running=false;failPut=0;transaction(_store,mode){const db=this,ops=[],tx={mode,error:null,aborted:false,oncomplete:null,onerror:null,onabort:null,objectStore(){return{get(key){return add('get',key)},put(value,key){return add('put',key,structuredClone(value))}}},abort(){if(tx.aborted)return;tx.aborted=true;queueMicrotask(()=>finish());}};function add(kind,key,value){const request={result:undefined,error:null,onsuccess:null,onerror:null};ops.push({kind,key,value,request});return request;}let ended=false;const entry={run(){const draft=new Map([...db.records].map(([k,v])=>[k,structuredClone(v)]));function step(){if(tx.aborted){finish();return;}const op=ops.shift();if(!op){if(mode==='readwrite')db.records=draft;ended=true;tx.oncomplete?.();db.running=false;queueMicrotask(()=>db.next());return;}if(op.kind==='put'&&db.failPut>0&&--db.failPut===0){tx.error=new DOMException('injected write failure','QuotaExceededError');op.request.error=tx.error;op.request.onerror?.();tx.onerror?.();tx.aborted=true;finish();return;}op.request.result=op.kind==='get'?structuredClone(draft.get(op.key)):(draft.set(op.key,op.value),op.key);op.request.onsuccess?.();queueMicrotask(step);}queueMicrotask(step);}};function finish(){if(ended)return;ended=true;tx.onabort?.();db.running=false;queueMicrotask(()=>db.next());}db.transactions.push(entry);queueMicrotask(()=>db.next());return tx;}next(){if(this.running)return;const next=this.transactions.shift();if(next){this.running=true;next.run();}}}
function manager(db){const s=new SaveManager();s.db=db;return s;}function seeded(data=DEFAULT_SAVE){const db=new MemoryDatabase();db.records.set('profile',encodeSaveRecord(data));db.records.set('profile-backup',encodeSaveRecord(DEFAULT_SAVE));return db;}function raw(db,key='profile'){return decodeSaveRecord(db.records.get(key))?.save;}
const patches=[{audioEnabled:false},{vibrationEnabled:false},{selectedCharacter:'CHUNLI'},{selectedSuperArt:3},{touchOpacity:.35},{currentStage:4},{hasCampaignStarted:true},{controlScale:1.3}];let batches=0;
for(const count of[2,4,8])for(const connections of[1,2,4]){const db=seeded(),s=Array.from({length:connections},()=>manager(db)),results=await Promise.all(patches.slice(0,count).map((p,i)=>s[i%connections].write(p)));let expected={...DEFAULT_SAVE};for(let i=0;i<count;i++){expected={...expected,...patches[i]};assert.deepEqual(results[i],expected,'Each saved result must include earlier completed patches');}assert.deepEqual(raw(db),expected,'Concurrent disjoint changes must all survive');assert.deepEqual(raw(db,'profile-backup'),{...DEFAULT_SAVE,...Object.assign({},...patches.slice(0,count-1))},'Backup must be immediately previous committed save');batches++;}
let orderingControls=0,recoveryControls=0,rollbackControls=0,exportControls=0;
{const db=seeded({...DEFAULT_SAVE,selectedCharacter:'CHUNLI'}),a=manager(db),b=manager(db),values=[false,true,false,true,false,true,false,true];const rows=await Promise.all(values.map((v,i)=>(i%2?a:b).write({audioEnabled:v})));for(let i=0;i<values.length;i++)assert.equal(rows[i].audioEnabled,values[i]);assert.equal(raw(db).audioEnabled,true);assert.equal(raw(db,'profile-backup').audioEnabled,false);orderingControls++;}
{const db=seeded(),a=manager(db),b=manager(db),imported={...DEFAULT_SAVE,selectedCharacter:'CHUNLI',selectedSuperArt:2,currentStage:3,completedStages:[1,2],hasCampaignStarted:true};const rows=await Promise.all([a.write({audioEnabled:false}),b.importPortable(JSON.stringify(createPortableSave(imported))),a.write({vibrationEnabled:false})]);assert.equal(rows[0].audioEnabled,false);assert.deepEqual(rows[1],imported);assert.deepEqual(raw(db),{...imported,vibrationEnabled:false});assert.deepEqual(raw(db,'profile-backup'),imported);const before=structuredClone(db.records);const bad=createPortableSave(imported);bad.data.currentStage=5;await assert.rejects(a.importPortable(JSON.stringify(bad)),/CHECKSUM/);assert.deepEqual(db.records,before);await a.write({touchOpacity:.4});assert.equal(raw(db).touchOpacity,.4);orderingControls++;}
for(const kind of['corrupt','legacy'])for(const reverse of[false,true]){const base={...DEFAULT_SAVE,selectedCharacter:kind==='legacy'?'CHUN-LI':'CHUNLI',selectedSuperArt:3,currentStage:3,completedStages:[1,2],hasCampaignStarted:true},db=seeded();db.records.set('profile',kind==='legacy'?structuredClone(base):{...encodeSaveRecord(base),checksum:'invalid'});db.records.set('profile-backup',encodeSaveRecord(base));const a=manager(db),b=manager(db),operations=reverse?[b.write({audioEnabled:false}),a.load()]:[a.load(),b.write({audioEnabled:false})];await Promise.all(operations);assert.deepEqual(await a.load(),{...base,audioEnabled:false},'Load repair cannot overwrite a newer committed save');assert.deepEqual(raw(db,'profile-backup'),base);recoveryControls++;}
{const db=seeded(),m=manager(db);await m.load();const before=structuredClone(db.records),health=m.health;db.failPut=2;await assert.rejects(m.write({audioEnabled:false}),/injected write failure/);assert.deepEqual(db.records,before,'Abort rolls back primary and backup together');assert.deepEqual(m.health,health);await m.write({vibrationEnabled:false});assert.equal(raw(db).vibrationEnabled,false);rollbackControls++;const prior=structuredClone(db.records),bad=Object.defineProperty({},'audioEnabled',{enumerable:true,get(){throw new Error('patch getter failed')}});await assert.rejects(m.write(bad),/patch getter failed/);assert.deepEqual(db.records,prior);await m.write({audioEnabled:false});assert.equal(raw(db).audioEnabled,false);rollbackControls++;}
{const db=seeded(),base={...DEFAULT_SAVE,selectedCharacter:'CHUNLI'};db.records.set('profile',{bad:true,checksum:'bad'});db.records.set('profile-backup',encodeSaveRecord(base));const before=structuredClone(db.records),m=manager(db);db.failPut=1;await assert.rejects(m.load());assert.deepEqual(db.records,before);assert.deepEqual(await m.load(),base);rollbackControls++;}
{const db=seeded(),a=manager(db),b=manager(db);const[,file]=await Promise.all([a.write({audioEnabled:false}),b.exportPortable()]);assert.equal(JSON.parse(file.text).data.audioEnabled,false);exportControls++;}
{const m=new SaveManager();assert.deepEqual(await m.load(),DEFAULT_SAVE);await assert.rejects(m.write({audioEnabled:false}),/not initialized/);await assert.rejects(m.importPortable('{}'),/not initialized/);}
// Existing scored records seed the first comparison and survive a new campaign.
{
 const stageResult = (stageId, beltScore) => ({
  stageId, beltScore, clearSeconds: 17, defeatedEnemies: 3, damageDealt: 120, damageTaken: 30,
  maxComboHits: 2, maxComboDamage: 80, parries: 0, redParries: 0, supersUsed: 0, throwsLanded: 0,
 });
 const legacy = { ...DEFAULT_SAVE, completedStages: [1, 2], stageResults: [stageResult(1, 5000), stageResult(2, 3150)] };
 const db = seeded(legacy), first = manager(db), second = manager(db);
 assert.deepEqual(await first.load(), legacy, 'Loading a scored save keeps its previous checksum shape');
 const lower = await first.recordStageResult(stageResult(1, 2900));
 assert.deepEqual(lower.stageScoreRecords, {1:{latest:2900,best:5000},2:{latest:3150,best:3150}});
 await Promise.all([first.recordStageResult(stageResult(1, 7000)), second.recordStageResult(stageResult(1, 4100)),
  first.recordStageResult(stageResult(3, 3750))]);
 const latest = raw(db);
 assert.deepEqual(latest.stageScoreRecords, {1:{latest:4100,best:7000},2:{latest:3150,best:3150},3:{latest:3750,best:3750}});
 assert.deepEqual(latest.stageResults.map(r=>[r.stageId,r.beltScore]), [[1,4100],[2,3150],[3,3750]]);
 db.failPut = 2;
 await assert.rejects(first.recordStageResult(stageResult(1, 9000)));
 assert.deepEqual(raw(db), latest, 'A failed transaction never advances the high score');
 const reset = await first.write({ completedStages: [], stageResults: [] });
 assert.deepEqual(reset.stageScoreRecords, latest.stageScoreRecords);
 const imported = await second.importPortable(JSON.stringify(createPortableSave(reset)));
 assert.deepEqual(imported, reset, 'Portable save round-trip keeps recent and best score');
 const legacyReset = await manager(seeded(legacy)).write({completedStages:[],stageResults:[]});
 assert.deepEqual(legacyReset.stageScoreRecords, {1:{latest:5000,best:5000},2:{latest:3150,best:3150}});
}
{
 const prior = {
  ...DEFAULT_SAVE, currentStage: 5, completedStages: [1,2,3,4], hasCampaignStarted: true,
  stageScoreRecords: {2:{latest:840,best:920},5:{latest:2000,best:4600}},
 };
 const stageResult = {
  stageId: 5, beltScore: 4350, clearSeconds: 140, defeatedEnemies: 12, damageDealt: 5600, damageTaken: 820,
  maxComboHits: 7, maxComboDamage: 245, parries: 3, redParries: 0, supersUsed: 2, throwsLanded: 1,
 };
 const db = seeded(prior), save = manager(db);
 const original = structuredClone(db.records);
 db.failPut = 2;
 await assert.rejects(save.recordStageResult(stageResult, true), /injected write failure/);
 assert.deepEqual(db.records, original, 'A failed final clear must roll back both progress and score');
 const completed = await save.recordStageResult(stageResult, true);
 assert.deepEqual(completed, {
  ...prior, completedStages: [1,2,3,4,5], hasCampaignStarted: false, stageSelectUnlocked: true,
  stageResults: [stageResult], stageScoreRecords: {...prior.stageScoreRecords,5:{latest:4350,best:4600}},
 });
 assert.deepEqual(raw(db, 'profile-backup'), prior, 'Final score and unlock share one committed transaction');

 const replay = await manager(seeded(prior)).recordStageResult(stageResult);
 assert.deepEqual(replay, {...prior, stageResults: [stageResult], stageScoreRecords: completed.stageScoreRecords});
 assert.deepEqual(raw(db), completed);
 for (const stageId of [1,2,3,4]) {
  const earlier = Array.from({length:stageId-1}, (_, index) => index+1);
  const progress = {...prior, currentStage:stageId, completedStages:earlier, stageSelectUnlocked:stageId===4};
  const interimDb = seeded(progress), interimSave = manager(interimDb);
  const result = {...stageResult,stageId};
  interimDb.failPut = 2;
  await assert.rejects(interimSave.recordStageResult(result, true), /injected write failure/);
  assert.deepEqual(raw(interimDb), progress);
  const next = await interimSave.recordStageResult(result, true);
  assert.equal(next.currentStage, stageId+1);
  assert.deepEqual(next.completedStages, [...earlier,stageId]);
  assert.equal(next.hasCampaignStarted, true);
  assert.equal(next.stageSelectUnlocked, progress.stageSelectUnlocked);
  assert.deepEqual(next.stageResults, [result]);
  assert.deepEqual(next.stageScoreRecords[stageId], {latest:4350,best:4350});
  assert.deepEqual(raw(interimDb, 'profile-backup'), progress);
 }
}
console.log('SAVE_ATOMICITY_PASS',JSON.stringify({batches,orderingControls,recoveryControls,rollbackControls,exportControls,finalCampaignClear:true,interimCampaignClears:4}));