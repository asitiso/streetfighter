# V070 — KEN DASH / JUMP / LANDING AUTHORING + HANDOFF QA

## 이번 배치
- Ken Dash 7F / Jump 8F / Landing 6F 전용 authored semantic gate 추가
- 세 모션 제작 packet + inbox/dropzone 자동 생성
- Base↔Dash, Base↔Jump, Jump→Landing, Landing→Base handoff QA 추가
- Animation QA 화면에서 Dash/Jump/Landing handoff 상태 표시
- runtime semantic audit 범위를 Idle/Walk에서 Dash/Jump/Landing까지 확대

## 현재 transform 기반 Ken이 탈락하는 이유
- **dash**: pose avg 0.001782, semantic FAIL → recoveryNotDuplicate, verticalDrivePresent, authoredMotionAverage, authoredMotionPeak
- **jump**: pose avg 0.001695, semantic FAIL → contactBridgeNotDuplicate, apexPoseDistinct, verticalPhasePresent, aerialLegShapeChanges, authoredMotionAverage, authoredMotionPeak
- **landing**: pose avg 0.001708, semantic FAIL → neutralBridgeNotDuplicate, squashPoseDistinct, compressionPresent, stanceAbsorbsImpact, authoredMotionAverage, authoredMotionPeak

## Known-good authored 기준
- dash: authored Ryu reference PASS (start/end IoU 0.517551, Y range 44.279125)
- jump: authored Ryu reference PASS (apex IoU 0.584384, Y range 85.351573)
- landing: authored Ryu reference PASS (squash IoU 0.324422, Y range 93.855971)

## 편의성
- 실제 프레임은 각 inbox에 번호 PNG만 넣으면 된다.
- `npm run ingest:ken:dash`, `npm run ingest:ken:jump`, `npm run ingest:ken:landing` 한 번으로 설치/QA/manifest/registry 검증까지 처리한다.
- 잘못된 overview 시트나 단순 transform 프레임은 자동 승격되지 않는다.

## 검증
- typecheck PASS
- build PASS
- KEN_AUTHORING_PACKET_PASS
- KEN_INGEST_ORCHESTRATOR_PASS
- KEN_IDLE_SEMANTIC_QA_PASS
- KEN_WALK_SEMANTIC_QA_PASS
- KEN_LOCOMOTION_SEMANTIC_QA_PASS
- KEN_HANDOFF_QA_PASS
- KEN_LOCOMOTION_HANDOFF_QA_PASS
- ANIMATION_SEQUENCE_VERIFY_PASS
- KEN_AUTHORED_PIPELINE_VERIFY_PASS
- V063_RC38_PASS

## 현재 상태
- Ken target: 126F
- Runtime active: 0F
- 실제 authored source가 아직 투입되지 않았으므로 0F 활성 상태 유지가 정상이다.
- 다음 실제 작업은 Ken Idle/Walk/Dash/Jump/Landing PNG authoring source를 dropzone에 넣는 단계다.

## Verdict
`KEN_DASH_JUMP_LANDING_AUTHORING_PIPELINE_PASS`
