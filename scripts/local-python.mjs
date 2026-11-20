import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export function resolveLocalPython() {
  const names = process.platform === 'win32' ? ['python.exe','python3.exe'] : ['python3','python'];
  const pathCandidates = names.flatMap(name => (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map(dir => path.join(dir,name)));
  const override = process.env.SF_PYTHON;
  const candidates = override ? (path.isAbsolute(override) ? [override] : (process.env.PATH ?? '').split(path.delimiter).filter(Boolean).map(dir => path.join(dir,override))) : [
    path.resolve(path.dirname(process.execPath),'../../python/python.exe'),
    path.join(os.homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','python','python.exe'),
    ...pathCandidates,
  ];
  for (const candidate of new Set(candidates)) {
    if (!existsSync(candidate) || candidate.replaceAll(String.fromCharCode(92),'/').toLowerCase().includes('/microsoft/windowsapps/')) continue;
    const result = spawnSync(candidate,['--version'],{windowsHide:true,encoding:'utf8',timeout:5000});
    if (result.status === 0 && (result.stdout+result.stderr).trim().startsWith('Python 3.')) return candidate;
  }
  throw new Error('Python 3 was not found. Install Python 3 or set SF_PYTHON to its actual executable path (not a Windows Store alias).');
}
