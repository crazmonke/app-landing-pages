// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeSanitize from 'rehype-sanitize';

export default defineConfig({
  site: 'https://upsignaltrader.com',
  trailingSlash: 'ignore',
  // 글 본문의 HTML을 정화합니다 (script/이벤트 속성 제거, 링크는 http(s)·mailto·상대 경로만 허용).
  // 자동 생성 초안에 웹에서 읽은 내용이 섞여도 스크립트가 실행되지 않게 합니다.
  markdown: { rehypePlugins: [rehypeSanitize] },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    mdx(),
    sitemap({ i18n: { defaultLocale: 'ko', locales: { ko: 'ko-KR', en: 'en-US' } } }),
  ],
});
