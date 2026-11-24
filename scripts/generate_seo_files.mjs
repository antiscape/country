#!/usr/bin/env node
/* Generate deployment SEO files without a full site build.
   Usage:
     npm run seo
     npm run seo -- --domain https://navpage.win --ads-client ca-pub-XXXXXXXXXXXXXXXX
     npm run seo -- --out dist
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSeoFiles } from './seo_files.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const help = process.argv.includes('--help') || process.argv.includes('-h');
if (help) {
  console.log(`Usage: node scripts/generate_seo_files.mjs [options]

Options:
  --domain <url>       Canonical site origin (default: site.config.json baseUrl)
  --ads-client <id>    AdSense publisher ID, ca-pub-... or pub-...
  --out <dir>          Output directory (default: dist)
  --today <YYYY-MM-DD> lastmod date (default: today)
  --help               Show this help

Examples:
  npm run seo -- --domain https://navpage.win
  npm run seo -- --domain https://navpage.win --ads-client ca-pub-1234567890123456
  npm run seo -- --out dist`);
  process.exit(0);
}

const domain = arg('--domain', process.env.SITE_BASE_URL || config.baseUrl || 'https://navpage.win');
const adsClient = arg('--ads-client', process.env.ADSENSE_CLIENT || config.adsense?.client || '');
const outDir = path.resolve(ROOT, arg('--out', 'dist'));
const today = arg('--today', new Date().toISOString().slice(0, 10));

try {
  const result = writeSeoFiles({ domain, adsClient, outDir, today });
  console.log(`Wrote ${result.pages} URLs for ${result.domain}`);
  console.log(`  sitemap.xml  ${path.join(result.outDir, 'sitemap.xml')}`);
  console.log(`  robots.txt   ${path.join(result.outDir, 'robots.txt')}`);
  console.log(`  ads.txt      ${path.join(result.outDir, 'ads.txt')} (${result.adsClient})`);
  if (result.adsClient === 'placeholder') {
    console.log('  ℹ Add your AdSense publisher ID to site.config.json or pass --ads-client.');
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
