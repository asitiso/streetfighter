# V065 — KEN AUTHORED GATE + QA PROGRESS

## 기준
- Base candidate: `0.0.63-rc.38`
- Ken registry target: **126F**
- Ken movement/hit pilot: **57F**
- Ken attack staging: **69F**
- Runtime enabled Ken authored HQ: **0F** (intentional safety gate)

## 이번 코드 작업

### 1. Ken attack staging assets 실제 생성
다음 런타임 경로를 모두 채웠다.

- `stand-light.webp` — 7F
- `stand-heavy.webp` — 10F
- `hadoken.webp` — 12F
- `shoryuken.webp` — 12F
- `tatsumaki.webp` — 12F
- `super-rush.webp` — 16F

이 69F는 시스템 연결/타이밍/프레임 수 검증용 staging asset이다.
`enabled:false`, `poseAuthored:false`, `stagingOnly:true`라서 실제 플레이에서는 사용하지 않는다.

### 2. Affine-only 가짜 모션 자동 차단
`scripts/measure-animation-pose-variance.py`를 Ryu 전용에서 Ryu/Ken 공용 검사기로 확장했다.

Ken 6개 공격 시퀀스의 결과:

- stand-light: FAIL
- stand-heavy: FAIL
- hadoken: FAIL
- shoryuken: FAIL
- tatsumaki: FAIL
- super-rush: FAIL

모두 whole-sprite transform으로 만든 staging frame이므로 올바르게 탈락했다.

### 3. 실제 authored Ken 설치기 추가
신규:

`scripts/install-authored-ken-sequence.py`

지원:
- 개별 프레임 폴더 입력
- grid sprite sheet 입력
- dark presentation background 제거 옵션
- 원본 body 해상도 검사
- 384×448 runtime 정렬
- 발 baseline 보정
- affine residual pose QA
- preview 생성
- QA 통과 시에만 runtime WebP 교체
- manifest 자동 갱신
- `AnimationSequenceLibrary.ts` 자동 승격

즉 앞으로는 프레임을 만든 뒤 수동 코드 수정 없이 설치할 수 있다.

예:

```bash
python3 scripts/install-authored-ken-sequence.py stand-light /path/to/frames/
```

또는:

```bash
python3 scripts/install-authored-ken-sequence.py shoryuken /path/to/sheet.png --cols 4 --rows 3 --dark-background
```

### 4. 낮은 해상도 overview 이미지 오사용 방지
Ken 총정리 이미지는 다음에 reference-only로 저장했다.

`art-source/ken/reference/ken_motion_overview_rc39.png`

이 이미지는 캐릭터가 너무 작고 텍스트/UI가 포함되어 있어 runtime source로 사용하지 않는다.
설치기는 source body height가 240px 미만이면 자동 거부한다.

### 5. 전용 Animation QA 화면 추가
신규:

- `public/animation-qa.html`
- `public/animation-qa.js`

접속 예:

`/animation-qa.html?character=KEN`

기능:
- 이전 / 현재 / 다음 프레임 동시 표시
- 프레임 직접 이동
- 자동 재생 / 속도 조절
- 전체 timeline
- POSE AUTHORED 여부
- RUNTIME ENABLED 여부
- STAGING / REJECTED 여부
- frame size / pipeline / source 표시

이제 QA 화면에서 여러 모션이 같은 이미지인지 바로 확인할 수 있다.

## 검증

PASS:
- `npm run typecheck`
- `npm run verify:ken-pipeline`
- `npm run verify`

주요 유지값:
- Ryu Heavy 92 DAMAGE
- Ken SA I 3 HIT / 327 DAMAGE
- Juggle 2 HIT
- Stage 1→5 PASS
- 24 Super Arts
- 48 Air Normals
- 50-minute Virtual Marathon PASS
- PWA / Offline / Save / Release checks PASS

## 현재 판정

`KEN_AUTHORED_PIPELINE_READY`

아직 Ken 126F를 전부 활성화하지 않은 이유는 명확하다.
현재 존재하는 Ken overview/staging 이미지를 억지로 확대·변형하여 활성화하면 이전의 “모션이 다 같은 사진처럼 보이는 문제”가 재발한다.

다음 작업은 dedicated HQ per-motion source를 순서대로 설치하는 것이다.
우선 체감이 가장 큰 순서:

`Idle → Walk → Dash → Jump → Landing → Stand Light → Stand Heavy → Shoryuken → Tatsumaki → Super`
