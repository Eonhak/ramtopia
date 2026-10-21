# RAMTOPIA

작은 픽셀 왕국을 탐험하는 싱글 플레이 턴제 전략 게임. 전사 이동, 안개 탐험, 도시 점령, 전투, 훈련, 도시 성장, AI 왕국과 승패 판정을 제공합니다.

## 실행

Node.js 20.19+ 또는 22.12+에서:

```sh
npm ci
npm run dev -- --port 3000
```

배포 빌드: `npm run build`

초록 전사를 클릭한 다음 빛나는 인접 타일을 클릭하면 이동하거나 공격합니다. 도시의 전사를 먼저 이동시키면 그 도시에서 새 전사를 훈련할 수 있습니다. 턴을 마치면 AI가 행동하고 도시 수입을 받습니다. 붉은 수도를 점령하면 승리합니다.

외부 서비스나 API 키는 필요하지 않습니다. 글꼴은 Google Fonts를 사용하며 연결이 없으면 시스템 글꼴을 사용합니다.

## Windows 데스크톱 앱

Windows 10/11 64비트용입니다. `RAMTOPIA-Windows-x64.zip`을 모두 압축 해제한 뒤 `RAMTOPIA.exe`를 실행합니다. EXE와 함께 있는 파일과 폴더가 필요합니다. Node.js 설치나 인터넷 연결은 필요하지 않습니다.

직접 패키징하려면 `npm ci` 이후 `npm run package:win`을 실행하세요. 결과는 `release/RAMTOPIA-win32-x64`에 생성됩니다. 이 버전은 코드 서명되지 않았습니다.

## GitHub에서 다운로드

저장소의 **Actions → Build Windows Game → 성공한 실행 → Artifacts → RAMTOPIA-Windows-x64**에서 Windows용 파일을 다운로드하세요. ZIP 전체를 압축 해제하고 `RAMTOPIA.exe`를 실행합니다. 아티팩트는 30일간 보관됩니다.

`v*` 태그를 푸시하면 동일한 빌드를 GitHub Releases에도 ZIP으로 게시합니다.
