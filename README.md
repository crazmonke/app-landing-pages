# app-landing-pages

`upsignaltrader.com` 루트는 **Astro 블로그**, `/apps/`는 **개발한 앱** 목록,
각 앱은 `<앱아이디>.upsignaltrader.com` 서브도메인의 랜딩페이지로 서비스됩니다.
Cloudflare Pages 무료 호스팅 + Pages Functions 미들웨어로 서브도메인 라우팅을 처리합니다.

## 블로그 글 쓰기

1. `src/content/blog/<글-주소>.md` 파일을 만듭니다. 파일 이름이 URL이 됩니다 (`/blog/<글-주소>/`).
2. 맨 위에 frontmatter를 씁니다:
   ```
   ---
   title: '글 제목'
   description: '검색 결과에 보일 한두 문장 요약'
   pubDate: 2026-11-26
   tags: ['태그']
   draft: false   # true면 공개되지 않음
   ---
   ```
3. `npm run dev`로 확인한 뒤 `npm run deploy`로 배포합니다.

사이트 이름, 설명, 애드센스 게시자 ID는 `src/consts.ts`에서 바꿉니다.
애드센스 승인 후에는 `ADSENSE_CLIENT`를 채우고 `public/ads.txt`를 추가하세요.

## 구조

```
src/pages/index.astro        블로그 메인 (글 목록)
src/pages/blog/[...slug]     글 상세
src/pages/apps/index.astro   개발한 앱 목록 (public/apps.json을 빌드 때 읽음)
src/pages/about, privacy     소개, 개인정보처리방침 (애드센스 심사용)
src/content/blog/            블로그 글 (Markdown/MDX)
public/apps.json             모든 앱의 데이터 (이름, 소개, 아이콘, 앱스토어 링크 등)
public/apps/<id>/index.html  앱별 페이지 — 전부 동일한 템플릿(public/apps/_template)의 복사본
public/assets/icons/<id>.png 앱 아이콘
public/css/style.css         앱 페이지 공통 스타일
functions/_middleware.js     서브도메인 → /apps/<id>/ 라우팅
```

## 로컬 미리보기

```bash
npm run dev                                   # 블로그 개발 서버
npm run build && npx wrangler pages dev dist  # 서브도메인 미들웨어까지 포함한 미리보기
```

## 배포 (Cloudflare Pages)

```bash
npm run deploy
```
main 브랜치에서 실행하면 운영(production), 다른 브랜치에서 실행하면 미리보기 배포가 됩니다.

## 새 앱 추가하는 법

1. `public/assets/icons/<새앱id>.png` 에 1024x1024 앱 아이콘을 추가합니다.
2. `public/apps.json` 배열에 새 항목을 하나 추가합니다 (id, name, tagline, description, accent 색상,
   subdomain, appStoreUrl, features 등). `appStoreUrl`은 출시 전이면 `null`로 두면
   "출시 준비 중" 버튼이 자동으로 뜹니다.
3. `public/apps/_template/index.html` 을 그대로 복사해서 `public/apps/<새앱id>/index.html` 에 둡니다
   (내용 수정 불필요).
4. Cloudflare 대시보드 → Pages 프로젝트 → Custom domains 에 와일드카드 도메인
   (`*.upsignaltrader.com`)이 이미 연결되어 있으면 새 서브도메인은 **추가 설정 없이** 바로
   동작합니다. 배포만 다시 하면 끝입니다.

## 도메인 연결

1. Cloudflare에 `upsignaltrader.com` 존(zone) 추가 → 발급된 네임서버를 카페24 도메인
   관리 화면에서 등록.
2. 네임서버 전환 완료 후, Pages 프로젝트 → Custom domains 에
   `upsignaltrader.com` 과 `*.upsignaltrader.com` (와일드카드) 두 개를 추가.
