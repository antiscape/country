/* Per-country reference data (main languages + currency) used by the country
   pages. Stored as vocabulary + codes so all four languages stay consistent. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FILE = path.join(ROOT, 'data', 'country-extra.json');

let cache = null;

export function loadExtra() {
  if (!cache) cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return cache;
}

export function extraFor(id, lang) {
  const data = loadExtra();
  const entry = data.countries[String(id || '').toUpperCase()];
  if (!entry) return null;
  return {
    langs: (entry.l || []).map((code) => data.languages[code]?.[lang]).filter(Boolean),
    many: entry.m || 0,
    currency: data.currencies[entry.c]?.[lang] || '',
  };
}
