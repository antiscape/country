/* Curated country highlights.
   A country page is only indexable when it has hand-written facts in
   data/country-facts.json. Pages without curated facts stay online for players
   but are marked noindex and kept out of the sitemap, so search and AdSense
   reviewers only ever see pages with original copy. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FILE = path.join(ROOT, 'data', 'country-facts.json');

let cache = null;

export function loadCountryFacts() {
  if (!cache) cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return cache;
}

export function isCurated(id) {
  return Object.prototype.hasOwnProperty.call(loadCountryFacts(), String(id || '').toUpperCase());
}

export function factsFor(id, lang) {
  const entry = loadCountryFacts()[String(id || '').toUpperCase()];
  if (!entry) return [];
  return entry[lang] || entry.en || [];
}

export function curatedIds() {
  return Object.keys(loadCountryFacts());
}

export function curatedCount() {
  return curatedIds().length;
}
