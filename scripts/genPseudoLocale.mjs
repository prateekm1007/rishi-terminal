#!/usr/bin/env node
// R4-06: generate messages/pseudo.json from en.json — the pseudo-locale
// for the overflow acceptance ("expanded strings show no overflow").
// Standard pseudo-loc transform: wrap in brackets and expand every
// string by ~40% (accents are skipped — the app's fonts handle Devanagari
// and Latin; expansion is what stresses layouts).
//
// Regenerate after catalog changes:
//   node scripts/genPseudoLocale.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const expand = (s) => {
  if (typeof s !== 'string' || s.length === 0) return s;
  const pad = Math.max(3, Math.round(s.length * 0.4));
  return `[${s}${'×'.repeat(pad)}]`;
};

const walk = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v && typeof v === 'object' ? walk(v) : expand(v);
  }
  return out;
};

const en = JSON.parse(readFileSync('messages/en.json', 'utf8'));
writeFileSync('messages/pseudo.json', JSON.stringify(walk(en), null, 2) + '\n', 'utf8');
console.log('messages/pseudo.json written');
