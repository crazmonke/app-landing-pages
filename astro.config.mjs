// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://upsignaltrader.com',
  trailingSlash: 'ignore',
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
