# Side-Scroll Chronicles v0.0.25 — Save Resilience / Network-Cut Recovery / Update Safety

## 목표
v0.0.24의 Release Gate를 실제 장기 사용/업데이트 상황에 더 가깝게 확장했다.

이번 배치의 우선순위:

1. 네트워크 단절 시 이미 캐시된 Stage가 계속 로드될 것
2. 일부 손상된 Save에서 가능한 정상 필드는 살릴 것
3. Primary Save가 완전히 깨지면 직전 정상 Backup으로 복구할 것
4. Service Worker cache update가 IndexedDB save를 지우지 않을 것
5. 단순 peak memory가 아니라 지속적인 heap 증가 추세도 감시할 것
6. Release Gate가 위 항목을 자동 판정할 것

---

## Save Resilience

### Save schema
- IndexedDB: `ssc-save-data-v1`
- Save schema: `2`
- Primary key: `profile`
- Backup key: `profile-backup`

캐시 버전은 `game-cache-v025`로 변경되지만 Save DB 이름은 바꾸지 않는다.
Service Worker는 CacheStorage만 정리하며 IndexedDB에는 접근하지 않는다.

### 필드 단위 복구
Save를 읽을 때 다음을 검증한다.

- Stage 1~5 범위
- 플레이 가능 8인 캐릭터 ID
- Super Art 1~3
- boolean 설정값
- Touch scale / opacity / position 범위
- Stage Result 구조 및 숫자 유효성

일부 필드가 잘못되어도 전체 세이브를 폐기하지 않고 잘못된 필드만 기본값/허용 범위로 복구한다.

### Checksum + Backup
정상 Save는 FNV-1a checksum이 포함된 record로 저장한다.

쓰기 시:

1. 현재 정상 Save → `profile-backup`
2. 새 Save → `profile`

순서로 하나의 IndexedDB transaction 안에서 저장한다.

로드 시:

- Primary 정상 → Primary 사용
- Primary checksum 손상 + Backup 정상 → Backup 자동 복구 후 Primary 재생성
- 둘 다 사용할 수 없음 → Default Save
- 기존 legacy save → schema 2로 자동 migration

---

## Network-Cut Recovery

AssetManager는 Stage 로딩 시 Service Worker에만 의존하지 않는다.

### 일반 Stage load
1. 현재 `game-cache-v025` CacheStorage 직접 확인
2. 캐시 hit면 네트워크 요청 없이 사용
3. miss면 fetch
4. fetch 성공 시 현재 캐시에 저장
5. fetch 실패 시 캐시를 다시 확인하고, 있으면 fallback

따라서 Service Worker controller가 아직 잡히지 않은 첫 reload 상황에서도 이미 캐시된 Stage는 직접 복구 가능하다.

### Offline Campaign
Stage 1~5 + Ending deferred module은 계속 7개 파일로 관리한다.
Release Check의 Offline Prep 후 실제 CacheStorage에서 다시 확인한다.

---

## Runtime Memory Trend

기존 peak heap 감시에 더해 최근 최대 120초 heap sample을 유지한다.

추가 지표:

- heap growth MB
- heap trend MB/min
- memory stability: `unknown / good / watch / poor`

지속적인 증가가 충분한 시간 동안 이어질 때만 `watch` 또는 `poor`로 판정해 순간적인 GC 전후 변화에 과도하게 반응하지 않도록 했다.

Release Gate에서는 `poor` memory growth를 blocker로 처리한다.

---

## Expanded Release Gate

Release Gate가 추가로 검사하는 항목:

- SAVE HEALTH
- SAVE BACKUP
- CACHE / SAVE STORAGE SEPARATION
- SERVICE WORKER UPDATE SAVE SAFETY
- OFFLINE CAMPAIGN
- NETWORK CUT CACHE FALLBACK
- LOAD FAILURE RETRY / BACK RECOVERY
- FRAME STABILITY
- MEMORY TREND
- JS HEAP PEAK

Verdict:

- `READY`
- `CHECK`
- `BLOCKED`

네트워크가 OFFLINE이어도 Offline Campaign이 준비돼 있으면 그 이유만으로 BLOCK하지 않는다.
반대로 OFFLINE + 필요한 캠페인 캐시 없음이면 BLOCKED 처리한다.

---

## 자동 검증

`npm run verify` 전체 PASS.

기존 회귀값 유지:

- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1→5: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options / Endings / Battle Record: PASS

### v0.0.25 resilience test

- corrupted field repair: PASS
- valid field preservation: PASS
- checksum tamper rejection: PASS
- primary corrupt → backup recovery: PASS
- legacy save migration: PASS
- simulated network cut + cached Stage load: PASS
- stable memory trend: GOOD
- synthetic sustained memory growth: POOR detected
- offline + prepared cache Release Gate: READY
- unsafe cache/save policy Release Gate: BLOCKED
- Service Worker source contains no IndexedDB mutation: PASS
- `game-cache-v025` / `ssc-save-data-v1` separation: PASS

### 기존 장시간 검증 유지
Stage 1~5 각각 10분, 총 50분 virtual marathon PASS.

---

## PWA / 배포 확인

- Cache: `game-cache-v025`
- Initial App Shell: 51 URLs
- Stage 2~5 / Ending: deferred dynamic import 유지
- Save DB: `ssc-save-data-v1` 유지

HTTP 200 확인:

- `/`
- `/assets/main.js`
- `/assets/save/SaveManager.js`
- `/assets/core/AssetManager.js`
- `/assets/core/RuntimeTelemetry.js`
- `/assets/core/ReleaseGate.js`
- `/assets/scenes/ReleaseCheckScene.js`
- `/assets/scenes/Stage5Scene.js`
- `/sw.js`
- `/manifest.webmanifest`

---

## 아직 V0.1 COMPLETE가 아닌 이유

코드 레벨의 캠페인/전투/PWA/복구 구조는 크게 진행됐지만 MASTER 기준의 최종 완료에는 실제 스마트폰 실기기에서 다음 검증이 더 필요하다.

- PWA install / update from previous build
- actual IndexedDB save preservation across real browser SW update
- airplane-mode full campaign after Offline Prep
- real device memory / thermal / sustained FPS
- touch latency across multiple aspect ratios
- final production-grade character/background/audio assets

따라서 v0.0.25도 개발 릴리즈이며 V0.1 COMPLETE를 선언하지 않는다.
