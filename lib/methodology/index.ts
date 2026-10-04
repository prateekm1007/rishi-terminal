import 'server-only';

import { readdir, readFile } from 'fs/promises';
import path from 'path';

import { parseMarkdown, type MdBlock, type MdHeading } from './markdown';

/**
 * S2-01 (Round 13): the methodology doc loader. The docs live in
 * docs/methodology/*.md in the repo (one per registered consensus
 * scorer, slug = kebab-case of the scorer's canonical name — the same
 * names RISHI_WEIGHT_CONFIG and the scorer registry use). The loader is
 * SERVER-ONLY and reads at BUILD time: both /methodology pages are
 * statically generated, so the runtime never touches the filesystem.
 *
 * Slugs are DERIVED from the scorer names (kebab-case), never a
 * hand-maintained list — a new scorer without a doc fails the coverage
 * gate (test/methodology.coverage.test.ts) instead of silently missing
 * from the page.
 */

export const METHODOLOGY_REQUIRED_HEADINGS = [
  'Inputs',
  'Formula',
  'Thresholds',
  'Rationale',
  'Known failure modes',
  'Sectors where it does not apply',
] as const;

/** Canonical scorer id → doc slug (kebab-case). */
export function scorerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface MethodologyDoc {
  slug: string;
  title: string;
  headings: string[];
  blocks: MdBlock[];
}

function docDir(): string {
  return path.join(process.cwd(), 'docs', 'methodology');
}

/** Every methodology doc present in the repo (slugs + parsed blocks). */
export async function listMethodologyDocs(): Promise<MethodologyDoc[]> {
  const dir = docDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  const docs = await Promise.all(
    files.map(async (f) => {
      const raw = await readFile(path.join(dir, f), 'utf-8');
      const blocks = parseMarkdown(raw);
      const h1 = blocks.find((b) => b.type === 'h1') as MdHeading | undefined;
      return {
        slug: f.replace(/\.md$/, ''),
        title: h1 ? h1.text : f.replace(/\.md$/, ''),
        headings: blocks.filter((b): b is MdHeading => b.type === 'h2').map((b) => b.text),
        blocks,
      };
    }),
  );
  return docs;
}

/** One doc by slug; null when absent (the page renders a 404). */
export async function getMethodologyDoc(slug: string): Promise<MethodologyDoc | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null; // trust boundary: slug is path input (rule 9)
  const dir = docDir();
  try {
    const raw = await readFile(path.join(dir, `${slug}.md`), 'utf-8');
    const blocks = parseMarkdown(raw);
    const h1 = blocks.find((b) => b.type === 'h1') as MdHeading | undefined;
    return {
      slug,
      title: h1 ? h1.text : slug,
      headings: blocks.filter((b): b is MdHeading => b.type === 'h2').map((b) => b.text),
      blocks,
    };
  } catch {
    return null;
  }
}
