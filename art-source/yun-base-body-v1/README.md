# 윤 기본 몸체 원본 재사용

기존 LITE/HD yun.webp가 류 형태인 표시 오류를 수정한다. `art-source/throw-escape-motion-v1/yun/reference-idle.png`를 아래 두 품질 경로로 바이트 그대로 복사했다. 새 이미지 생성·합성·리터칭·리사이즈는 없다. 기존 두 WebP는 보존한다.

- LITE: `public/art/combat-sprites/yun-authored-v1.png`
- HD: `public/art/combat-sprites-hd/yun-authored-v1.png`

각 파일384×448 PNG,107472bytes이며 기존192×224 표시 크기를 유지한다. 두 경로를 분리해 기존 품질별 로딩/해제 계약을 유지한다. LITE의 디코딩 메모리는 기존보다516096bytes(약0.49MiB) 증가하지만 전체6프레임 HQ시트를 로드하지 않는다. 두 SHA256: d880f7b6acbd8f1806fae793d5267c74c6360c9db2913227a679085a54469b68
