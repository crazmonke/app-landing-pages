import rss from '@astrojs/rss';
import { SITE_TITLE } from './consts';
import { UI, getPosts, postUrl, type Lang } from './i18n';

export async function buildRss(lang: Lang, site: URL | undefined) {
  const posts = await getPosts(lang);
  return rss({
    title: SITE_TITLE,
    description: UI[lang].siteDescription,
    site: site!,
    customData: `<language>${UI[lang].locale}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postUrl(post),
    })),
  });
}
