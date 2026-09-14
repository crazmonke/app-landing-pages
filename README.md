# app-landing-pages

`upsignaltrader.com` 루트 도메인은 전체 앱 목록(허브 페이지), 각 앱은
`<앱아이디>.upsignaltrader.com` 서브도메인으로 서비스되는 랜딩페이지 모음입니다.
Cloudflare Pages 무료 호스팅 + Pages Functions 미들웨어로 서브도메인 라우팅을 처리합니다.

## 구조

```
index.html          루트 도메인에서 보여줄 전체 앱 허브 페이지
apps.json           모든 앱의 데이터 (이름, 소개, 아이콘, 앱스토어 링크 등)
apps/<id>/index.html   앱별 페이지 — 전부 동일한 템플릿(apps/_template)의 복사본
assets/icons/<id>.png  앱 아이콘 (1024x1024 App Store 아이콘 재사용)
css/style.css        공통 스타일
functions/_middleware.js  서브도메인 → /apps/<id>/ 라우팅
```

페이지 내용은 전부 `apps.json`에서 읽어와 JS로 렌더링합니다. `apps/<id>/index.html` 자체는
어떤 앱이든 내용이 100% 동일한 셸(shell)이며, 접속한 서브도메인(또는 경로)을 보고
`apps.json`에서 맞는 항목을 찾아 채웁니다.

## 새 앱 추가하는 법

1. `assets/icons/<새앱id>.png` 에 1024x1024 앱 아이콘을 추가합니다.
2. `apps.json` 배열에 새 항목을 하나 추가합니다 (id, name, tagline, description, accent 색상,
   subdomain, appStoreUrl, features 등). `appStoreUrl`은 출시 전이면 `null`로 두면
   "출시 준비 중" 버튼이 자동으로 뜹니다.
3. `apps/_template/index.html` 을 그대로 복사해서 `apps/<새앱id>/index.html` 에 둡니다
   (내용 수정 불필요).
4. Cloudflare 대시보드 → Pages 프로젝트 → Custom domains 에 와일드카드 도메인
   (`*.upsignaltrader.com`)이 이미 연결되어 있으면 새 서브도메인은 **추가 설정 없이** 바로
   동작합니다. 배포만 다시 하면 끝입니다.

## 로컬 미리보기

```bash
npx serve .
# http://localhost:3000/                → 허브 페이지
# http://localhost:3000/apps/yeppi/     → yeppi 개별 페이지 (경로 기반 미리보기)
```

## 배포 (Cloudflare Pages)

```bash
npx wrangler pages deploy . --project-name=app-landing-pages
```

## 도메인 연결

1. Cloudflare에 `upsignaltrader.com` 존(zone) 추가 → 발급된 네임서버를 카페24 도메인
   관리 화면에서 등록.
2. 네임서버 전환 완료 후, Pages 프로젝트 → Custom domains 에
   `upsignaltrader.com` 과 `*.upsignaltrader.com` (와일드카드) 두 개를 추가.
