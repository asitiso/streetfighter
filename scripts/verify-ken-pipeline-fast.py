from __future__ import annotations

from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
import io
import runpy
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]

PYTHON_STEPS = [
    ('authoring', 'scripts/verify-ken-authoring-packet.py', []),
    ('ingest', 'scripts/verify-ken-ingest-orchestrator.py', []),
    ('source-gates', 'scripts/verify-ken-source-gates.py', []),
    ('idle', 'scripts/verify-ken-idle-semantic-qa.py', []),
    ('walk', 'scripts/verify-ken-walk-semantic-qa.py', []),
    ('locomotion', 'scripts/verify-ken-locomotion-semantic-qa.py', []),
    ('walkback-hit', 'scripts/verify-ken-walkback-hit-semantic-qa.py', []),
    ('defense', 'scripts/verify-ken-defense-semantic-qa.py', []),
    ('standing-attacks', 'scripts/verify-ken-standing-attacks-semantic-qa.py', []),
    ('special-attacks', 'scripts/verify-ken-special-attacks-semantic-qa.py', []),
    ('advanced-specials', 'scripts/verify-ken-advanced-specials-semantic-qa.py', []),
    ('source-audit', 'scripts/audit-ken-source-sheet.py', ['--allow-reference-only']),
    ('pose-variance', 'scripts/measure-animation-pose-variance.py', ['--character', 'KEN', '--strict-missing']),
    ('runtime-audit', 'scripts/audit-ken-runtime-semantics.py', []),
    ('handoff', 'scripts/verify-ken-handoff-qa.py', []),
    ('locomotion-handoff', 'scripts/verify-ken-locomotion-handoff.py', []),
]


def compact_summary(output: str) -> str:
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    summary = lines[-1] if lines else 'PASS'
    return summary if len(summary) <= 360 else summary[:357] + '...'


def run_python_step(name: str, relative_path: str, args: list[str]) -> None:
    started = time.perf_counter()
    out = io.StringIO()
    old_argv = sys.argv[:]
    sys.argv = [relative_path, *args]
    try:
        with redirect_stdout(out), redirect_stderr(out):
            try:
                runpy.run_path(str(ROOT / relative_path), run_name='__main__')
            except SystemExit as exc:
                code = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 1)
                if code != 0:
                    raise
    except BaseException:
        elapsed = time.perf_counter() - started
        print(f'KEN_PIPELINE_STEP_FAIL {name} {elapsed:.2f}s', file=sys.stderr)
        print(out.getvalue()[-12000:], file=sys.stderr)
        raise
    finally:
        sys.argv = old_argv
    elapsed = time.perf_counter() - started
    print(f'KEN_PIPELINE_STEP_PASS {name} {elapsed:.2f}s :: {compact_summary(out.getvalue())}', flush=True)


def build_direct() -> None:
    started = time.perf_counter()
    commands = [
        ['node', 'scripts/clean-dist.mjs'],
        ['node', 'node_modules/typescript/bin/tsc'],
        ['node', 'scripts/build-static.mjs'],
        ['node', 'scripts/generate-release-integrity.mjs'],
    ]
    output = ''
    for command in commands:
        proc = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        output += proc.stdout
        if proc.returncode != 0:
            print('KEN_PIPELINE_BUILD_FAIL', file=sys.stderr)
            print(output[-12000:], file=sys.stderr)
            raise SystemExit(proc.returncode)
    elapsed = time.perf_counter() - started
    print(f'KEN_PIPELINE_STEP_PASS build {elapsed:.2f}s :: {compact_summary(output)}', flush=True)


def run_node_step(name: str, relative_path: str) -> None:
    started = time.perf_counter()
    proc = subprocess.run(['node', relative_path], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        print(f'KEN_PIPELINE_STEP_FAIL {name}', file=sys.stderr)
        print(proc.stdout[-12000:], file=sys.stderr)
        raise SystemExit(proc.returncode)
    elapsed = time.perf_counter() - started
    print(f'KEN_PIPELINE_STEP_PASS {name} {elapsed:.2f}s :: {compact_summary(proc.stdout)}', flush=True)


def main() -> None:
    total_started = time.perf_counter()
    for name, path, args in PYTHON_STEPS:
        run_python_step(name, path, args)
    build_direct()
    run_node_step('authored-pipeline', 'scripts/verify-ken-authored-pipeline.mjs')
    elapsed = time.perf_counter() - total_started
    print(f'KEN_PIPELINE_FAST_PASS total={elapsed:.2f}s steps={len(PYTHON_STEPS)+2}', flush=True)


if __name__ == '__main__':
    main()
