"""
Build public/data/official_flood_layers.json: for each substation, which official flood layers its mapped location falls in.

Layers come from OpenCity, Greater Chennai Corporation (GCC) profile. They are large KML files kept outside this repo
(in surgegrid-ai-v2/data/external). Pass the folder as the first argument if it is somewhere else.

For every substation (point) the script records:
  - nrsc2015:      inside the NRSC 2015 flood extent (true / false)
  - returnPeriod:  highest rating (LOW / MODERATE / HIGH) of the 5, 10, 25, 50 and 100-year flood maps it falls in, or null
  - inundationZone: worst class (Very Low .. Very High) of the GCC flood inundation zones it falls in, or null
  - stagnation2015Within500m: number of GCC 2015 water-stagnation points within 500 m
  - hotspots2020Within500m:   number of GCC northeast-monsoon 2020 flood hotspots within 500 m

These are point-in-polygon and distance checks against official maps. They are not predictions.
Usage:  python scripts/build_official_flood_layers.py [path-to-external-folder]
"""
import collections
import datetime
import json
import math
import os
import re
import sys

from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXT = sys.argv[1] if len(sys.argv) > 1 else 'C:/projects/surgegrid-ai-v2/data/external'
GRID = os.path.join(ROOT, 'public', 'data', 'chennai_tneb_grid.json')
OUT = os.path.join(ROOT, 'public', 'data', 'official_flood_layers.json')

grid = json.load(open(GRID, encoding='utf-8'))
subs = grid['substations']
pts = [Point(s['lng'], s['lat']) for s in subs]


def read(name):
    return open(os.path.join(EXT, name), encoding='utf-8', errors='replace').read()


def polygons(name, attr=None):
    text = read(name)
    polys, vals = [], []
    for pm in re.findall(r'<Placemark.*?</Placemark>', text, re.S):
        v = None
        if attr:
            m = re.search(r'name="%s">(.*?)<' % attr, pm)
            v = m.group(1) if m else None
        for ring in re.findall(r'<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pm, re.S):
            xy = [tuple(map(float, c.split(',')[:2])) for c in ring.split()]
            if len(xy) >= 4:
                p = Polygon(xy)
                polys.append(p if p.is_valid else p.buffer(0))
                vals.append(v)
    return polys, vals


def inside(name, attr=None):
    polys, vals = polygons(name, attr)
    tree = STRtree(polys)
    a, b = tree.query(pts, predicate='within')
    hit = collections.defaultdict(list)
    for i, j in zip(a, b):
        hit[int(i)].append(vals[int(j)])
    return len(polys), hit


def points(name):
    out = []
    for pm in re.findall(r'<Placemark.*?</Placemark>', read(name), re.S):
        m = re.search(r'<Point><coordinates>([-\d.]+),([-\d.]+)', pm)
        if m:
            out.append((float(m.group(1)), float(m.group(2))))
    return out


def km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p = math.radians
    a = math.sin(p(lat2 - lat1) / 2) ** 2 + math.cos(p(lat1)) * math.cos(p(lat2)) * math.sin(p(lng2 - lng1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def count_within(P, s, radius_km=0.5):
    n = 0
    for lo, la in P:
        if abs(s['lat'] - la) < 0.006 and abs(s['lng'] - lo) < 0.006 and km(s['lat'], s['lng'], la, lo) <= radius_km:
            n += 1
    return n


n_nrsc, nrsc = inside('floods2015_inundation_zone_NRSC.kml')
rp_rank = {'LOW': 1, 'MODERATE': 2, 'HIGH': 3}
rp_best = [0] * len(subs)
rp_counts = {}
for yr in (5, 10, 25, 50, 100):
    n, hit = inside('return_period_%dyr.kml' % yr, 'CATEGORY')
    rp_counts[yr] = n
    for i, v in hit.items():
        rp_best[i] = max(rp_best[i], max(rp_rank.get(x, 0) for x in v))
zone_rank = {'Very Low': 1, 'Low': 2, 'Moderate': 3, 'High': 4, 'Very High': 5}
zone_name = {v: k for k, v in zone_rank.items()}
n_zone, zone = inside('chennai_flood_inundation_zones_raw.kml', 'CATEGORY')
stagnation = points('floods2015_gcc_stagnation_locations.kml')
hotspots = points('floods2020_nivar_hotspots.kml')
rp_name = {1: 'LOW', 2: 'MODERATE', 3: 'HIGH'}

by_code = {}
for i, s in enumerate(subs):
    worst_zone = max((zone_rank.get(x, 0) for x in zone.get(i, [])), default=0)
    by_code[s['code']] = {
        'nrsc2015': i in nrsc,
        'returnPeriod': rp_name.get(rp_best[i]),
        'inundationZone': zone_name.get(worst_zone),
        'stagnation2015Within500m': count_within(stagnation, s),
        'hotspots2020Within500m': count_within(hotspots, s),
    }

out = {
    'generated': datetime.date.today().isoformat(),
    'source': 'OpenCity, Greater Chennai Corporation (GCC) profile',
    'method': 'Point-in-polygon and distance checks of each substation location against official layers. Not a prediction.',
    'layers': {
        'nrsc2015': 'NRSC flood extent 2015 (%d polygons)' % n_nrsc,
        'returnPeriod': 'Flood maps for 5, 10, 25, 50 and 100-year return periods (polygons: %s); highest rating shown' % rp_counts,
        'inundationZone': 'GCC flood inundation zones, Very Low to Very High (%d polygons); worst class shown' % n_zone,
        'stagnation2015': 'GCC 2015 water stagnation locations (%d points)' % len(stagnation),
        'hotspots2020': 'GCC flood hotspots, northeast monsoon 2020 (%d points)' % len(hotspots),
    },
    'substations': by_code,
}
json.dump(out, open(OUT, 'w', encoding='utf-8'), separators=(',', ':'))
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB for', len(by_code), 'substations')
print('inside NRSC 2015:', sum(1 for v in by_code.values() if v['nrsc2015']),
      '| in a return-period map:', sum(1 for v in by_code.values() if v['returnPeriod']),
      '| in an inundation zone:', sum(1 for v in by_code.values() if v['inundationZone']),
      '| near 2015 stagnation point:', sum(1 for v in by_code.values() if v['stagnation2015Within500m'] > 0),
      '| near 2020 hotspot:', sum(1 for v in by_code.values() if v['hotspots2020Within500m'] > 0))
