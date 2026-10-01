# Side-Scroll Chronicles — v0.0.27-rc.2 Progress Report

## Scope
RC1에서 예고한 릴리즈 후보 검증 단계를 실제 코드/자동 테스트로 강화했다.

1. Save Export → Reset 상태 → Import 완전 복원 검증
2. 이전 게임 캐시 → RC2 캐시 업데이트 시뮬레이션
3. 네트워크를 사용하지 않는 Offline Stage 1 → Ending 전환 하네스
4. Release Report 기반 Acceptance Matrix
5. RC2 배포 산출물 및 dynamic import 재검증

## Added runtime modules
- `src/core/AcceptanceMatrix.ts`
  - SAVE / UPDATE / OFFLINE / PWA / FRAME / MEMORY / LOAD RECOVERY 항목을 `pass | check | block`으로 정규화
  - Release Report JSON에 전체 matrix 포함
- `src/core/OfflineCampaignHarness.ts`
  - 네트워크 fallback 없이 cache reader만으로 `1→2→3→4→5→Ending` 전환을 순서대로 검증
- `src/core/ReleaseUpgradeHarness.ts`
  - 오래된 `game-cache-*` 제거와 현재 cache 보존을 시뮬레이션
  - save fingerprint가 cache migration 전후 동일한지 검증

## RC2 release check changes
- Release Check 화면에 `ACCEPTANCE MATRIX` 요약을 표시한다.
- Export되는 Release Report JSON에 `acceptanceMatrix` 전체 항목을 포함한다.
- Title footer를 `V0.0.27-RC2`로 갱신했다.
- Game cache: `game-cache-v027`
- Release candidate: `0.0.27-rc.2`

## Save round-trip test
자동 테스트에서 다음 순서를 실행했다.

1. Stage 결과/캐릭터/Super/Touch 설정이 포함된 full save 생성
2. Portable JSON export 및 checksum 생성
3. 기본 save 상태로 reset된 상태를 별도로 생성
4. exported JSON import
5. 정규화된 전체 save object deep equality 및 checksum equality 검사

결과: **PASS — export/reset/import 이후 원본 진행 데이터 완전 일치**

## Update migration harness
입력 cache:
- `game-cache-v024`
- `game-cache-v025`
- `game-cache-v026`
- `game-cache-v027`
- `browser-runtime-cache`

결과:
- v024/v025/v026 game cache 제거 대상으로 판정
- v027 유지
- browser runtime cache 유지
- `ssc-save-data-v1`은 CacheStorage 정책 밖에 유지
- save checksum/fingerprint 전후 동일

결과: **PASS**

## Offline full-campaign transition harness
`dist`의 실제 deferred JS bytes만 메모리 cache reader에 넣고 network path 없이 다음 5개 전환을 검사했다.

- Stage 1 → Stage 2
- Stage 2 → Stage 3
- Stage 3 → Stage 4
- Stage 4 → Stage 5
- Stage 5 → Ending

결과: **5/5 PASS**

의도적으로 Ending transition 파일 하나를 제거했을 때 마지막 단계가 FAIL로 판정되는 것도 검증했다.

## Acceptance Matrix
자동 RC fixture 결과:
- **16 PASS**
- **0 CHECK**
- **0 BLOCK**

포함 항목:
- Save health
- Portable save transfer
- Cache/save isolation
- Offline campaign
- 5 offline stage transitions
- Load recovery
- Service worker
- Standalone PWA
- Landscape
- Frame stability
- Memory trend
- Automated release gate

이 Matrix는 실제 기기에서 Release Check를 실행하면 해당 기기 telemetry/state를 기준으로 다시 계산된다.

## Regression verification
전체 `npm run verify`: **PASS**

기존 기준값 유지:
- Ryu Heavy: 92 damage
- Ken SA I: 3 HIT / 327 damage
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1 → 5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options / 8 Endings / Battle Record: PASS
- 50 minute virtual marathon: PASS

## HTTP deployment verification
다음 배포 파일을 실제 로컬 HTTP에서 요청해 모두 `200`을 확인했다.
- `/`
- `AcceptanceMatrix.js`
- `OfflineCampaignHarness.js`
- `ReleaseUpgradeHarness.js`
- `ReleaseReport.js`
- `ReleaseCheckScene.js`
- `SaveManager.js`
- `Stage5Scene.js`
- `EndingScene.js`
- `sw.js`
- `manifest.webmanifest`

`GameApp.js`에서 Stage 1~5 및 Ending이 여전히 dynamic import인 것도 확인했다.

## RC2 status
**Automated RC gate: PASS**

아직 V0.1 COMPLETE로 선언하지 않는다. 실제 스마트폰에서 설치/업데이트/비행기모드 전체 캠페인/장시간 FPS·발열·터치 지연과 최종 제작 그래픽/오디오 검증은 별도로 필요하다.
