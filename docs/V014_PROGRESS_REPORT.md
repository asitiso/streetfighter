# Side-Scroll Chronicles v0.0.14 — High-Frame Motion Pass

## 1. 구현 내용

### Rendering-only Motion Pose layer
- 신규 `AnimationPoseLibrary.ts` 추가.
- 전투 시뮬레이션 Fixed 60Hz와 완전히 분리된 렌더링 전용 Key Pose 보간 구조.
- 전투 프레임/Parry window/Hitbox timing은 변경하지 않음.

### Key Pose 확대
- Idle: 7 poses
- Walk: 9 poses
- Jump: 8 poses
- Hit Reaction: 7 poses
- Parry: 6 poses
- Special: 9 poses
- Super Art: 11 poses

각 pose 사이를 smooth interpolation하여 기존 2~4단계 벡터 포즈보다 움직임 연결을 풍부하게 함.

### 8인 Motion Signature 분리
각 플레이어 캐릭터에 서로 다른 다음 값을 부여:
- stride
- upper-body motion
- attack snap
- vertical bounce
- attack reach presentation
- recovery cadence

Ryu/Ken/Chun-Li/Alex/Dudley/Makoto/Ibuki/Yun 8명의 motion signature가 전부 다름.

### 상태별 표현 개선
- Walk: 보폭/양팔 swing/상하 bounce를 key pose로 보간.
- Jump: launch → ascent → apex → fall → landing 준비 자세 분리.
- Hit: 첫 recoil → 최대 충격 → 복귀를 다단 pose로 처리.
- Parry: brace → contact → deflect → reset 순서 강화.
- Special/Super: anticipation → coil → contact → follow-through → recovery 흐름을 더 많은 pose로 보간.
- 기본 팔 렌더링을 관절형 upper-arm/forearm pose로 확장.

## 2. 실제 변경 파일
- `src/render/AnimationPoseLibrary.ts` (new)
- `src/render/Visuals.ts`
- `src/scenes/TitleScene.ts`
- `public/sw.js`
- `scripts/verify-build.mjs`
- `scripts/verify-v014-animation.mjs` (new)
- `package.json`

## 3. 테스트 결과

### v0.0.14 animation verification
- Idle >= 6: PASS (7)
- Walk >= 8: PASS (9)
- Jump >= 7: PASS (8)
- Hit >= 6: PASS (7)
- Parry >= 5: PASS (6)
- Special >= 8: PASS (9)
- Super >= 10: PASS (11)
- 8 playable motion signatures unique: PASS

### Full regression
- TypeScript strict: PASS
- Production build: PASS
- Combat: PASS
- Guard / Parry / command input: PASS
- BELT multi-enemy: PASS
- Enemy Director / AI archetypes: PASS
- 8-character combat fidelity: PASS
- 24 Super Arts: PASS
- 48 air normals / command normals / target combos: PASS
- Multi-hit / Juggle / Wall Bounce / Ground Bounce: PASS
- Urien / Gill patterns: PASS
- Stage 1 → Stage 5 campaign: PASS
- Continue / Stage Select / Options: PASS
- Cinematic camera / boss close-up / stage visual polish: PASS
- PWA shell/cache: PASS

Regression reference values remained stable:
- Ryu heavy hit test: 92 damage
- Ken SA I: 3 hits / 327 damage
- Juggle verification: 2 follow-up hits
- BELT active attackers: 2

### HTTP distribution check
HTTP 200:
- `/`
- `/assets/main.js`
- `/assets/render/Visuals.js`
- `/assets/render/AnimationPoseLibrary.js`
- `/assets/combat/Fighter.js`
- `/assets/scenes/Stage1Scene.js`
- `/sw.js`
- `/manifest.webmanifest`

## 4. 아직 남은 문제
- 현재 캐릭터는 제작 스프라이트가 아닌 procedural/vector fighter이므로 원 MASTER의 SFIII급 고밀도 sprite animation 수준에는 아직 미달.
- 실제 모바일 기기에서 touch latency / PWA install / safe-area / low-end performance 검증이 필요.
- 캐릭터별 Special/Super의 silhouette 차이를 더 크게 벌릴 수 있음.
- 발/의상/머리의 secondary motion은 아직 제한적.

## 5. 다음 진행 우선순위
1. 캐릭터별 Special/Super 전용 key-pose 세트 세분화
2. 발차기/회전기/대공기의 관절형 하체 animation 확대
3. Landing / Dash / Throw / Throw Escape 전용 motion clip 추가
4. 머리띠·의상·포니테일 등 secondary motion 추가
5. 실제 모바일 화면 기준 frame pacing / touch response 검증

V0.1 COMPLETE는 아직 선언하지 않는다.
