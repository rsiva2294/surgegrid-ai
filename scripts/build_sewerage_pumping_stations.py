"""
Build public/data/sewerage_pumping_stations.json.

Source: TNGIS layer "CMWSSB Sewerage Pumping Stations" (Tamil Nadu Geographic Information System), 124 polygons with the
station name and road. Each station is placed at the centre of its polygon. For every substation we add the nearest station
(straight-line distance). These are SEWERAGE stations (sewage, not storm water) and they run on grid power; the MoP 2021 plan
asks for drainage pumping stations to be restored on a priority basis (see docs/SOURCES.md).

Needs: pip install pyshp shapely
Usage:  python scripts/build_sewerage_pumping_stations.py <path to CMWSSB_Sewerage_Pumping_Stations.zip>
"""
import datetime
import io
import json
import math
import os
import sys
import tempfile
import zipfile

import shapefile
from shapely.geometry import shape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public', 'data')

if len(sys.argv) < 2:
    sys.exit(__doc__)

zf = zipfile.ZipFile(sys.argv[1])
names = {n.rsplit('.', 1)[1].lower(): n for n in zf.namelist() if '.' in n}
tmp = tempfile.mkdtemp()
for ext in ('shp', 'shx', 'dbf'):
    zf.extract(names[ext], tmp)
reader = shapefile.Reader(os.path.join(tmp, names['shp'][:-4]))
fields = [f[0] for f in reader.fields[1:]]
assert {'name_of_th', 'road_name'} <= set(fields), fields

stations = []
for sr in reader.iterShapeRecords():
    rec = dict(zip(fields, sr.record))
    pt = shape(sr.shape.__geo_interface__).representative_point()
    name = ' '.join(str(rec['name_of_th']).split())
    road = ' '.join(str(rec['road_name']).split())
    stations.append({'name': name, 'road': road, 'lat': round(pt.y, 5), 'lng': round(pt.x, 5)})
stations.sort(key=lambda s: (s['name'], s['road']))


def km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p = math.radians
    a = math.sin(p(lat2 - lat1) / 2) ** 2 + math.cos(p(lat1)) * math.cos(p(lat2)) * math.sin(p(lng2 - lng1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


grid = json.load(open(os.path.join(PUBLIC, 'chennai_tneb_grid.json'), encoding='utf-8'))['substations']
nearest = {}
for s in grid:
    if s.get('lat') is None or s.get('lng') is None:
        continue
    best = min(range(len(stations)), key=lambda i: km(s['lat'], s['lng'], stations[i]['lat'], stations[i]['lng']))
    d = km(s['lat'], s['lng'], stations[best]['lat'], stations[best]['lng'])
    within = sum(1 for st in stations if km(s['lat'], s['lng'], st['lat'], st['lng']) <= 1.0)
    nearest[s['code']] = {'i': best, 'km': round(d, 2), 'within1km': within}

out = {
    'generated': datetime.date.today().isoformat(),
    'source': 'TNGIS, CMWSSB Sewerage Pumping Stations layer',
    'method': ('Station position is the centre of its TNGIS polygon. Nearest station per substation: straight-line distance; '
               'whether a station is fed by that substation is not known.'),
    'stations': stations,
    'nearest': nearest,
}
path = os.path.join(PUBLIC, 'sewerage_pumping_stations.json')
with open(path, 'w', encoding='utf-8') as f:
    json.dump(out, f, separators=(',', ':'), ensure_ascii=False)
print('wrote', path, os.path.getsize(path), 'bytes |', len(stations), 'stations |', len(nearest), 'substations with nearest')
