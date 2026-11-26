# app-landing-pages

`upsignaltrader.com` 루트는 **Astro 블로그**, `/apps/`는 **개발한 앱** 목록,
각 앱은 `<앱아이디>.upsignaltrader.com` 서브도메인의 랜딩페이지로 서비스됩니다.
Cloudflare Pages 무료 호스팅 + Pages Functions 미들웨어로 서브도메인 라우팅을 처리합니다.

## 블로그 글 쓰기

글은 언어별 폴더에 둡니다. **같은 파일 이름**의 ko/en 글은 서로의 번역본으로 연결됩니다 (언어 전환 링크, hreflang).

```
src/content/blog/ko/<글-주소>.md   → https://upsignaltrader.com/blog/<글-주소>/
src/content/blog/en/<글-주소>.md   → https://upsignaltrader.com/en/blog/<글-주소>/
```

frontmatter:
```
---
title: '글 제목'
description: '검색 결과에 보일 한두 문장 요약'
pubDate: 2026-11-26
tags: ['태그']
sources:                 # 글 아래 "참고한 자료"로 표시됨
  - title: '출처 이름'
    url: 'https://...'
draft: false             # true면 공개되지 않음
---
```

사이트 이름과 애드센스 게시자 ID는 `src/consts.ts`, 언어별 메뉴 문구와 사이트 설명은 `src/i18n.ts`에서 바꿉니다.
애드센스 승인 후에는 `ADSENSE_CLIENT`를 채우고 `public/ads.txt`를 추가하세요.

## 트렌드 초안 자동 생성

`.github/workflows/daily-drafts.yml`이 매일 07:00(KST)에 실행됩니다.

1. Google Trends RSS(`TRENDS_GEO`, 기본 KR)에서 급상승 키워드를 가져옵니다.
2. Claude가 설명할 가치가 있는 주제를 고릅니다 (`DRAFT_COUNT`, 기본 5개). 개인 신상, 사건 피해자, 확인 안 되는 루머는 제외합니다.
3. 주제마다 웹 검색으로 여러 출처를 확인하고 한국어/영어 글을 씁니다. 확인이 안 되면 건너뜁니다.
4. `drafts/<날짜>` 브랜치로 PR을 엽니다.

**검토:** PR에서 글을 읽고, 게시하지 않을 글은 ko/en 파일을 둘 다 지우고, 고칠 부분은 직접 고친 뒤 **Merge하면 게시**됩니다.
Actions 탭 → Daily trend drafts → Run workflow로 바로 실행할 수도 있습니다.

로컬에서:
```bash
npm run trends                 # 오늘의 트렌드만 보기 (API 호출 없음)
ANTHROPIC_API_KEY=... npm run draft   # 초안 생성
```

필요한 GitHub 설정:
- Settings → Secrets and variables → Actions → `ANTHROPIC_API_KEY`
- Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"

## 구조

```
src/pages/index.astro, en/   블로그 메인 (언어별 글 목록)
src/pages/blog, en/blog      글 상세 (src/components/PostView.astro)
src/i18n.ts                  언어 설정, 메뉴 문구
scripts/draft.mjs            트렌드 → 초안 생성 스크립트
src/pages/apps/index.astro   개발한 앱 목록 (public/apps.json을 빌드 때 읽음)
src/pages/about, privacy     소개, 개인정보처리방침 (애드센스 심사용)
src/content/blog/{ko,en}/    블로그 글 (Markdown/MDX)
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
