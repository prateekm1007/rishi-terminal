// lib/methodology/markdown.ts
// S2-01 (Round 13): a SMALL, TESTED markdown-subset parser for the
// methodology docs. The docs are repo-controlled files
// (docs/methodology/*.md); the parser renders them to React-ready block
// structures — NEVER raw HTML (no dangerouslySetInnerHTML anywhere in
// this pipeline). Unsupported syntax stays literal text rather than
// being guessed at (rule 2 — the renderer does not pretend).
//
// Supported subset (documented in docs/methodology/README.md):
//   # / ## / ###  headings
//   - item        unordered lists
//   ``` fenced code blocks
//   **bold** and `code` inline spans
//   paragraphs (blank-line separated)
// Anything else renders as plain paragraph text.

export interface MdHeading { type: 'h1' | 'h2' | 'h3'; text: string; }
export interface MdParagraph { type: 'p'; text: string; }
export interface MdList { type: 'ul'; items: string[]; }
export interface MdCode { type: 'code'; text: string; }
export type MdBlock = MdHeading | MdParagraph | MdList | MdCode;

/** Inline segments — text is literal; strong/code mark styling only. */
export type InlineSpan = { kind: 'text' | 'strong' | 'code'; text: string };

/** Parse inline **bold** / `code` into styled text spans (no HTML). */
export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) spans.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) spans.push({ kind: 'strong', text: m[1] });
    else spans.push({ kind: 'code', text: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) spans.push({ kind: 'text', text: text.slice(last) });
  return spans;
}

/** Parse the supported markdown subset into blocks. */
export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  let code: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ').trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list !== null) {
      if (list.length) blocks.push({ type: 'ul', items: list });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (code !== null) {
      if (/^```/.test(line.trim())) {
        blocks.push({ type: 'code', text: code.join('\n') });
        code = null;
      } else {
        code.push(raw);
      }
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushPara();
      flushList();
      code = [];
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      blocks.push({ type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3', text: h[2].trim() });
      continue;
    }

    const li = /^-\s+(.*)$/.exec(line);
    if (li) {
      flushPara();
      if (list === null) list = [];
      list.push(li[1].trim());
      continue;
    }

    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }

    para.push(line.trim());
  }
  // EOF
  if (code !== null) {
    // unterminated fence: render what is there (honest, no guessing)
    blocks.push({ type: 'code', text: code.join('\n') });
  }
  flushPara();
  flushList();
  return blocks;
}
