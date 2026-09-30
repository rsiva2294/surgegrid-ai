"""
Build public/data/scenarios/michaung2023_gauges.json: IMD rain-gauge readings for Chennai-area stations, with coordinates.

Inputs (not stored in the repo):
  - IMD final report on Cyclone Michaung ("26_0580dd_Michaung Report_Final_Sir.pdf"), section 8.1: the daily lists of
    24-hour rainfall (in cm, 24 hours to 08:30 IST) for 3, 4 and 5 December 2023. The lists only include stations with 7 cm
    or more, so a station missing from a day's list is "not listed" (under about 70 mm, or not reporting), not zero.
  - The Tamil Nadu rain-gauge station list ("rain guage statiosn.pdf", "Raingauge stations as on 2026-09-30"): station name,
    district, latitude and longitude. IMD's lists carry names only.

A station is matched only when its name is exactly the same in both (see PAIRS); names that appear twice in IMD's lists, or
that could be several stations, are left out. For each matched station the file also holds the satellite (IMERG) rain of
its 0.1 degree cell over the same 24 hours, taken from michaung2023_grid.json, so the two can be shown side by side.

Usage: python scripts/build_gauge_points.py [report.pdf] [stations.pdf]
"""
import collections
import json
import math
import os
import re
import statistics
import sys

import pypdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DL = os.path.join(os.path.expanduser('~'), 'Downloads')
REPORT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DL, '26_0580dd_Michaung Report_Final_Sir.pdf')
STATIONS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(DL, 'rain guage statiosn.pdf')
OUT = os.path.join(ROOT, 'public', 'data', 'scenarios', 'michaung2023_gauges.json')

WINDOWS = [
    # id, label, start UTC, end UTC (24 hours to 08:30 IST = 03:00 UTC)
    ('2023-12-03', '24 h to 08:30 IST, 3 Dec', '2023-12-02T03:00:00', '2023-12-03T03:00:00'),
    ('2023-12-04', '24 h to 08:30 IST, 4 Dec', '2023-12-03T03:00:00', '2023-12-04T03:00:00'),
    ('2023-12-05', '24 h to 08:30 IST, 5 Dec', '2023-12-04T03:00:00', '2023-12-05T03:00:00'),
]

# (district in the station list, station name in the station list, name in IMD's report)
PAIRS = [
    ('Chennai', 'Alandur', 'Alandur'),
    ('Chennai', 'Ayanavaram taluk office', 'Ayanavaram Taluk Office'),
    ('Chennai', 'Gov hr sec school MGR Nagar', 'MGR Nagar'),
    ('Chennai', 'DGP Office', 'DGP Office'),
    ('Chennai', 'Perambur Corporation park', 'Perambur'),
    ('Chennai', 'Chennai collectorate building', 'Chennai Collector Office'),
    ('Chennai', 'CD Hospital Tondiarpet', 'CD Hospital Tondiarpet'),
    ('Chennai', 'Ambattur', 'Ambattur'),
    ('Tiruvallur', 'Avadi', 'Avadi'),
    ('Tiruvallur', 'Poonamallee', 'Poonamallee'),
    ('Tiruvallur', 'Cholavaram', 'Cholavaram'),
    ('Tiruvallur', 'Redhills', 'Red Hills'),
    ('Tiruvallur', 'Ponneri', 'Ponneri'),
    ('Tiruvallur', 'Thamaraipakkam', 'Thamaraipakkam'),
    ('Tiruvallur', 'Gummidipoondi', 'Gummidipoondi'),
    ('Chengalpattu', 'Taluk Office, Tambaram', 'Tambaram'),
    ('Chengalpattu', 'Mammallapuram PWD bungalow', 'Mahabalipuram'),
    ('Kancheepuram', 'Sriperumbadur', 'Sriperumbudur'),
]


def squash_spaces(t):
    return re.sub(r'\s+', ' ', t)


# ---------------------------------------------------------------- IMD report lists
def report_text():
    r = pypdf.PdfReader(REPORT)
    pages = [(p.extract_text() or '') for p in r.pages]
    txt = '\n'.join(pages)
    txt = re.sub(r'\n\d+ \n', ' ', txt)   # printed page numbers between pages
    return squash_spaces(txt)


def between(txt, start, end):
    a = txt.index(start) + len(start)
    return txt[a:txt.index(end, a)]


def parse_list(block):
    """'A, B & C 22 each ; D 21 ; E & F 20 each & G 19 each' -> {name: [mm, ...]}.
    A group ends at a number that is followed by 'each', ';' or the end. Numbers inside names (Zone 14 Perungudi) are followed by a word."""
    out = collections.defaultdict(list)
    pos = 0
    for m in re.finditer(r'\b(\d{1,3})(?=\s*(?:each\b|;|$))', block):
        names_txt = block[pos:m.start()]
        pos = m.end()
        pos += len(re.match(r'\s*(?:each\b)?', block[pos:]).group(0))
        pos += len(re.match(r'[\s;&,]*', block[pos:]).group(0))
        for nm in re.split(r',|&', names_txt):
            nm = re.sub(r'[\s;.)]+$', '', nm.strip(' ;.('))
            if nm:
                out[nm].append(int(m.group(1)) * 10)   # cm -> mm
    return out


def read_lists():
    t = report_text()
    return {
        '2023-12-03': parse_list(between(t, '3rd Dec, 2023: Tamil Nadu & Puducherry:', 'Rayalaseema:')),
        '2023-12-04': parse_list(between(t, 'Tamilnadu, Puducherry & Karaikal:', '5th Dec, 2023:')),
        '2023-12-05': parse_list(between(t, '5th Dec, 2023: Tamil Nadu:', 'Coastal Andhra Pradesh:')),
    }


# ---------------------------------------------------------------- station list with coordinates
def read_stations():
    r = pypdf.PdfReader(STATIONS)
    t = '\n'.join((p.extract_text() or '') for p in r.pages)
    t = re.sub(r'==== PAGE \d+\n', '', t)
    pat = re.compile(r'(\d{4}-\s*\n?\s*\d{2}-\d{2})\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+([A-Za-z ]+?)\s+([\d\.]+)\s*\n')
    recs, pos = [], 0
    for m in pat.finditer(t):
        block = t[pos:m.start()].strip('\n')
        pos = m.end()
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        lines = [l for l in lines if not re.match(r'^(Raingauge stations|Sl\.No|on$|Status|of$|station|Rainfall|recorded|\(in mm\)|Name of the station|District/Taluk|Started|Latitude|Longitude)', l)]
        if len(lines) < 4:
            continue
        district = lines[-3]
        name = re.sub(r'^\d+\s+', '', ' '.join(lines[:-3]))
        recs.append({'name': name, 'district': district, 'lat': float(m.group(2)), 'lng': float(m.group(3))})
    return recs


def main():
    lists = read_lists()
    for k, v in lists.items():
        print(f'{k}: {len(v)} names parsed from the report list')
    recs = read_stations()
    print(f'{len(recs)} stations parsed from the station list')
    by = {(r['district'], r['name']): r for r in recs}
    # one station's name is broken by a page header in the parse; find it by its coordinates
    amb = next(r for r in recs if abs(r['lat'] - 13.1095) < 1e-4 and abs(r['lng'] - 80.1490) < 1e-4)
    by[('Chennai', 'Ambattur')] = dict(amb, name='Ambattur')

    grid = json.load(open(os.path.join(ROOT, 'public', 'data', 'scenarios', 'michaung2023_grid.json')))
    area = json.load(open(os.path.join(ROOT, 'public', 'data', 'scenarios', 'michaung2023.json')))
    utc = {t['timestep_hour']: t['utc'] for t in area['timesteps']}
    rev = {utc[h]: i for i, h in enumerate(grid['hours'])}
    d = grid['cellSizeDeg']

    def cell_of(lat, lng):
        lat0 = round(math.floor(lat / d + 1e-9) * d, 4)
        lng0 = round(math.floor(lng / d + 1e-9) * d, 4)
        for i, c in enumerate(grid['cells']):
            if c['lat0'] == lat0 and c['lng0'] == lng0:
                return i
        return -1

    stations = []
    for dist, sname, imd in PAIRS:
        st = by[(dist, sname)]
        ci = cell_of(st['lat'], st['lng'])
        rec = {'name': imd, 'district': dist, 'lat': st['lat'], 'lng': st['lng'], 'mm': {}, 'sat': {}}
        for wid, _, a, b in WINDOWS:
            vals = lists[wid].get(imd, [])
            if len(set(vals)) > 1:
                print(f'WARNING: {imd} has different values on {wid}: {vals}; left out for that day')
                vals = []
            rec['mm'][wid] = vals[0] if vals else None
            rec['sat'][wid] = round(sum(grid['rainMm'][ci][rev[a]:rev[b]])) if ci >= 0 else None
        stations.append(rec)

    out = {
        'source': 'IMD final report on Cyclone Michaung (Dec 2023), section 8.1, 24-hour rainfall to 08:30 IST; coordinates from the Tamil Nadu rain-gauge station list (as on 2026-09-30).',
        'note': 'A station missing for a day is not in IMD\'s list of stations with 7 cm or more (under about 70 mm, or not reporting). sat = IMERG rain of the station\'s 0.1 degree cell over the same 24 hours.',
        'windows': [{'id': w[0], 'label': w[1], 'endUtc': w[3] + 'Z'} for w in WINDOWS],
        'stations': stations,
    }
    json.dump(out, open(OUT, 'w'), separators=(',', ':'))
    print(f'wrote {OUT} ({os.path.getsize(OUT)} bytes), {len(stations)} stations')

    print(f"\n{'station':26} {'cell?':6}" + ''.join(f'{w[0]:>22}' for w in WINDOWS))
    for s in stations:
        print(f"{s['name']:26} {('yes' if s['sat'][WINDOWS[0][0]] is not None else 'no'):6}" + ''.join(f"{str(s['mm'][w[0]]):>10} /{str(s['sat'][w[0]]):>9}" for w in WINDOWS))
    print('(IMD gauge mm / satellite-cell mm; None = not listed)')
    for wid, label, _, _ in WINDOWS:
        pr = [(s['mm'][wid], s['sat'][wid]) for s in stations if s['mm'][wid] is not None and s['sat'][wid] is not None]
        if pr:
            ratios = [sat / g for g, sat in pr]
            print(f"{label}: {len(pr)} stations | gauge median {statistics.median(g for g, _ in pr)} mm, satellite median {statistics.median(x for _, x in pr)} mm | ratio median {statistics.median(ratios):.2f} (min {min(ratios):.2f}, max {max(ratios):.2f})")


if __name__ == '__main__':
    main()
