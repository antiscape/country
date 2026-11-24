#!/usr/bin/env python3
"""Render a lightweight equirectangular world map SVG from world-atlas TopoJSON."""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/tmp/wa.json"
OUT = os.path.join(ROOT, "assets", "world-map.svg")
W, H = 1000, 500


def build_arcs(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def ring_points(ring, arcs):
    pts = []
    for idx in ring:
        arc = arcs[idx] if idx >= 0 else list(reversed(arcs[~idx]))
        if pts and arc and pts[-1] == arc[0]:
            pts.extend(arc[1:])
        else:
            pts.extend(arc)
    return pts


def project(lon, lat):
    return ((lon + 180) / 360 * W, (90 - lat) / 180 * H)


def path_for(points):
    # split rings that jump across the antimeridian
    segments = []
    cur = []
    last_x = None
    for lon, lat in points:
        x, y = project(lon, lat)
        if last_x is not None and abs(x - last_x) > W / 2:
            if len(cur) > 2:
                segments.append(cur)
            cur = []
        cur.append((x, y))
        last_x = x
    if len(cur) > 2:
        segments.append(cur)
    out = []
    for seg in segments:
        d = "M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in seg) + "Z"
        out.append(d)
    return "".join(out)


def main():
    topo = json.load(open(SRC))
    arcs = build_arcs(topo)
    paths = []
    for geom in topo["objects"]["countries"]["geometries"]:
        if geom.get("id") == "010":  # Antarctica
            continue
        polys = geom["arcs"] if geom["type"] == "MultiPolygon" else [geom["arcs"]]
        d = []
        for poly in polys:
            for ring in poly:
                d.append(path_for(ring_points(ring, arcs)))
        d = "".join(d)
        if d:
            paths.append(f'<path d="{d}"/>')

    grat = []
    for lon in range(-180, 181, 30):
        x = (lon + 180) / 360 * W
        grat.append(f'<line x1="{x:.1f}" y1="0" x2="{x:.1f}" y2="{H}"/>')
    for lat in range(-60, 61, 30):
        y = (90 - lat) / 180 * H
        grat.append(f'<line x1="0" y1="{y:.1f}" x2="{W}" y2="{y:.1f}"/>')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="World map">
<defs>
  <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1a3e5c"/>
    <stop offset="1" stop-color="#122b42"/>
  </linearGradient>
</defs>
<g fill="none" stroke="#4f8db3" stroke-opacity=".10" stroke-width=".7">{''.join(grat)}</g>
<g fill="url(#land)" stroke="#4f8db3" stroke-opacity=".35" stroke-width=".55" fill-rule="evenodd">{''.join(paths)}</g>
</svg>'''
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w").write(svg)
    print("wrote", OUT, len(svg) // 1024, "KB")


if __name__ == "__main__":
    main()
