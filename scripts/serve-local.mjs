import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveLocalPython} from './local-python.mjs';
const child=spawn(resolveLocalPython(),[fileURLToPath(new URL('./serve-local.py',import.meta.url)),...process.argv.slice(2)],{windowsHide:true,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(child.exitCode===null)child.kill(signal);});
