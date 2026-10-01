const CHARACTERS = ['RYU','KEN','CHUNLI','IBUKI'];
const slug = id => id.toLowerCase();
const q = new URLSearchParams(location.search);
const els = Object.fromEntries(['character','summary','seqs','title','subtitle','authored','enabled','prev','current','next','first','prevBtn','play','nextBtn','last','scrub','frameLabel','speed','timeline','status','fps','size','source','mode','pipeline','sourceAudit','poseQa','semanticQa','handoffQa','gateReason','error'].map(id=>[id,document.getElementById(id)]));
let character = (q.get('character') || 'KEN').toUpperCase();
if (!CHARACTERS.includes(character)) character = 'KEN';
let manifest = null, sourceAudit = null, semanticAudit = null, handoffAudit = null, record = null, image = null, frame = 0, playing = false, raf = 0, last = 0, accumulator = 0;

for (const id of CHARACTERS) {
  const o=document.createElement('option'); o.value=id; o.textContent=id; if(id===character)o.selected=true; els.character.appendChild(o);
}
els.character.onchange=()=>loadCharacter(els.character.value);

function badge(el,text,kind=''){el.textContent=text;el.className=`badge ${kind}`.trim();}
function fail(err){els.error.style.display='block';els.error.textContent=String(err?.message||err);console.error(err)}
function statusOf(r){if(r.poseAuthored&&r.enabled)return ['AUTHORED • ACTIVE','good'];if(r.poseAuthored)return ['AUTHORED • GATED','warn'];if(r.stagingOnly)return ['STAGING • REJECTED','off'];return ['PILOT • DISABLED','off']}

async function loadCharacter(id){
  stop(); character=id; history.replaceState(null,'',`?character=${id}`); els.error.style.display='none';
  manifest=await fetch(`/art/animation-hq/${slug(id)}/manifest.json`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`manifest ${r.status}`);return r.json()});
  sourceAudit=null; semanticAudit=null; handoffAudit=null;
  if(id==='KEN'){
    sourceAudit=await fetch('/art/animation-hq/ken/source-audit.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    semanticAudit=await fetch('/art/animation-hq/ken/semantic-audit.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    handoffAudit=await fetch('/art/animation-hq/ken/handoff-audit.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  }
  els.seqs.innerHTML='';
  for(const r of manifest.records){
    const b=document.createElement('button'); b.className='seq'; b.dataset.id=r.id;
    const [state,kind]=statusOf(r); b.innerHTML=`<strong>${r.id.toUpperCase()}</strong><small>${r.frames}F • ${state}</small>`;
    b.onclick=()=>selectSequence(r.id); els.seqs.appendChild(b);
  }
  badge(els.summary,`${manifest.enabledFrameTotal||0}/${manifest.frameTotal||0}F ACTIVE`,manifest.enabledFrameTotal?'good':'off');
  els.pipeline.textContent=manifest.pipeline||'—';
  if(sourceAudit){
    const worst=Math.min(...sourceAudit.records.map(r=>Number(r.sourceBodyHeightMin)||0));
    els.sourceAudit.textContent=sourceAudit.safeToAutoPromote?'HQ SOURCE READY':`REFERENCE ONLY • ${worst}px < ${sourceAudit.gate.minimumBodyHeight}px`;
  }else{els.sourceAudit.textContent='—';}
  const preferred=q.get('sequence');
  const first=manifest.records.find(r=>r.id===preferred)||manifest.records[0];
  await selectSequence(first.id);
}

async function selectSequence(id){
  stop(); els.error.style.display='none'; record=manifest.records.find(r=>r.id===id); if(!record)return;
  for(const b of els.seqs.children)b.classList.toggle('active',b.dataset.id===id);
  frame=0; accumulator=0;
  image=new Image(); image.decoding='async'; image.src=`/art/animation-hq/${slug(character)}/${record.id}.webp?qa=1`; await image.decode();
  const expectedW=record.frames*record.frameSize[0], expectedH=record.frameSize[1];
  if(image.naturalWidth!==expectedW||image.naturalHeight!==expectedH)throw new Error(`${id}: expected ${expectedW}×${expectedH}, got ${image.naturalWidth}×${image.naturalHeight}`);
  els.title.textContent=`${character} • ${record.id.toUpperCase()}`;
  els.subtitle.textContent=`${record.frames} frames • strip ${image.naturalWidth}×${image.naturalHeight}`;
  badge(els.authored,record.poseAuthored?'POSE AUTHORED':'NOT AUTHORED',record.poseAuthored?'good':'off');
  badge(els.enabled,record.enabled?'RUNTIME ENABLED':'RUNTIME GATED',record.enabled?'good':'warn');
  const [state]=statusOf(record); els.status.textContent=state; els.fps.textContent=record.fps?`${record.fps} fps`:'registry-driven';
  els.size.textContent=`${record.frameSize[0]}×${record.frameSize[1]}`; els.source.textContent=record.authoredSource||record.stagingMethod||manifest.source||'—'; els.mode.textContent=record.renderMode||'—';
  const auditRec=semanticAudit?.records?.find(r=>r.sequence===record.id);
  const pose=record.poseQa||auditRec?.poseQa||null;
  const semantic=record.semanticQa||auditRec?.semanticQa||null;
  if(pose){
    els.poseQa.textContent=pose.poseAuthoredPass?`PASS • avg ${pose.affineResidualAverage}`:`FAIL • avg ${pose.affineResidualAverage} < ${pose.fullPoseAverageThreshold}`;
  }else els.poseQa.textContent='—';
  if(semantic){
    const failed=Object.entries(semantic.checks||{}).filter(([,ok])=>!ok).map(([k])=>k);
    els.semanticQa.textContent=semantic.semanticQaPass?'PASS':`FAIL • ${failed.join(', ')||'semantic gate'}`;
  }else els.semanticQa.textContent='—';
  if(character==='KEN' && record.id==='idle' && handoffAudit){
    const base=handoffAudit.fallbackBridgePass?'BASE BRIDGE PASS':'BASE BRIDGE FAIL';
    const pair=handoffAudit.pairAuthoredActive?(handoffAudit.pairPass?' • IDLE↔WALK PASS':' • IDLE↔WALK FAIL'):' • WALK PENDING';
    els.handoffQa.textContent=base+pair;
  }else if(character==='KEN' && record.id==='walk' && handoffAudit){
    els.handoffQa.textContent=handoffAudit.pairAuthoredActive?(handoffAudit.pairPass?'IDLE↔WALK PASS':'IDLE↔WALK FAIL'):'IDLE↔WALK PENDING';
  }else if(character==='KEN' && ['dash','jump','landing'].includes(record.id) && handoffAudit?.locomotion){
    const loco=handoffAudit.locomotion;
    if(record.id==='dash') els.handoffQa.textContent=loco.dashActive?(loco.dashHandoffPass?'BASE↔DASH PASS':'BASE↔DASH FAIL'):'BASE↔DASH PENDING';
    else if(record.id==='jump') els.handoffQa.textContent=loco.jumpActive?(loco.jumpHandoffPass?(loco.jumpLandingPairActive?'JUMP→LANDING PASS':'BASE↔JUMP PASS'):'JUMP HANDOFF FAIL'):'JUMP HANDOFF PENDING';
    else els.handoffQa.textContent=loco.landingActive?(loco.landingHandoffPass?'LANDING→BASE PASS':'LANDING→BASE FAIL'):'LANDING HANDOFF PENDING';
  }else if(character==='KEN' && ['walk-back','hit'].includes(record.id) && handoffAudit?.reactionAndRetreat){
    const rr=handoffAudit.reactionAndRetreat;
    if(record.id==='walk-back') els.handoffQa.textContent=rr.walkBackActive?(rr.walkBackHandoffPass?'BASE↔WALK-BACK PASS':'BASE↔WALK-BACK FAIL'):'BASE↔WALK-BACK PENDING';
    else els.handoffQa.textContent=rr.hitActive?(rr.hitHandoffPass?'BASE↔HIT PASS':'BASE↔HIT FAIL'):'BASE↔HIT PENDING';
  }else if(character==='KEN' && ['guard','parry'].includes(record.id) && handoffAudit?.defense){
    const df=handoffAudit.defense;
    if(record.id==='guard') els.handoffQa.textContent=df.guardActive?(df.guardHandoffPass?'BASE↔GUARD PASS':'BASE↔GUARD FAIL'):'BASE↔GUARD PENDING';
    else els.handoffQa.textContent=df.parryActive?(df.parryHandoffPass?'BASE↔PARRY PASS':'BASE↔PARRY FAIL'):'BASE↔PARRY PENDING';
  }else if(character==='KEN' && ['stand-light','stand-heavy'].includes(record.id) && handoffAudit?.standingAttacks){
    const atk=handoffAudit.standingAttacks;
    if(record.id==='stand-light') els.handoffQa.textContent=atk.standLightActive?(atk.standLightHandoffPass?'BASE↔LIGHT PASS':'BASE↔LIGHT FAIL'):'BASE↔LIGHT PENDING';
    else els.handoffQa.textContent=atk.standHeavyActive?(atk.standHeavyHandoffPass?'BASE↔HEAVY PASS':'BASE↔HEAVY FAIL'):'BASE↔HEAVY PENDING';
  }else if(character==='KEN' && ['hadoken','shoryuken','tatsumaki','super-rush'].includes(record.id) && handoffAudit?.specialAttacks){
    const sp=handoffAudit.specialAttacks;
    if(record.id==='hadoken') els.handoffQa.textContent=sp.hadokenActive?(sp.hadokenHandoffPass?'BASE↔HADOKEN PASS':'BASE↔HADOKEN FAIL'):'BASE↔HADOKEN PENDING';
    else if(record.id==='shoryuken') els.handoffQa.textContent=sp.shoryukenActive?(sp.shoryukenHandoffPass?'BASE↔SHORYUKEN PASS':'BASE↔SHORYUKEN FAIL'):'BASE↔SHORYUKEN PENDING';
    else if(record.id==='tatsumaki') els.handoffQa.textContent=sp.tatsumakiActive?(sp.tatsumakiHandoffPass?'BASE↔TATSUMAKI PASS':'BASE↔TATSUMAKI FAIL'):'BASE↔TATSUMAKI PENDING';
    else els.handoffQa.textContent=sp.superRushActive?(sp.superRushHandoffPass?'BASE↔SUPER RUSH PASS':'BASE↔SUPER RUSH FAIL'):'BASE↔SUPER RUSH PENDING';
  }else els.handoffQa.textContent='—';
  if(record.enabled) els.gateReason.textContent='ACTIVE';
  else if(pose && !pose.poseAuthoredPass) els.gateReason.textContent='POSE CHANGE TOO SMALL';
  else if(semantic && !semantic.semanticQaPass) els.gateReason.textContent='MOTION SEMANTICS';
  else if(record.stagingOnly) els.gateReason.textContent='STAGING ONLY';
  else els.gateReason.textContent='NO APPROVED AUTHORED SOURCE';
  els.scrub.max=String(record.frames-1); els.timeline.innerHTML='';
  for(let i=0;i<record.frames;i++){const t=document.createElement('button');t.className='tick';t.textContent=String(i+1).padStart(2,'0');t.onclick=()=>setFrame(i);els.timeline.appendChild(t)}
  render();
}

function draw(canvas,index){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);if(!image||!record)return;
  const n=record.frames; index=((index%n)+n)%n; const w=record.frameSize[0],h=record.frameSize[1];
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,index*w,0,w,h,0,0,canvas.width,canvas.height);
}
function render(){if(!record)return;draw(els.prev,frame-1);draw(els.current,frame);draw(els.next,frame+1);els.scrub.value=String(frame);els.frameLabel.textContent=`${frame+1} / ${record.frames}`;[...els.timeline.children].forEach((t,i)=>t.classList.toggle('active',i===frame));}
function setFrame(i){frame=Math.max(0,Math.min(record.frames-1,i));render()}
function stop(){playing=false;els.play.textContent='PLAY';if(raf)cancelAnimationFrame(raf);raf=0;last=0;accumulator=0}
function loop(now){if(!playing||!record)return;if(!last)last=now;const dt=now-last;last=now;accumulator+=dt;const speed=Number(els.speed.value)||1;const step=1000/((record.fps||12)*speed);while(accumulator>=step){accumulator-=step;frame=(frame+1)%record.frames;render()}raf=requestAnimationFrame(loop)}
els.play.onclick=()=>{playing=!playing;els.play.textContent=playing?'PAUSE':'PLAY';if(playing){last=0;raf=requestAnimationFrame(loop)}else stop()};
els.prevBtn.onclick=()=>setFrame(frame-1);els.nextBtn.onclick=()=>setFrame(frame+1);els.first.onclick=()=>setFrame(0);els.last.onclick=()=>setFrame(record.frames-1);els.scrub.oninput=()=>setFrame(Number(els.scrub.value));
addEventListener('keydown',e=>{if(e.key==='ArrowLeft')setFrame(frame-1);else if(e.key==='ArrowRight')setFrame(frame+1);else if(e.key===' '){e.preventDefault();els.play.click()}});
loadCharacter(character).catch(fail);
