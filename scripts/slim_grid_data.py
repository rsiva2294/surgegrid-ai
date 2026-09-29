"""
Slim public/data/chennai_tneb_grid.json for fast loading (run after the full grid file is (re)generated).

The full file was 4.07 MB parsed. This script:
  - moves each section office's `boundary` polygon into public/data/section_boundaries.json (loaded only when a section is selected),
  - drops substation `hydroRisk` and `anticipatorySop` (a model that did not validate; nothing on screen shows them),
  - drops substation `outageHistory` when it is identical to `healthProfile.events` (it was a duplicate for all 286 substations).

Safe to run twice: a file that is already slim is left unchanged.
Usage:  python scripts/slim_grid_data.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRID = os.path.join(ROOT, 'public', 'data', 'chennai_tneb_grid.json')
BOUNDS = os.path.join(ROOT, 'public', 'data', 'section_boundaries.json')

grid = json.load(open(GRID, encoding='utf-8'))
before = os.path.getsize(GRID)

boundaries = {}
for sec in grid['sections']:
    b = sec.pop('boundary', None)
    if b:
        boundaries[sec['code']] = b

dropped_dup = 0
for s in grid['substations']:
    s.pop('hydroRisk', None)
    s.pop('anticipatorySop', None)
    oh = s.get('outageHistory')
    ev = (s.get('healthProfile') or {}).get('events')
    if oh is not None and ev is not None and json.dumps(oh, sort_keys=True) == json.dumps(ev, sort_keys=True):
        s.pop('outageHistory')
        dropped_dup += 1

if boundaries:
    json.dump(boundaries, open(BOUNDS, 'w', encoding='utf-8'), separators=(',', ':'))
elif not os.path.exists(BOUNDS):
    raise SystemExit('No boundaries found and no section_boundaries.json exists: refusing to write a grid without boundaries.')

json.dump(grid, open(GRID, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('grid: %d KB -> %d KB | boundaries file: %d KB (%d sections) | duplicate outageHistory dropped: %d' % (
    before // 1024, os.path.getsize(GRID) // 1024, os.path.getsize(BOUNDS) // 1024, len(boundaries), dropped_dup))
