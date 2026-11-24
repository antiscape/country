#!/usr/bin/env python3
"""Generate spoken clips for country names and capitals.

Two phases so the network latency is not serialised behind ffmpeg:
  1. download raw audio for every (language, country, field) with edge-tts
  2. trim silence and re-encode the raw files in parallel

Output: assets/audio/<lang>/<iso>-<field>.mp3 (mono, 24 kHz, 32 kbps).
Existing final files are skipped, so the script is safe to re-run.

Usage: PYTHONPATH=./.tools python3 scripts/generate_audio.py [--limit N]
"""
import asyncio
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio')
RAW = os.path.join(ROOT, '.audio-raw')
MANIFEST = os.path.join(ROOT, 'data', 'audio-manifest.json')

VOICES = {
    'en': 'en-US-AriaNeural',
    'zh': 'zh-CN-XiaoxiaoNeural',
    'es': 'es-ES-ElviraNeural',
    'fr': 'fr-FR-DeniseNeural',
}

TRIM = (
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,'
    'areverse,'
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,'
    'areverse'
)

CONCURRENCY = 16
sem = None
stats = {'downloaded': 0, 'skipped': 0, 'encoded': 0, 'failed': 0}


def paths(entry):
    base = f"{entry['id']}-{entry['field']}.mp3"
    return (
        os.path.join(OUT, entry['lang'], base),
        os.path.join(RAW, entry['lang'], base),
    )


async def download(entry):
    final, raw = paths(entry)
    if os.path.exists(final):
        stats['skipped'] += 1
        return
    os.makedirs(os.path.dirname(raw), exist_ok=True)
    os.makedirs(os.path.dirname(final), exist_ok=True)
    if os.path.exists(raw) and os.path.getsize(raw) > 0:
        return
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(entry['text'], VOICES[entry['lang']], rate='-5%').save(raw)
                stats['downloaded'] += 1
                if stats['downloaded'] % 100 == 0:
                    print(f"  downloaded {stats['downloaded']}", flush=True)
                return
            except Exception as exc:  # noqa: BLE001
                if os.path.exists(raw):
                    os.remove(raw)
                if attempt == 3:
                    stats['failed'] += 1
                    print(f"  FAIL {entry['lang']}/{entry['id']}-{entry['field']}: {exc}", flush=True)
                else:
                    await asyncio.sleep(1 + attempt * 2)


def encode(entry):
    final, raw = paths(entry)
    if os.path.exists(final):
        return
    if not os.path.exists(raw):
        return
    tmp = final + '.tmp.mp3'
    try:
        subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', TRIM,
             '-ac', '1', '-ar', '24000', '-b:a', '32k', tmp],
            check=True,
        )
        os.replace(tmp, final)
        os.remove(raw)
        stats['encoded'] += 1
    except Exception:  # noqa: BLE001
        if os.path.exists(tmp):
            os.remove(tmp)
        stats['failed'] += 1


async def main():
    global sem
    sem = asyncio.Semaphore(CONCURRENCY)
    with open(MANIFEST, encoding='utf-8') as fh:
        entries = json.load(fh)
    if '--limit' in sys.argv:
        entries = entries[:int(sys.argv[sys.argv.index('--limit') + 1])]

    print(f'phase 1: downloading {len(entries)} clips, {CONCURRENCY} at a time', flush=True)
    await asyncio.gather(*(download(e) for e in entries))

    pending = [e for e in entries if os.path.exists(paths(e)[1])]
    print(f'phase 2: encoding {len(pending)} clips', flush=True)
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(encode, pending))

    print(f"done: {stats['encoded']} encoded, {stats['skipped']} already present, {stats['failed']} failed")


if __name__ == '__main__':
    asyncio.run(main())
