# KEN AUTHORED HQ INBOX

여기에 **실제로 서로 다른 포즈로 제작된 고해상도 켄 프레임**만 넣는다.
기존 한 장을 이동/회전/확대해서 만든 중간 프레임은 자동 탈락한다.

## 가장 편한 방식: 모션별 프레임 폴더

```text
art-source/ken/inbox/
  idle/
    01.png
    02.png
    03.png
    04.png
    05.png
    06.png
  walk/
    01.png ... 12.png
```

프레임은 파일명 순서로 읽는다. 투명 PNG/WebP 권장.
캐릭터 본체 높이는 최소 240px, 권장 600px 이상이다.

## 한 장짜리 스프라이트 시트 방식

```text
idle.png
idle.json
```

`idle.json` 예시:

```json
{
  "cols": 6,
  "rows": 1,
  "crop": [0, 0, 3600, 800],
  "indices": [1, 2, 3, 4, 5, 6],
  "darkBackground": false
}
```

`crop`, `indices`, `darkBackground`는 필요할 때만 쓴다.

## 실행

먼저 검사만:

```bash
npm run ingest:ken:dry
```

통과한 모션만 일괄 설치 + 마지막에 검증 1회:

```bash
npm run ingest:ken
```

CI처럼 하나라도 거절되면 실패 코드가 필요할 때:

```bash
npm run ingest:ken:strict
```

일괄 설치는 트랜잭션 방식이다. 사전검사를 통과한 모션만 설치하며,
마지막 `verify:ken-pipeline`이 실패하면 그 실행에서 설치된 런타임 자산/manifest/registry를 전부 이전 상태로 자동 복구한다.

결과는 `RC39_KEN_INGEST_STATUS.json`과 `art-source/ken/ingest-history/*.json`에 남는다.
