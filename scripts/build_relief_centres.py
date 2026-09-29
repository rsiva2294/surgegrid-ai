"""
Build public/data/relief_centres.json.

1. Relief centres: the GCC list (data-archive/data/gcc_relief_centers.json) has zone, ward, address, officer and contact,
   but NO map coordinates. So centres are grouped by ward, and each ward is placed at a point inside its official GCC ward
   polygon (data-archive/data/gcc_wards_polygons.json). Exact centre sites are not known and are not guessed.
2. Backup suggestions: for every substation, the nearest other distribution-tier substation that has none of the flood flags
   used on the substation card (yard at or below 2.0 m, inside the NRSC 2015 flood extent, or rated Moderate/High on the
   official flood-hazard maps). Straight-line distance. This is our own calculation from facts; whether load can actually be
   transferred is not checked.

Run scripts/build_official_flood_layers.py first (this script reads its output).
Usage:  python scripts/build_relief_centres.py
"""
import datetime
import json
import math
import os

from shapely.geometry import shape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(ROOT, 'data-archive', 'data')
PUBLIC = os.path.join(ROOT, 'public', 'data')
AVERAGE_ELEVATION_M = 2.0  # GCC City DMP 2023, Preface

centres = json.load(open(os.path.join(ARCHIVE, 'gcc_relief_centers.json'), encoding='utf-8'))
wards_geo = json.load(open(os.path.join(ARCHIVE, 'gcc_wards_polygons.json'), encoding='utf-8'))['features']
grid = json.load(open(os.path.join(PUBLIC, 'chennai_tneb_grid.json'), encoding='utf-8'))['substations']
flood = json.load(open(os.path.join(PUBLIC, 'official_flood_layers.json'), encoding='utf-8'))['substations']

# ---- wards: a point inside each official ward polygon ----
ward_point = {}
for f in wards_geo:
    try:
        w = str(int(f['properties']['ward']))
        p = shape(f['geometry']).representative_point()
        ward_point[w] = (round(p.y, 5), round(p.x, 5), str(f['properties'].get('zone', '')))
    except Exception:
        continue

wards = {}
for r in centres:
    try:
        w = str(int(r['ward']))
    except Exception:
        continue
    entry = wards.setdefault(w, {'zone': str(r.get('zone', '')), 'lat': None, 'lng': None, 'centres': []})
    if w in ward_point:
        entry['lat'], entry['lng'] = ward_point[w][0], ward_point[w][1]
    entry['centres'].append({
        'address': (r.get('address') or '').strip(),
        'officer': (r.get('officer') or '').strip(),
        'contact': (r.get('contact') or '').strip(),
    })


# ---- backup substations ----
def km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p = math.radians
    a = math.sin(p(lat2 - lat1) / 2) ** 2 + math.cos(p(lat1)) * math.cos(p(lat2)) * math.sin(p(lng2 - lng1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def flagged(s):
    f = flood.get(s['code'], {})
    low = s.get('elevationM') is not None and s['elevationM'] <= AVERAGE_ELEVATION_M
    return bool(low or f.get('nrsc2015') or f.get('returnPeriod') in ('MODERATE', 'HIGH'))


pool = [s for s in grid if s.get('tier') == 'distribution' and s.get('elevationM') is not None and not flagged(s)]
backups = {}
for s in grid:
    if not flagged(s):
        continue
    best = None
    for c in pool:
        if c['code'] == s['code']:
            continue
        d = km(s['lat'], s['lng'], c['lat'], c['lng'])
        if best is None or d < best[0]:
            best = (d, c)
    if best:
        backups[s['code']] = {
            'code': best[1]['code'],
            'name': best[1].get('cleanName') or best[1]['name'],
            'km': round(best[0], 1),
        }

out = {
    'generated': datetime.date.today().isoformat(),
    'source': 'GCC relief centre list (zone, ward, address, officer, contact); GCC ward polygons for ward positions',
    'method': ('Relief centres are grouped by ward. The GCC list has no coordinates, so each ward is shown at a point inside its '
               'official ward polygon, not at the centre itself. Backups: nearest other distribution-tier substation with none of the '
               'flood flags (yard at or below 2.0 m, inside the NRSC 2015 flood extent, Moderate/High flood-hazard rating). '
               'Straight-line distance; load transfer not checked.'),
    'wards': wards,
    'backups': backups,
}
json.dump(out, open(os.path.join(PUBLIC, 'relief_centres.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('wards with relief centres:', len(wards), '| centres:', sum(len(w['centres']) for w in wards.values()),
      '| wards placed on map:', sum(1 for w in wards.values() if w['lat'] is not None),
      '| flagged substations with a backup:', len(backups), 'of', sum(1 for s in grid if flagged(s)))
