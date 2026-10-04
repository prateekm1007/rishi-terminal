// X3-05 (Round 14) — the screener expression parser's safety + semantics.
//
// Acceptance (roadmap): fuzz — 10k random strings never throw UNCAUGHT,
// never reach eval; injection strings rejected.
//
// Rule 24 bite: on the pre-X3-05 tree this file fails at import (no
// parser module exists); the PR records the wiring diff and the full run.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ParseError,
  SCREENER_FIELDS,
  evalExpression,
  MAX_EXPRESSION_LENGTH,
  parseExpression,
  type ScreenerRowLike,
} from "../lib/screener/parser";
import { getSlimIndex } from "../lib/scoring/slimIndex";

const UNIVERSE = getSlimIndex() as unknown as ScreenerRowLike[];

// A PRNG with a fixed seed: the fuzz corpus is deterministic (rule 18
// spirit — reproducible verification), 10k strings, every run. The corpus
// MIXES shapes: ~30% well-formed templates (so valid parses are exercised
// and evaluated), ~70% chaos (mutations, noise, keywords, metacharacters)
// — the acceptance counts both outcomes and forbids everything else.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const ALPHABET = "abcde_0123456789 <>=!&|()'.;:/*-+{}[]$\\\"`@#%^~?,";
const FIELD_WORDS = Object.keys(SCREENER_FIELDS);
const KEYWORDS = ["and", "or", "not", "eval", "Function", "constructor", "process", "global", "require", "import"];

function randomString(rng: () => number): string {
  const len = Math.floor(rng() * 60);
  let out = "";
  for (let i = 0; i < len; i++) {
    const r = rng();
    if (r < 0.55) out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
    else if (r < 0.8) out += FIELD_WORDS[Math.floor(rng() * FIELD_WORDS.length)];
    else out += KEYWORDS[Math.floor(rng() * KEYWORDS.length)];
  }
  return out;
}

function randomTemplate(rng: () => number): string {
  const f1 = FIELD_WORDS[Math.floor(rng() * FIELD_WORDS.length)];
  const f2 = FIELD_WORDS[Math.floor(rng() * FIELD_WORDS.length)];
  const ops = ["<", "<=", ">", ">=", "==", "!="];
  const op = ops[Math.floor(rng() * ops.length)];
  const num = Math.round(rng() * 1000);
  const shape = rng();
  if (shape < 0.25) return `${f1} ${op} ${num}`;
  if (shape < 0.45) return `${f1} ${op} ${num} and ${f2} ${op} ${num}`;
  if (shape < 0.6) return `(${f1} < ${num} or ${f2} > ${Math.round(num / 2)})`;
  if (shape < 0.75) return `sector == '${["IT", "Pharma", "Banking", "FMCG", "Oil & Gas"][Math.floor(rng() * 5)]}'`;
  if (shape < 0.9) return `not ${f1} ${op} ${num}`;
  return `${f1} ${op} ${f2}`;
}

function fuzzInput(rng: () => number): string {
  return rng() < 0.3 ? randomTemplate(rng) : randomString(rng);
}

describe("X3-05 — the parser is safe by construction", () => {
  it("the parser source contains no eval and no new Function (static gate)", () => {
    const src = readFileSync(path.resolve(__dirname, "../lib/screener/parser.ts"), "utf8");
    expect(src).not.toMatch(/\beval\s*\(/);
    expect(src).not.toContain("new Function");
    expect(src).not.toMatch(/child_process|node:vm|import\s*\(\s*variable/);
  });

  it("fuzz: 10k random strings never throw uncaught — ParseError or a clean AST, always", () => {
    const rng = makeRng(20261004);
    let parseErrors = 0;
    let parsed = 0;
    for (let i = 0; i < 10_000; i++) {
      const input = fuzzInput(rng);
      try {
        const ast = parseExpression(input);
        parsed++;
        // every parsed AST must also evaluate without throwing
        for (const row of UNIVERSE.slice(0, 8)) evalExpression(ast, row);
      } catch (e) {
        expect(e, `input ${JSON.stringify(input)} threw a non-ParseError`).toBeInstanceOf(ParseError);
        parseErrors++;
      }
    }
    // sanity: the corpus exercised both outcomes, and nothing escaped
    expect(parsed + parseErrors).toBe(10_000);
    expect(parseErrors).toBeGreaterThan(0);
    expect(parsed).toBeGreaterThan(0);
  });

  it("injection shapes are rejected, not executed", () => {
    const injections = [
      "pe < 15; drop table screens",
      "eval(1)",
      "constructor.constructor('return 1')()",
      "process.exit",
      "require('fs')",
      "pe < 15 && (function(){return 1})()",
      "pe.constructor",
      "sector == 'IT' || eval(x)",
      "__proto__",
      "consensus > 0; require",
    ];
    for (const input of injections) {
      expect(() => parseExpression(input), JSON.stringify(input)).toThrow(ParseError);
    }
  });

  it("caps are enforced (length, nesting)", () => {
    expect(() => parseExpression("a".repeat(MAX_EXPRESSION_LENGTH + 1))).toThrow(ParseError);
    // deeply nested parens: build "((" * 40 + "pe<15" + "))" * 40
    const deep = "(".repeat(40) + "pe < 15" + ")".repeat(40);
    expect(() => parseExpression(deep)).toThrow(ParseError);
    // a reasonable nesting depth still parses
    const ok = "(".repeat(10) + "pe < 15" + ")".repeat(10);
    expect(() => parseExpression(ok)).not.toThrow();
  });
});

describe("X3-05 — the parser means what it says (semantics over the real universe)", () => {
  it("numeric filters select exactly the rows that satisfy them", () => {
    const ast = parseExpression("pe < 15 && roe > 20");
    const manual = UNIVERSE.filter(r => typeof r.pe === "number" && typeof r.roe === "number" && (r.pe as number) < 15 && (r.roe as number) > 20);
    const viaParser = UNIVERSE.filter(r => evalExpression(ast, r));
    expect(viaParser).toEqual(manual);
    expect(viaParser.length).toBeGreaterThan(0);
  });

  it("null/missing fields never satisfy a comparison (rule 16)", () => {
    // The slim index currently carries no null consensus rows (every seed
    // record resolves), so the null contract is pinned on SYNTHETIC rows —
    // the same shape the API guards when live data arrives with nulls.
    const nullRow: ScreenerRowLike = { symbol: "X", consensus: null, pe: undefined };
    expect(evalExpression(parseExpression("consensus > 0"), nullRow)).toBe(false);
    expect(evalExpression(parseExpression("consensus <= 0"), nullRow)).toBe(false);
    expect(evalExpression(parseExpression("pe < 100"), nullRow)).toBe(false);
    expect(evalExpression(parseExpression("not (pe < 100)"), nullRow)).toBe(true);
  });

  it("logical connectives and parenthesisation compose", () => {
    const ast = parseExpression("(sector == 'IT' or sector == 'Pharma') and de < 1 and not (pe > 60)");
    for (const row of UNIVERSE) {
      const want =
        (row.sector === "IT" || row.sector === "Pharma") &&
        typeof row.de === "number" && (row.de as number) < 1 &&
        !(typeof row.pe === "number" && (row.pe as number) > 60);
      expect(evalExpression(ast, row)).toBe(want);
    }
  });

  it("a quoted sector literal with spaces and casing matches exactly", () => {
    const ast = parseExpression("sector == 'Auto Ancillaries'");
    const viaParser = UNIVERSE.filter(r => evalExpression(ast, r));
    const manual = UNIVERSE.filter(r => r.sector === "Auto Ancillaries");
    expect(viaParser).toEqual(manual);
    expect(manual.length).toBeGreaterThan(0);
  });

  it("every whitelisted field can be used in an expression", () => {
    for (const field of Object.keys(SCREENER_FIELDS)) {
      expect(() => parseExpression(`${field} != ''`)).not.toThrow();
    }
    expect(() => parseExpression("notAField > 1")).toThrow(ParseError);
  });
});
