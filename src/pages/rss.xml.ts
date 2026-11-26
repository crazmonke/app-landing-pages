import type { APIContext } from 'astro';
import { buildRss } from '../rss';
export const GET = (context: APIContext) => buildRss('ko', context.site);
