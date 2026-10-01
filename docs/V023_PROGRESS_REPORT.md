# Side-Scroll Chronicles v0.0.23 — Release Readiness / Mobile Runtime

## Scope
v0.0.22에서 이어서 기능 확장보다 모바일 릴리즈 안정성에 집중했다.

## Implemented

### 1. Automatic runtime quality
- `RuntimeQuality` 추가.
- 기기 메모리 힌트, CPU logical cores, 화면 픽셀 수, DPR, coarse pointer를 사용해 시작 품질을 `high / balanced / low`로 선택.
- 긴 프레임 샘플이 지속되면 high → balanced → low 순서로 자동 하향.
- 품질 변화가 영향을 주는 항목: DPR cap, atmosphere particle count, background motion density, foreground secondary FX, scanlines.
- Combat simulation, hit timing, parry timing, character animation timing은 감소시키지 않음.
- `?quality=high|balanced|low`로 테스트 강제 가능.

### 2. Release Check screen
TITLE에 `RELEASE CHECK` 메뉴 추가.
- Save / IndexedDB
- App Shell
- Service Worker
- Landscape
- standalone/browser mode
- network status
- current automatic quality + DPR cap
- touch points
- install state
- Fixed 60Hz combat status

### 3. PWA install guide
TITLE에 `INSTALL APP` 메뉴 추가.
- Chromium 계열의 `beforeinstallprompt`가 있으면 LP/START로 설치 prompt 호출.
- iOS는 Safari `공유 → 홈 화면에 추가` 안내.
- 이미 standalone이면 설치 완료 상태 표시.

### 4. Deferred stage loading + idle prefetch
- `GameApp`의 Stage1~5 / Ending 정적 import 제거.
- Stage 진입 직전에 dynamic import.
- 현재 Stage 시작 후 다음 Stage를 idle prefetch.
- `AssetManager`가 modulepreload + HTTP cache warmup + Service Worker runtime cache 메시지를 사용.
- Loading overlay에 실제 group preload 진행률 표시.

### 5. PWA cache policy correction
- 초기 Service Worker App Shell은 앱 핵심 + Stage 1까지만 저장.
- Stage 2~5와 Ending은 초기 설치 캐시에서 제외.
- 진행 중 로드한 Stage는 runtime cache에 저장.
- 비-navigation JS fetch 실패 때 `/index.html`을 반환하던 fallback 제거. navigation 요청에만 index fallback.
- cache version: `game-cache-v023`.

### 6. Background handling retained
v0.0.22의 background pause를 유지:
- RAF / 60Hz loop stop
- touch release
- Web Audio suspend
- foreground 복귀 시 clean restart

## Automated verification
`npm run verify` 전체 PASS.

Regression values retained:
- Ryu Heavy: 92 damage
- Ken SA I: 3 HIT / 327 damage
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1→5 flow: PASS
- Urien/Gill: PASS
- 24 Super Arts / 48 Air Normals: PASS
- Continue / Stage Select / Options / Endings / Battle Records: PASS

### v0.0.23 specific
- auto quality selection: low / balanced / high cases PASS
- Stage 2/5/Ending prefetch group definitions PASS
- initial App Shell excludes Stage 2~5 + Ending PASS
- build required files: 52 PASS
- initial shell validation: 16 key entries PASS

### 25-minute virtual soak test
Each stage ran 5 virtual minutes, 25 minutes total.
- Stage 1 max events 7 / max projectiles 0
- Stage 2 max events 8 / max projectiles 2
- Stage 3 max events 5 / max projectiles 2
- Stage 4 max events 6 / max projectiles 1
- Stage 5 max events 9 / max projectiles 5
- no non-finite fighter positions/HP
- no runaway event list
- no runaway projectile list

## Deployment output check
Local HTTP responses: all 200
- `/`
- `/assets/main.js`
- `/assets/core/RuntimeQuality.js`
- `/assets/core/AssetManager.js`
- `/assets/scenes/ReleaseCheckScene.js`
- `/assets/scenes/InstallScene.js`
- `/assets/scenes/Stage1Scene.js`
- `/assets/scenes/Stage2Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

Compiled `GameApp.js` confirmed dynamic imports for Stage 1~5 and Ending, with no static Stage2~5 imports.

## Still not V0.1 COMPLETE
The master acceptance bar still requires real-device confirmation of:
- installed PWA launch from home screen
- touch latency / control ergonomics on multiple phone aspect ratios
- offline full campaign after staged assets have been cached
- sustained thermal/performance behavior on low/mid/high phones
- final production art/audio fidelity

v0.0.23 therefore remains a development release, not V0.1 COMPLETE.
