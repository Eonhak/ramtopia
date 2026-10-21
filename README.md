# RAMTOPIA

브라우저에서 플레이하는 픽셀 턴제 전략 게임입니다. 전사 이동, 안개 탐험, 도시 점령, 전투, 훈련, 도시 성장, AI 왕국과 승패 판정을 제공합니다. EXE 설치는 필요하지 않습니다.

## 웹에서 플레이

GitHub Pages 배포 후 주소: https://eonhak.github.io/ramtopia/

`main`에 푸시하면 **Actions → Deploy Web Game**에서 빌드하고 `gh-pages` 브랜치에 정적 사이트를 게시합니다. Actions 아티팩트 저장 공간은 사용하지 않습니다.

최초 한 번 저장소 **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: gh-pages / (root) → Save**를 설정해야 합니다. `gh-pages`가 없으면 Deploy Web Game 실행이 성공한 뒤 선택하세요. 저장소 공개 여부와 요금제에 따라 GitHub Pages 사용 가능 여부가 달라질 수 있습니다.

## 로컬 실행

Node.js 20.19+ 또는 22.12+에서:

```sh
npm ci
npm run dev -- --port 3000
```

브라우저로 http://localhost:3000 에 접속합니다. 배포 빌드는 `npm run build`, 빌드 미리보기는 `npm run preview`입니다.

## 조작

초록 전사를 클릭하고 빛나는 인접 타일을 클릭하면 이동하거나 공격합니다. 도시의 전사를 먼저 이동시키면 그 도시에서 새 전사를 훈련할 수 있습니다. 턴을 마치면 AI가 행동하고 도시 수입을 받습니다. 붉은 수도를 점령하면 승리합니다.

외부 API 키는 필요하지 않습니다. 글꼴은 Google Fonts를 사용하며 연결이 없으면 시스템 글꼴을 사용합니다.
