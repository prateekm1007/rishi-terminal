// S2-01 — the methodology markdown-subset parser (Round 13).
//
// The /methodology pages render repo-controlled .md files through
// lib/methodology/markdown.ts. These tests pin the subset AND the
// safety property: the parser produces TEXT blocks only — no HTML is
// ever generated, so repo content cannot accidentally (or adversarially,
// if a doc were ever contributed) inject markup (rule 9).

import { describe, it, expect } from "vitest";

import { parseMarkdown, parseInline } from "../lib/methodology/markdown";

describe("S2-01 — markdown subset parser", () => {
  it("parses headings, paragraphs, lists and fenced code", () => {
    const src = [
      "# Title",
      "",
      "A paragraph with **bold** and `code`.",
      "",
      "## Inputs",
      "",
      "- one",
      "- two",
      "",
      "```",
      "fenced line 1",
      "fenced line 2",
      "```",
      "",
      "### Sub-heading",
      "",
      "Final paragraph.",
    ].join("\n");

    const blocks = parseMarkdown(src);
    expect(blocks.map((b) => b.type)).toEqual(["h1", "p", "h2", "ul", "code", "h3", "p"]);
    const ul = blocks.find((b) => b.type === "ul") as { type: "ul"; items: string[] };
    expect(ul.items).toEqual(["one", "two"]);
    const code = blocks.find((b) => b.type === "code") as { type: "code"; text: string };
    expect(code.text).toBe("fenced line 1\nfenced line 2");
  });

  it("multi-line paragraphs join into one block", () => {
    const blocks = parseMarkdown("line one\ncontinues here\nand here.\n\nNew paragraph.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "p", text: "line one continues here and here." });
    expect(blocks[1]).toEqual({ type: "p", text: "New paragraph." });
  });

  it("inline parsing splits bold and code spans, keeping literal text", () => {
    expect(parseInline("a **b** c `d` e")).toEqual([
      { kind: "text", text: "a " },
      { kind: "strong", text: "b" },
      { kind: "text", text: " c " },
      { kind: "code", text: "d" },
      { kind: "text", text: " e" },
    ]);
    expect(parseInline("no markers")).toEqual([{ kind: "text", text: "no markers" }]);
    // unclosed markers stay literal text (no guessing)
    expect(parseInline("a **b")).toEqual([{ kind: "text", text: "a **b" }]);
  });

  it("HTML-looking content is rendered as literal text, never markup", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>\n\n- <img src=x onerror=alert(1)>");
    const serialized = JSON.stringify(blocks);
    // the content survives as TEXT to be rendered via React text nodes
    expect(serialized).toContain("<script>alert(1)</script>");
    // and the parser emitted no HTML of its own anywhere
    expect(parseInline("<b>x</b>")).toEqual([{ kind: "text", text: "<b>x</b>" }]);
  });

  it("unterminated code fence renders the content instead of dropping it", () => {
    const blocks = parseMarkdown("```js\nconst x = 1;");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "code", text: "const x = 1;" });
  });

  it("handles CRLF and does not treat indented text as code", () => {
    const blocks = parseMarkdown("para\r\n\r\n## H\r\n\r\n  indented text");
    expect(blocks.map((b) => b.type)).toEqual(["p", "h2", "p"]);
  });
});
