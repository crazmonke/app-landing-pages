#!/usr/bin/env node
// 오늘의 Google Trends 급상승 키워드로 한국어/영어 블로그 초안을 만듭니다.
//
//   node scripts/draft.mjs            # 초안 생성 (ANTHROPIC_API_KEY 필요)
//   node scripts/draft.mjs --dry-run  # API 호출 없이 트렌드 목록만 출력
//
// 환경 변수
//   TRENDS_GEO     트렌드 국가 코드 (기본 KR)
//   DRAFT_COUNT    만들 글 수 (기본 5)
//   CLAUDE_MODEL   모델 (기본 claude-opus-5-5)
//   CLAUDE_EFFORT  low | medium | high (기본 high)
//   PR_BODY_FILE   PR 본문을 저장할 경로 (선택)
//
// 만든 글은 src/content/blog/{ko,en}/<slug>.md 로 저장됩니다.
// 게시 여부는 사람이 PR을 검토해서 결정합니다.

import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const GEO = process.env.TRENDS_GEO || 'KR';
const COUNT = Number(process.env.DRAFT_COUNT || 5);
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.CLAUDE_EFFORT || 'high';
const DRY_RUN = process.argv.includes('--dry-run');
const CONTENT_DIR = path.resolve('src/content/blog');
const BETAS = ['server-side-fallback-2026-07-01'];

// 오늘 날짜 (한국 시간)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

// ---------------------------------------------------------------- 트렌드 수집

const decode = (s) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

async function fetchTrends(geo) {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`);
  if (!res.ok) throw new Error(`Google Trends RSS ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
    keyword: tag(item, 'title'),
    traffic: tag(item, 'ht:approx_traffic'),
    news: [...item.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].map(([, n]) => ({
      title: tag(n, 'ht:news_item_title'),
      url: tag(n, 'ht:news_item_url'),
      source: tag(n, 'ht:news_item_source'),
    })),
  }));
}

const trafficNum = (t) => Number(String(t).replace(/[^\d]/g, '')) || 0;

// ---------------------------------------------------------------- Claude 호출

const client = DRY_RUN ? null : new Anthropic();

function textOf(message) {
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// 서버 도구(web_search/web_fetch)가 pause_turn 으로 멈추면 이어서 실행합니다.
async function run(params, maxContinuations = 6) {
  const messages = [...params.messages];
  for (let i = 0; i <= maxContinuations; i++) {
    const message = await client.beta.messages
      .stream({ ...params, messages, betas: BETAS, fallbacks: 'default' })
      .finalMessage();
    if (message.stop_reason === 'refusal') {
      throw new Error(`refused (${message.stop_details?.category ?? 'unknown'})`);
    }
    if (message.stop_reason !== 'pause_turn') return message;
    messages.push({ role: 'assistant', content: message.content });
  }
  throw new Error('too many pause_turn continuations');
}

const SELECT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['picks'],
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['keyword', 'angle'],
        properties: {
          keyword: { type: 'string' },
          angle: { type: 'string' },
        },
      },
    },
  },
};

async function selectTopics(trends) {
  const list = trends
    .map((t, i) => `${i + 1}. ${t.keyword} (${t.traffic})\n${t.news.map((n) => `   - ${n.title} [${n.source}]`).join('\n')}`)
    .join('\n');
  const message = await run({
    model: MODEL,
    max_tokens: 4000,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: SELECT_SCHEMA },
    },
    messages: [{
      role: 'user',
      content: `You pick topics for an explainer blog that publishes in Korean and English.
Below are today's trending searches in ${GEO} with related headlines.

Pick up to ${COUNT} keywords that are worth a well-sourced explainer, highest search traffic first.
Skip a keyword when:
- the story is mainly about a private individual, a crime victim, a death, or someone's health
- it is an unverified rumor, or there is nothing to explain beyond the headline
- it would need medical, legal or investment advice to be useful
For each pick, write one sentence for "angle": the question a reader searching this keyword wants answered.

${list}`,
    }],
  });
  return JSON.parse(textOf(message)).picks.slice(0, COUNT);
}

const SYSTEM = `You are the editor of UpSignal, a blog that explains trending stories in Korean and English.
Readers arrive from search and want to know: what happened, what is confirmed, and why it matters.

Rules:
- Research with web search and web fetch before writing. Use several independent, reliable sources (official releases, major outlets). Do not rely on a single article.
- Write everything in your own words. Never copy sentences from sources. Quote at most one short phrase if essential.
- Clearly separate confirmed facts from claims, forecasts or rumors, and say who made each claim.
- Add what the news usually lacks: background, context, numbers explained, and what happens next.
- No speculation about private individuals. No medical, legal or investment advice.
- If you cannot verify the core facts with reliable sources, do not write the article. Output only <skip>reason</skip>.
- The English version is written for international readers, not a literal translation: explain Korea-specific context they would not know.
- Markdown body only: use ## and ### headings, short paragraphs, bullet lists or a small table where they help. Do not repeat the title as a heading. Do not add a sources section; sources go in <sources>.`;

function articlePrompt(pick, trend) {
  return `Trending keyword in ${GEO} on ${today}: "${pick.keyword}" (search volume ${trend?.traffic ?? 'unknown'})
Reader question: ${pick.angle}

Headlines Google Trends linked to this keyword (starting points only, verify them):
${(trend?.news ?? []).map((n) => `- ${n.title} (${n.source}) ${n.url}`).join('\n') || '- none'}

Write the article in both languages. Korean: about 1,500 to 3,000 characters. English: about 600 to 1,000 words.
Titles should match what people search for, be specific, and stay under 60 characters (Korean) / 70 characters (English). No clickbait.

Answer in exactly this format and nothing else:
<slug>short-english-kebab-case-slug</slug>
<ko_title>...</ko_title>
<ko_description>one or two sentences, under 150 characters</ko_description>
<ko_tags>tag1, tag2, tag3</ko_tags>
<ko_body>
markdown
</ko_body>
<en_title>...</en_title>
<en_description>one or two sentences, under 160 characters</en_description>
<en_tags>tag1, tag2, tag3</en_tags>
<en_body>
markdown
</en_body>
<sources>
Source title | https://url
</sources>`;
}

// 웹에서 읽은 내용이 섞일 수 있으므로 HTML 태그와 http(s)가 아닌 링크를 제거합니다.
const stripHtml = (s) => s.replace(/<\/?[a-zA-Z!][^>]*>/g, '');
const safeLinks = (md) => md.replace(/\]\(\s*(?!https?:\/\/|\/|#)[^)]*\)/gi, ']()');
const clean = (s) => safeLinks(stripHtml(s));
const isHttpUrl = (u) => { try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; } };

const pick = (text, name) => text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1].trim() ?? '';

async function writeArticle(topic, trend) {
  const message = await run({
    model: MODEL,
    max_tokens: 64000,
    system: SYSTEM,
    output_config: { effort: EFFORT },
    tools: [
      { type: 'web_search_20260209', name: 'web_search', max_uses: 8, user_location: { type: 'approximate', country: GEO } },
      { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 8 },
    ],
    messages: [{ role: 'user', content: articlePrompt(topic, trend) }],
  });
  const text = textOf(message);
  const skip = pick(text, 'skip');
  if (skip) return { skipped: skip };

  const sources = pick(text, 'sources').split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter(([title, url]) => title && isHttpUrl(url ?? ''))
    .map(([title, url]) => ({ title: stripHtml(title), url: new URL(url).href }));
  const lang = (l) => ({
    title: stripHtml(pick(text, `${l}_title`)),
    description: stripHtml(pick(text, `${l}_description`)),
    tags: stripHtml(pick(text, `${l}_tags`)).split(',').map((s) => s.trim()).filter(Boolean),
    body: clean(pick(text, `${l}_body`)),
  });
  const article = {
    slug: pick(text, 'slug').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
    ko: lang('ko'),
    en: lang('en'),
    sources,
  };
  for (const l of ['ko', 'en']) {
    if (!article[l].title || !article[l].body) throw new Error(`missing ${l} title or body`);
  }
  if (sources.length < 2) throw new Error('fewer than 2 sources');
  return article;
}

// ---------------------------------------------------------------- 파일 저장

const yamlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

function saveArticle(article) {
  let slug = `${today}-${article.slug || 'post'}`;
  for (let n = 2; fs.existsSync(path.join(CONTENT_DIR, 'ko', `${slug}.md`)); n++) slug = `${today}-${article.slug}-${n}`;
  for (const l of ['ko', 'en']) {
    const a = article[l];
    const frontmatter = [
      '---',
      `title: ${yamlStr(a.title)}`,
      `description: ${yamlStr(a.description)}`,
      `pubDate: ${today}`,
      `tags: [${a.tags.map(yamlStr).join(', ')}]`,
      'sources:',
      ...article.sources.map((s) => `  - title: ${yamlStr(s.title)}\n    url: ${yamlStr(s.url)}`),
      '---',
    ].join('\n');
    fs.mkdirSync(path.join(CONTENT_DIR, l), { recursive: true });
    fs.writeFileSync(path.join(CONTENT_DIR, l, `${slug}.md`), `${frontmatter}\n\n${a.body}\n`);
  }
  return slug;
}

// ---------------------------------------------------------------- 실행

const trends = (await fetchTrends(GEO)).sort((a, b) => trafficNum(b.traffic) - trafficNum(a.traffic));
console.log(`Trends ${GEO} ${today}: ${trends.length} keywords`);
for (const t of trends) console.log(`  ${t.traffic.padStart(7)}  ${t.keyword}  (${t.news.length} news)`);
if (DRY_RUN) process.exit(0);

const picks = await selectTopics(trends);
console.log(`\nSelected: ${picks.map((p) => p.keyword).join(', ')}`);

const results = [];
for (const p of picks) {
  const trend = trends.find((t) => t.keyword === p.keyword);
  process.stdout.write(`\n• ${p.keyword} ... `);
  try {
    const article = await writeArticle(p, trend);
    if (article.skipped) {
      console.log(`skipped: ${article.skipped}`);
      results.push({ keyword: p.keyword, skipped: article.skipped });
      continue;
    }
    const slug = saveArticle(article);
    console.log(`saved ${slug}`);
    results.push({ keyword: p.keyword, traffic: trend?.traffic, slug, title: article.ko.title, enTitle: article.en.title, sources: article.sources.length });
  } catch (err) {
    console.log(`failed: ${err.message}`);
    results.push({ keyword: p.keyword, failed: err.message });
  }
}

const written = results.filter((r) => r.slug);
const body = [
  `## ${today} 트렌드 초안 (${GEO})`,
  '',
  '검토 방법: 각 글의 **Files changed**에서 내용과 출처를 확인하세요.',
  '- 게시하지 않을 글은 ko/en 파일을 둘 다 삭제하세요.',
  '- 수정이 필요하면 파일을 직접 고치세요.',
  '- Cloudflare 미리보기 링크에서 실제 화면을 볼 수 있습니다.',
  '- **Merge하면 바로 게시됩니다.**',
  '',
  '| 키워드 | 검색량 | 제목 | 출처 수 |',
  '|---|---|---|---|',
  ...written.map((r) => `| ${r.keyword} | ${r.traffic ?? ''} | ${r.title}<br>${r.enTitle} | ${r.sources} |`),
  '',
  ...results.filter((r) => !r.slug).map((r) => `- 제외: ${r.keyword} — ${r.skipped ?? r.failed}`),
].join('\n');

if (process.env.PR_BODY_FILE) fs.writeFileSync(process.env.PR_BODY_FILE, body);
console.log(`\n${written.length} draft(s) written.`);
