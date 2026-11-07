# Ibuki verification

Run from the repository root after installing the project dependencies:

```sh
npm run verify:ibuki
```

This runs 36 steps in order: Python dependency preflight, a clean TypeScript/static build, 13 runtime image checks covering all 14 authored Ibuki sequences (jump also checks landing), installation/rollback checks in temporary fixtures, and 20 JavaScript checks covering animation mapping, combat, super arts, rendering size, build integrity, and runner failure handling.

Python needs Pillow, NumPy, SciPy, and OpenCV. Install them once in the Python environment you use:

```sh
python -m pip install pillow numpy scipy opencv-python-headless
```

The runner tries `python3`, `python`, then `py`. Set the `PYTHON` environment variable to a Python executable path to select an environment explicitly. For example, in PowerShell:

```powershell
$env:PYTHON = 'C:/path/to/venv/Scripts/python.exe'
npm run verify:ibuki
```

For a JSON report, pass an output path:

```sh
npm run verify:ibuki -- --report ../outputs/ibuki-verification.json
```

The equivalent direct command is `node scripts/verify-ibuki-pipeline.mjs --report ../outputs/ibuki-verification.json`.

The runner stops at the first failure, returns a nonzero exit code, and prints the failed step with diagnostic output. A requested JSON report includes the checks that ran and their durations, plus the failure details. Missing Python dependencies fail before the build starts.

The build replaces `dist/`. Runtime checks do not install artwork; installation checks use temporary fixtures. The pose comparison cache is copied into a temporary directory and removed after the run, leaving the tracked cache, artwork, manifest, and animation registry unchanged. Python bytecode output is disabled for these checks.

This command verifies the automated Ibuki checks. Interactive browser playtesting and visual review remain separate checks.
