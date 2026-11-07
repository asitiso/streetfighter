import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,dirname,resolve,basename } from 'node:path';
import { spawnSync } from 'node:child_process';
const temp=await mkdtemp(join(tmpdir(),'ibuki-runner-'));
try {
 const report=join(temp,'result.json');
 const result=spawnSync(process.execPath,['scripts/verify-ibuki-pipeline.mjs','--report',report],{env:{...process.env,PYTHON:join(temp,'missing-python')},encoding:'utf8'});
 assert.notEqual(result.status,0,'Missing Python must fail the command');
 const data=JSON.parse(await readFile(report,'utf8'));
 assert.equal(data.passed,false);assert.equal(data.failedStep,'python-dependencies');
 assert.equal(data.steps.length,1,'Do not build or run later checks after failed preflight');
 assert.ok(result.stderr.includes('PYTHON'),'Failure explains the Python override');
 console.log('IBUKI_PIPELINE_RUNNER_PASS');
} finally {
 assert.equal(dirname(temp),resolve(tmpdir()));assert.ok(basename(temp).startsWith('ibuki-runner-'));
 await rm(temp,{recursive:true,force:true});
}
