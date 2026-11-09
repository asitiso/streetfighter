import { spawnSync } from 'node:child_process';
import { copyFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { dirname,join,resolve,basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--report')) {
 console.error('Usage: node scripts/verify-ibuki-pipeline.mjs [--report result.json]');process.exit(1);
}
const reportPath=args.length?resolve(args[1]):null;
const report={passed:false,failedStep:null,steps:[]};
const env={...process.env,PYTHONUTF8:'1',PYTHONDONTWRITEBYTECODE:'1'};
let cacheDirectory;
function command(executable,args) {
 const result=spawnSync(executable,args,{cwd:root,env,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true});
 const output=(result.stdout??'')+(result.stderr??'');
 if(result.error||result.status!==0)throw new Error(`${executable}: ${result.error?.message??`exit ${result.status}`}\n${output.slice(-12000)}`);
 return output;
}
function step(name,run) {
 console.log(`IBUKI_CHECK_START ${name}`);
 const started=Date.now();
 try {
  const output=run()??'';
  report.steps.push({name,passed:true,seconds:(Date.now()-started)/1000});
  const last=output.trim().split(/\r?\n/).at(-1)??'';
  console.log(`IBUKI_CHECK_PASS ${name} :: ${last.slice(0,240)}`);
 } catch(error) {
  report.failedStep=name;report.steps.push({name,passed:false,seconds:(Date.now()-started)/1000,error:error.message});throw error;
 }
}
try {
 let python;
 step('python-dependencies',()=>{
  const failures=[];
  for(const candidate of env.PYTHON?[env.PYTHON]:['python3','python','py']) {
   try {const output=command(candidate,['-c','import PIL,numpy,cv2,scipy,sys; print(sys.executable)']);python=candidate;return output;}
   catch(error){failures.push(error.message);}
  }
  throw new Error('Python with Pillow, NumPy, SciPy and OpenCV is required. Set PYTHON to its executable; install dependencies with that Python: -m pip install pillow numpy scipy opencv-python-headless\n'+failures.join('\n'));
 });
 cacheDirectory=mkdtempSync(join(tmpdir(),'ibuki-verify-'));
 env.POSE_ECC_CACHE_PATH=join(cacheDirectory,'pose-cache.json');
 const seed=join(root,'RC39_POSE_ECC_CACHE.json');
 if(existsSync(seed))copyFileSync(seed,env.POSE_ECC_CACHE_PATH);
 step('clean-build',()=>{
  let output='';
  for(const script of ['scripts/clean-dist.mjs','node_modules/typescript/bin/tsc','scripts/build-static.mjs','scripts/generate-release-integrity.mjs'])output+=command(process.execPath,[script]);
  return output;
 });
 // Jump verification checks both installed jump and landing assets as a pair.
 for(const kind of ['idle','walk','walk-back','dash','jump','hit','stand-light','stand-heavy','hadoken','shoryuken','tatsumaki','yoroi-doroshi','super-rush']) {
  step(`runtime-${kind}`,()=>command(python,['scripts/install-authored-chunli-walk.py',kind,'--character','IBUKI','--runtime']));
 }
 step('ingest-rollback',()=>command(python,['scripts/verify-ibuki-ingest.py']));
 for(const name of ['ibuki-pipeline-runner','ibuki-idle','ibuki-walk','ibuki-retreat','ibuki-dash','ibuki-air','hit-animation-clock','ibuki-light-attack','ibuki-heavy-attack','ibuki-kunai','ibuki-kazekiri','ibuki-tsumuji','ibuki-kasumi-suzaku','ibuki-yoroi-doroshi','ibuki-hashin-sho','animation-render-sizing','animation-sequences','super-arts','combat','build']) {
  step(name,()=>command(process.execPath,[`scripts/verify-${name}.mjs`]));
 }
 report.passed=true;console.log(`IBUKI_PIPELINE_PASS ${report.steps.length}/${report.steps.length}`);
} catch(error) {
 console.error(`IBUKI_PIPELINE_FAIL ${report.failedStep??'setup'}\n${error.message}`);process.exitCode=1;
} finally {
 if(cacheDirectory&&dirname(cacheDirectory)===resolve(tmpdir())&&basename(cacheDirectory).startsWith('ibuki-verify-'))rmSync(cacheDirectory,{recursive:true,force:true});
 if(reportPath){mkdirSync(dirname(reportPath),{recursive:true});writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');}
}
