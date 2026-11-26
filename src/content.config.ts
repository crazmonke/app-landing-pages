import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 글은 src/content/blog/<lang>/<slug>.md 에 둡니다.
// 같은 <slug>를 가진 ko/en 파일은 서로의 번역본으로 연결됩니다.
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    sources: z
      .array(z.object({
        title: z.string(),
        url: z.string().url().refine((u) => /^https?:\/\//i.test(u), 'http(s) only'),
      }))
      .default([]),
    image: z.string().regex(/^\/images\/blog\/[\w.-]+$/).optional(),
    imageAlt: z.string().optional(),
    imageCredit: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
