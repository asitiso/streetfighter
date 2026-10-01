# Side-Scroll Chronicles v0.0.24 — Release Gate / Offline Campaign / Recovery

## Goal
v0.0.23의 동적 Stage 로딩과 자동 품질 조절을 유지하면서 실제 모바일 배포에서 문제가 되기 쉬운 다섯 항목을 강화했다.

1. 저사양 / 중급 / 고사양 Release Profile
2. 전체 Campaign Offline Cache 실제 검증
3. 프레임 / 장시간 런타임 / JS Heap 추적
4. Stage 로딩 실패 시 사용자 복구 UI
5. Release Check의 READY / CHECK / BLOCKED 자동 판정

Combat Simulation, Parry timing, Character animation timing은 변경하지 않았다.

## Release Profiles
새 `ReleaseProfiles.ts`를 추가했다.

- ENTRY MOBILE → LOW quality
- STANDARD MOBILE → BALANCED quality
- PERFORMANCE → HIGH quality

판단 입력:
- deviceMemory
- hardwareConcurrency
- DPR
- 실제 화면 pixel count
- coarse pointer / mobile 힌트

프로필은 단순 이름이 아니다. 다음 Stage idle prefetch 지연시간도 프로필에 맞춰 바뀐다.

## Runtime Telemetry
새 `RuntimeTelemetry.ts`를 추가했다.

실행 중 다음을 누적 측정한다.
- recent average FPS
- slow-frame based low FPS
- maximum frame time
- long frame ratio
- session time
- JS heap / peak heap (지원 브라우저)
- automatic quality step-down 횟수
- stability: WARMING-UP / GOOD / WATCH / POOR

이 데이터는 RELEASE CHECK 화면에서 실시간 표시된다.

## Offline Campaign Preparation
`AssetManager`에 전체 Campaign offline preparation을 추가했다.

Offline Campaign 필수 deferred 파일:
1. Stage1Scene
2. Stage2Scene
3. Stage3Scene
4. Stage4Scene
5. Stage5Scene
6. EndingScene
7. EndingProfiles

Release Check에서 `LP — PREP OFFLINE CAMPAIGN`을 실행하면 이 7개 파일을 현재 버전 CacheStorage(`game-cache-v024`)에 직접 저장한다.

그 후 현재 버전 cache를 다시 조회해서 `7/7 READY`인지 확인한다. 이전 버전 cache가 남아 있어도 ready로 오판하지 않는다.

## Load Failure Recovery
Stage module 또는 network fetch 실패 시 더 이상 빈 화면이나 멈춘 Loading 화면으로 남지 않는다.

실패 UI:
- LOAD FAILED
- 실패 원인 표시
- RETRY
- BACK TO TITLE

오프라인인데 다음 Stage가 아직 준비되지 않은 경우에도 앱 자체를 재시작할 필요 없이 복구할 수 있다.

## Automatic Release Gate
새 `ReleaseGate.ts`를 추가했다.

RELEASE CHECK는 다음 세 상태 중 하나를 자동 표시한다.

### READY
치명적 항목 정상 + Offline Campaign 준비 + 프레임 안정성 정상.

### CHECK
실행은 가능하지만 확인할 항목이 남아 있음.
예: Service Worker 첫 제어 전 reload 필요, Offline Campaign 미준비, telemetry warming-up.

### BLOCKED
릴리즈 판정상 치명적 항목 실패.
예: Save/App Shell/Service Worker 실패, 심각한 frame stability 문제.

## Service Worker / Cache
Cache version:
`game-cache-v024`

초기 App Shell:
52 files

Stage 2 / 3 / 4 / 5 / Ending은 초기 App Shell에서 제외되어 dynamic fetch 상태를 유지한다.
Stage 1과 공통 엔진만 초기 설치에 포함된다.

## Loading / Dynamic Imports
Production build `GameApp.js`에서 확인:
- Stage1Scene: dynamic import
- Stage2Scene: dynamic import
- Stage3Scene: dynamic import
- Stage4Scene: dynamic import
- Stage5Scene: dynamic import
- EndingScene: dynamic import

따라서 v0.0.23의 progressive loading 구조를 유지한다.

## Verification
`npm run verify` 전체 PASS.

기존 핵심 회귀값:
- Ryu Heavy: 92 damage
- Ken SA I: 3 HIT / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1 → 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options / Endings / Battle Record: PASS

### v0.0.24 Release Gate Test
PASS:
- ENTRY / STANDARD / PERFORMANCE profile detection
- 60 FPS telemetry stability = GOOD
- READY / CHECK / BLOCKED gate logic
- Offline Campaign 7 unique deferred files
- game-cache-v024 consistency
- Load failure recovery source hooks

### 50-minute Virtual Marathon
Stage별 10분, 총 50분 가상 전투.

- Stage 1: max events 7 / max projectiles 0 / max enemies 5
- Stage 2: max events 7 / max projectiles 1 / max enemies 5
- Stage 3: max events 10 / max projectiles 3 / max enemies 4
- Stage 4: max events 7 / max projectiles 1 / max enemies 4
- Stage 5: max events 13 / max projectiles 5 / max enemies 4

검증 조건:
- Fighter position / HP finite
- events runaway 없음
- projectiles runaway 없음
- enemy array runaway 없음

결과: PASS.

## HTTP Production Artifact Check
다음 파일 직접 HTTP 200 확인:
- /
- main.js
- ReleaseProfiles.js
- RuntimeTelemetry.js
- ReleaseGate.js
- AssetManager.js
- ReleaseCheckScene.js
- Stage2Scene.js
- Stage5Scene.js
- EndingScene.js
- EndingProfiles.js
- sw.js
- manifest.webmanifest

## Still Required Before V0.1 COMPLETE
v0.0.24도 개발 릴리즈다.

실제 스마트폰에서 아직 직접 확인해야 하는 항목:
- Android / iPhone PWA installation
- 실제 CacheStorage offline campaign playback
- 저사양 / 중급 / 고사양 실제 FPS와 발열
- 장시간 실제 JS heap 추이
- touch latency / accidental input
- background → foreground 복귀
- 실제 네트워크 단절 중 Stage transition recovery
- 최종 제작 그래픽 / 오디오 품질

따라서 V0.1 COMPLETE는 아직 선언하지 않는다.
