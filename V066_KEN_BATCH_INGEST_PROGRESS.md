# V066 — KEN AUTHORED BATCH INGEST PROGRESS

## 작업 목표
켄의 실제 HQ authored 프레임을 모션별로 넣을 때 반복 작업을 없애고,
`이미지 투입 → 사전검사 → 통과 모션만 설치 → 최종 검증 1회 → 실패 시 전체 롤백`
으로 끝나는 일괄 인입 파이프라인을 완성한다.

## 이번 작업

### 1. 트랜잭션형 일괄 인입
`scripts/ingest-authored-ken.py`를 전면 확장했다.

동작 순서:
1. `art-source/ken/inbox`의 13개 모션 소스를 자동 탐색한다.
2. 모든 발견 소스에 `preview-only` 사전검사를 먼저 수행한다.
3. 저해상도 / 잘못된 프레임 수 / 포즈 변화 부족 소스는 runtime을 건드리지 않고 거절한다.
4. 사전검사를 통과한 모션만 `--skip-verify`로 연속 설치한다.
5. 배치 마지막에 `npm run verify:ken-pipeline`을 단 한 번 실행한다.
6. 마지막 검증 실패 시 해당 배치에서 바뀐 runtime WebP / manifest / registry / QA 파일을 이전 상태로 자동 복구한다.

### 2. 부분 성공 정책
- 거절된 모션이 있어도 통과한 모션은 설치 가능하다.
- CI에서 하나라도 거절되면 실패 코드가 필요한 경우 `npm run ingest:ken:strict`를 사용한다.
- 실제 설치 실패 또는 최종 검증 실패는 전체 배치 rollback 대상이다.

### 3. 실행 명령
- `npm run ingest:ken:dry` — 검사만 수행
- `npm run ingest:ken` — 통과 모션 일괄 설치 + 최종 검증 1회
- `npm run ingest:ken:strict` — 위와 같지만 source rejection도 실패 코드 처리
- `npm run verify:ken-ingest` — orchestrator 자체 무변경/rollback 구조 검증

### 4. 소스 투입 규칙 문서화
`art-source/ken/inbox/README.md`를 갱신했다.

가장 단순한 방식:
```text
art-source/ken/inbox/idle/01.png ... 06.png
art-source/ken/inbox/walk/01.png ... 12.png
```

또는 `idle.png + idle.json` 형태의 스프라이트 시트도 지원한다.

Production gate:
- 캐릭터 본체 높이 최소 240px
- 투명 PNG/WebP 권장
- 모션별 정확한 frame count
- translation / rotation / scale-only derivative 금지
- affine residual pose QA 통과 필수

### 5. 인입 기록
각 실행 결과는 다음에 남는다.
- `RC39_KEN_INGEST_STATUS.json`
- `art-source/ken/ingest-history/*.json`

## 현재 켄 자산 판정
기존 13개 켄 시퀀스 126F는 파일은 존재하지만 모두 실제 authored 포즈 기준을 통과하지 못했다.
따라서 현재도 runtime 활성 0F를 유지한다.

- 이동/피격: 57F
- 공격/필살기 staging: 69F
- 전체 구조: 126F
- 활성 authored: 0F

기존 종합 시트는 캐릭터 본체 높이가 약 63~98px 수준이라 production 최소 240px 기준 미달이며 reference-only로 유지한다.

## 검증
PASS:
- `npm run verify:ken-ingest`
- `npm run verify:ken-pipeline`
- `npm run verify:ken-gates`
- `verify-animation-sequences.mjs`
- `verify-ken-authored-pipeline.mjs`
- `verify-v063-rc38.mjs`

전체 `npm run verify`에서는 RC1~RC15 및 기존 전투/스테이지/PWA/50분 마라톤 검증이 모두 PASS한 뒤 장시간 실행 제한에 도달했다. 제한 이후의 Ken/RC38 검증은 위 명령으로 별도 실행하여 모두 PASS를 확인했다. 로그상 기능 실패는 확인되지 않았다.

## 다음 작업
이제 코드 쪽 준비는 끝났다. 다음 단계는 켄의 실제 HQ authored 이미지를 `inbox`에 넣는 것이다.
첫 적용 순서는 체감과 검증이 쉬운 순서로:
1. Idle 6F
2. Walk 12F
3. Dash 7F
4. Jump 8F
5. Landing 6F
6. Stand Light / Heavy
7. Shoryuken / Tatsumaki / Super Rush

실제 HQ 프레임이 들어오면 `npm run ingest:ken` 한 번으로 통과한 모션만 자동 활성화된다.
