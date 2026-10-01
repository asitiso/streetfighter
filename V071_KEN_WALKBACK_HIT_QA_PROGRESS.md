# V071 — KEN WALK-BACK + HIT AUTHORING PIPELINE

## 결과
- Ken Walk-back 10F authored source packet 추가
- Ken Hit Reaction 8F authored source packet 추가
- 두 모션 모두 전용 semantic QA 추가
- Base↔Walk-back, Base↔Hit runtime handoff gate 추가
- Animation QA 화면에 두 handoff 상태 표시
- runtime semantic audit 범위를 Idle/Walk/Walk-back/Dash/Jump/Landing/Hit으로 확대

## Walk-back 10F
포즈 계획: rear contact → compression → front toe-off → front lift → passing → opposite contact → opposite compression → rear toe-off → rear lift → return reach.

현재 pilot은 authored가 아니다.
- affine residual average: 0.001487
- affine residual max: 0.001689
- failed semantic checks: oppositeContactDifferent, retreatShapeTravelPresent, stanceChanges, authoredMotionAverage, authoredMotionPeak

즉 기존 파일은 반대발 접지 프레임이 실제로 바뀌지 않고, transform 기반이라 계속 차단된다.

## Hit Reaction 8F
포즈 계획: neutral → impact compression → torso recoil → maximum recoil → foot slide → recovery start → weight recovery → neutral return.

현재 pilot은 authored가 아니다.
- affine residual average: 0.001933
- affine residual max: 0.002273
- failed semantic checks: authoredMotionAverage, authoredMotionPeak

피격 실루엣의 큰 위치 변화만으로는 승격되지 않으며, affine 제거 후에도 실제 관절/실루엣 변화가 남아야 한다.

## 인입
- `npm run prepare:ken:walk-back`
- `npm run ingest:ken:walk-back`
- `npm run prepare:ken:hit`
- `npm run ingest:ken:hit`

각 inbox에는 01.png부터 필요한 프레임 수만큼 투명 HQ PNG를 넣는다. 최소 body height 240px, 600px+ 권장.

## 검증
- TYPECHECK PASS
- BUILD PASS
- KEN_AUTHORING_PACKET_PASS
- KEN_WALKBACK_HIT_SEMANTIC_QA_PASS
- KEN_LOCOMOTION_HANDOFF_QA_PASS
- KEN_AUTHORED_PIPELINE_VERIFY_PASS
- ANIMATION_SEQUENCE_VERIFY_PASS
- V063_RC38_PASS

## 현재 런타임 상태
- Ken target: 126F
- Ken enabled: 0F
- Walk-back/Hit 모두 실제 authored HQ 프레임이 아직 없으므로 disabled 유지

최종 판정: `KEN_WALKBACK_HIT_AUTHORING_PIPELINE_PASS`
