# V067 — KEN IDLE SEMANTIC QA PROGRESS

## 작업 목적
켄 Idle authored HQ 6F를 실제 런타임에 승격하기 전에, 단순한 포즈 차이뿐 아니라 Idle다운 움직임인지 자동 판정한다.

## 이번 변경
- `scripts/install-authored-ken-sequence.py`
  - KEN Idle 전용 pose residual 기준 추가: avg >= 0.003 / max >= 0.006
  - 기존 transform pilot(avg 0.001648 / max 0.002086)은 계속 탈락
  - Idle semantic QA 추가
    - 1→6 loop closure IoU
    - center/root X/Y drift
    - frame-to-frame jump
    - silhouette area stability
    - foot center drift
    - stance width stability
    - excessive motion upper bound
  - pose QA와 semantic QA 둘 다 통과해야 설치/활성화
  - manifest 및 per-sequence QA JSON에 `semanticQa` 저장

- `scripts/measure-animation-pose-variance.py`
  - KEN Idle은 이동/공격보다 낮은 authored threshold를 사용하도록 motion-specific threshold 지원
  - 기존 0.008/0.018 공격 기준을 Idle에 강제하지 않도록 수정

- `scripts/verify-ken-idle-semantic-qa.py`
  - gentle authored loop: PASS
  - transform-like static: pose FAIL
  - excessive root motion: semantic FAIL
  - broken loop: semantic FAIL
  - foot slide / stance drift: semantic FAIL
  - 결과: `KEN_IDLE_SEMANTIC_QA_PASS`

- `scripts/audit-ken-runtime-semantics.py`
  - 현재 런타임 켄 Idle을 자동 감사
  - 현재 결과: semantic shape stability는 PASS지만 authored pose residual 부족으로 promotion FAIL

- Animation QA UI
  - POSE QA
  - SEMANTIC QA
  - GATE REASON
  표시 추가
  - 현재 Ken Idle gate reason: `POSE CHANGE TOO SMALL`

## 현재 켄 Idle 상태
- target: 6F
- runtime size: 384×448 / frame
- current pilot residual avg: 0.001648
- current pilot residual max: 0.002086
- authored Idle minimum: avg 0.003 / max 0.006
- loop IoU: 0.916092
- semantic QA: PASS
- authored pose QA: FAIL
- runtime promotion: BLOCKED

즉 현재 이미지를 억지로 활성화하지 않았다.

## 검증
- `npm run typecheck` PASS
- `npm run verify:ken-idle` PASS
- `npm run audit:ken-runtime` PASS
- `npm run verify:ken-gates` PASS
- build PASS (`223 FILES`, integrity root `D679915F33839162...`)
- final pose variance PASS execution
- `KEN_AUTHORED_PIPELINE_VERIFY_PASS`
- KEN active authored frames remains `0F`
- KEN staging attack frames remains `69F`

## 다음 작업
실제 전신 body height >= 240px의 6개 Ken Idle authored source frame을 `art-source/ken/inbox/idle/`에 넣는다.

권장 포즈:
1. neutral
2. inhale
3. chest rise
4. weight shift
5. exhale
6. return-to-neutral

그 뒤 `npm run ingest:ken` 한 번으로 QA → 설치 → manifest/registry 활성화를 수행한다.
