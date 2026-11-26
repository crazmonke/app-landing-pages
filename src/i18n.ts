import { getCollection, type CollectionEntry } from 'astro:content';

export const LANGS = ['ko', 'en'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'ko';

// 한국어는 루트(/), 다른 언어는 /<lang>/ 아래에 둡니다.
export const prefix = (lang: Lang) => (lang === DEFAULT_LANG ? '' : `/${lang}`);

export const UI = {
  ko: {
    locale: 'ko-KR',
    ogLocale: 'ko_KR',
    siteDescription: '지금 화제가 된 이슈를 여러 출처로 확인하고 핵심만 정리하는 블로그',
    blog: '블로그',
    apps: '개발한 앱',
    about: '소개',
    privacy: '개인정보처리방침',
    contact: '문의하기',
    backToList: '← 글 목록으로',
    updated: '수정',
    sources: '참고한 자료',
    switchTo: 'English',
    empty: '아직 글이 없습니다.',
  },
  en: {
    locale: 'en-US',
    ogLocale: 'en_US',
    siteDescription: 'Trending stories, fact-checked across multiple sources and explained in plain language.',
    blog: 'Blog',
    apps: 'Apps',
    about: 'About',
    privacy: 'Privacy',
    contact: 'Contact',
    backToList: '← All posts',
    updated: 'Updated',
    sources: 'Sources',
    switchTo: '한국어',
    empty: 'No posts yet.',
  },
} as const;

export type Post = CollectionEntry<'blog'>;

// 글 id는 "<lang>/<slug>" 형태입니다 (src/content/blog/ko/hello.md → "ko/hello").
export const postLang = (post: Post) => post.id.split('/')[0] as Lang;
export const postSlug = (post: Post) => post.id.split('/').slice(1).join('/');
export const postUrl = (post: Post) => `${prefix(postLang(post))}/blog/${postSlug(post)}/`;

export async function getPosts(lang: Lang) {
  const posts = await getCollection('blog', (p) => !p.data.draft && postLang(p) === lang);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

// 같은 파일 이름을 가진 다른 언어 글을 번역본으로 봅니다.
export async function getTranslations(post: Post) {
  const slug = postSlug(post);
  const all = await getCollection('blog', (p) => !p.data.draft && postSlug(p) === slug);
  return all.map((p) => ({ lang: postLang(p), href: postUrl(p) }));
}

export const formatDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(UI[lang].locale, { year: 'numeric', month: 'long', day: 'numeric' });
