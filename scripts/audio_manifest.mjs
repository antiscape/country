#!/usr/bin/env node
/* Build data/audio-manifest.json: every (language, country, field) pair that
   needs a spoken clip. Consumed by scripts/generate_audio.py. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from '../js/data.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LANGS = ['zh', 'en', 'es', 'fr'];

function countryName(c, lang) {
  if (lang === 'zh') return c.nameZh;
  if (lang === 'es') return c.nameEs || c.name;
  if (lang === 'fr') return c.nameFr || c.name;
  return c.name;
}
function capitalName(c, lang) {
  if (lang === 'zh') return c.capitalZh;
  if (lang === 'es') return c.capitalEs || c.capital;
  if (lang === 'fr') return c.capitalFr || c.capital;
  return c.capital;
}

const entries = [];
for (const lang of LANGS) {
  for (const c of COUNTRIES) {
    const id = c.id.toLowerCase();
    entries.push({ lang, id, field: 'name', text: countryName(c, lang) });
    entries.push({ lang, id, field: 'capital', text: capitalName(c, lang) });
  }
}

fs.writeFileSync(path.join(ROOT, 'data', 'audio-manifest.json'), `${JSON.stringify(entries, null, 1)}\n`);
console.log(`manifest: ${entries.length} clips (${count(entries)} unique texts)`);
function count(list) {
  return new Set(list.map((e) => `${e.lang}|${e.text}`)).size;
}
