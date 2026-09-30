"""
Build simplified GeoJSON of the official flood maps for drawing on the map (public/data/flood_maps/).

Sources are the OpenCity / Greater Chennai Corporation KML files kept outside this repo (surgegrid-ai-v2/data/external):
  - floods2015_inundation_zone_NRSC.kml  -> nrsc2015.json   (observed 2015 flood extent, NRSC satellite map)
  - return_period_{5,10,25,50,100}yr.kml -> hazard_{n}yr.json (GCC flood hazard map, class LOW / MODERATE / HIGH)

Polygons are merged per class, clipped to the Chennai area, simplified (about 30 m) and rounded to 5 decimals so the
files stay small. These are drawn as fixed backdrops. They are official maps, not what is flooded at a given hour.
Usage:  python scripts/build_flood_polygons.py [path-to-external-folder]
"""
import json
import os
import re
import sys

from shapely.geometry import Polygon, box, mapping
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = sys.argv[1] if len(sys.argv) > 1 else 'C:/projects/surgegrid-ai-v2/data/external'
OUT = os.path.join(ROOT, 'public', 'data', 'flood_maps')
CLIP = box(79.95, 12.6, 80.4, 13.6)   # the Chennai area the app covers
TOLERANCE = 0.0003                    # degrees, about 30 m
os.makedirs(OUT, exist_ok=True)


def read_polygons(name, attr=None):
    text = open(os.path.join(EXT, name), encoding='utf-8', errors='replace').read()
    out = []
    for pm in re.findall(r'<Placemark.*?</Placemark>', text, re.S):
        v = None
        if attr:
            m = re.search(r'name="%s">(.*?)<' % attr, pm)
            v = m.group(1) if m else None
        for ring in re.findall(r'<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pm, re.S):
            xy = [tuple(map(float, c.split(',')[:2])) for c in ring.split()]
            if len(xy) >= 4:
                p = Polygon(xy)
                out.append((p if p.is_valid else p.buffer(0), v))
    return out


def round_coords(obj):
    if isinstance(obj, (list, tuple)):
        return [round_coords(x) for x in obj]
    return round(obj, 5)


def write(name, groups, source):
    feats = []
    for cls, polys in groups.items():
        g = unary_union(polys).intersection(CLIP)
        if g.is_empty:
            continue
        g = g.simplify(TOLERANCE, preserve_topology=True)
        if g.is_empty:
            continue
        geom = mapping(g)
        geom['coordinates'] = round_coords(geom['coordinates'])
        feats.append({'type': 'Feature', 'properties': {'class': cls}, 'geometry': geom})
    path = os.path.join(OUT, name)
    json.dump({'type': 'FeatureCollection', 'source': source, 'features': feats}, open(path, 'w'), separators=(',', ':'))
    print(f'{name}: {len(feats)} feature(s), {os.path.getsize(path) // 1024} KB')


polys = read_polygons('floods2015_inundation_zone_NRSC.kml')
write('nrsc2015.json', {'FLOODED_2015': [p for p, _ in polys]}, 'NRSC 2015 flood extent (OpenCity, GCC)')

for yr in (5, 10, 25, 50, 100):
    rp = read_polygons(f'return_period_{yr}yr.kml', 'CATEGORY')
    groups = {}
    for p, cls in rp:
        groups.setdefault(cls or 'UNKNOWN', []).append(p)
    write(f'hazard_{yr}yr.json', groups, f'GCC flood hazard map, {yr}-year return period (OpenCity, GCC)')
