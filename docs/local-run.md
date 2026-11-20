# 로컬 실행

Node.js와 Python 3이 설치된 환경에서 저장소 루트에서 실행합니다.

```sh
npm run build
npm run serve
```

기본 주소는 http://127.0.0.1:4173/ 입니다. `serve`는 실제 Python 3 실행 파일을 찾아 표준 정적 파일 서버를 사용하며, 이미지 요청이 몰릴 때 연결을 거부하지 않도록 수신 대기열을128로 설정하고 WebP를 `image/webp`로 응답합니다. 게임 로직·애니메이션 속도·이미지 파일은 변경하지 않습니다.

Codex 번들 Python 또는 PATH의 실제 Python 3을 사용하고 Windows Store 별칭은 건너뜁니다. 다른 실행 파일을 지정하려면 `SF_PYTHON` 환경 변수에 경로를 설정하거나 해당 실행 파일로 `scripts/serve-local.py`를 실행할 수 있습니다. `--port`, `--bind`, `--directory` 옵션을 지원합니다. 기본 바인드는 이 컴퓨터의 loopback 주소입니다.
