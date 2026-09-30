"""
Build public/data/gcc_plan_2024.json from the Greater Chennai Corporation "City Disaster Management Perspective Plan 2024".

The plan (806 pages, not stored in the repo) holds, by ward:
  - Inundation registers, "Depth of Inundation During Monsoon - <year>": named streets with a depth class
    (very high above 5 ft, high 3 to 5 ft, medium 2 to 3 ft, low under 2 ft), for 2015, 2017, 2018, 2019, 2020, 2021 and 2022.
    (The 2022 register is headed "2021" in the plan; its 37 rows match the 2022 summary table, so it is used as 2022.)
  - A 2023 north-east monsoon list of inundated locations (names, zone, ward; no depth classes).
  - Relief centres per zone: ward, capacity, name and address, streets to be shifted, drinking water, toilets, cooking.
Everything is street names and ward numbers, no coordinates, so it is aggregated per ward.

The script checks itself: each register's row count and class split must equal the plan's own printed total, and each zone's
relief-centre table is compared with the zone's own statement ("There are N relief centres to a total capacity of C"). The plan's
statements and tables disagree in most zones and the tables come in several layouts, so capacity and facilities are shipped only for
zones where the parsed table equals the statement; every difference is recorded in the output.
It exits with an error when a register differs from its printed total.

Usage: python scripts/build_gcc_plan_2024.py [path-to-plan.pdf]
"""
import collections
import json
import os
import re
import sys

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'chennai Gcc ddmp 2024.pdf')
OUT = os.path.join(ROOT, 'public', 'data', 'gcc_plan_2024.json')

ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15}
CLASSES = ('veryHigh', 'high', 'medium', 'low')   # above 5 ft, 3-5 ft, 2-3 ft, under 2 ft

# year -> (first PDF page, last PDF page, printed total: (veryHigh, high, medium, low))
REGISTERS = {
    '2015': (62, 74, (37, 84, 1, 184)),
    '2017': (76, 82, (0, 0, 23, 182)),
    '2018': (84, 85, (0, 0, 1, 52)),
    '2019': (87, 87, (0, 0, 0, 19)),
    '2020': (89, 90, (0, 0, 0, 23)),
    '2021': (92, 106, (0, 18, 61, 482)),
    '2022': (108, 109, (0, 1, 8, 28)),
}
LIST_2023_PAGE = 110
# first PDF page of each zone's relief-centre section, zones 1..15 (the page holding "There are N relief centres ...")
RELIEF_START = [209, 247, 282, 330, 379, 416, 456, 495, 537, 578, 626, 658, 699, 736, 773]
RELIEF_SPAN = 7


def clean(s):
    s = re.sub(r'\s+', ' ', (s or '').replace('\n', ' ')).strip()
    s = re.sub(r'(?<=[a-z])-\s+(?=[a-z])', '', s)     # "Kathivak- kam" -> "Kathivakkam"
    for bad, good in (('昀氀', 'fl'), ('昀昀', 'ff'), ('昀椀', 'fi'), ('昀케', 'ffi')):
        s = s.replace(bad, good)
    s = s.replace('昀', 'f')
    return re.sub(r'[⺀-鿿가-힯]', '', s)      # drop any other stray CJK glyph from the broken font map


def wards_of(cell):
    return [int(x) for x in re.findall(r'\d+', cell or '')]


def zone_of(cell):
    cell = (cell or '').strip()
    if cell.isdigit():
        return int(cell)
    return ROMAN.get(cell.upper())


def read_registers(pdf):
    out = {}
    for year, (a, b, printed) in REGISTERS.items():
        rows = []
        for p in range(a, b + 1):
            for tb in pdf.pages[p - 1].extract_tables():
                for r in tb:
                    r = [(c or '').replace('\n', ' ').strip() for c in r]
                    if len(r) < 8 or not re.fullmatch(r'\d{1,4}', r[0]) or zone_of(r[1]) is None:
                        continue
                    flags = [bool(re.search(r'ye', c, re.I)) for c in r[4:8]]
                    cls = next((n for n, f in zip(CLASSES, flags) if f), None)
                    rows.append({'sl': int(r[0]), 'zone': zone_of(r[1]), 'wards': wards_of(r[2]), 'name': clean(r[3]), 'cls': cls, 'page': p})
        got = tuple(sum(1 for r in rows if r['cls'] == c) for c in CLASSES)
        ok = got == printed and len(rows) == sum(printed)
        print(f"register {year}: {len(rows)} rows, classes {got}, printed total {sum(printed)} {printed} -> {'OK' if ok else 'MISMATCH'}")
        if not ok:
            missing = sorted(set(range(1, sum(printed) + 1)) - {r['sl'] for r in rows})
            print('   serials not parsed:', missing[:20])
            sys.exit(1)
        out[year] = rows
    return out


def read_2023(pdf):
    rows = []
    for tb in pdf.pages[LIST_2023_PAGE - 1].extract_tables():
        for r in tb:
            r = [(c or '').replace('\n', ' ').strip() for c in r]
            if len(r) >= 4 and re.fullmatch(r'\d{1,3}', r[0]) and zone_of(r[1]) is not None and re.fullmatch(r'\d{1,3}', r[2]):
                rows.append({'zone': zone_of(r[1]), 'ward': int(r[2]), 'name': clean(r[3])})
    print(f'2023 north-east monsoon list: {len(rows)} locations')
    if len(rows) != 35:
        print('   expected 35 (Sl.No 1-35 on the page)')
        sys.exit(1)
    return rows


def read_relief(pdf):
    """Relief-centre table rows per zone (the table is the data; the zone's own statement is only compared, and differences recorded)."""
    centres, checks = [], []
    for z, start in enumerate(RELIEF_START, start=1):
        end = RELIEF_START[z] if z < len(RELIEF_START) else start + 40
        text = ' '.join((pdf.pages[start - 1].extract_text() or '').split())
        m = re.search(r'There (?:are|is) (\d+) relief centres? (?:to )?(?:a )?total capacity of (\d[\d,]*)', text, re.I)
        stated = (int(m.group(1)), int(m.group(2).replace(',', ''))) if m else None
        rows, found_any = [], False
        for p in range(start, end):
            page_rows = 0
            for tb in pdf.pages[p - 1].extract_tables():
                if not tb or len(tb[0]) < 9 or not re.search(r'yticapac|capacity', re.sub(r'[^a-z]', '', ' '.join((c or '') for c in tb[0]).lower())):
                    continue
                for r in tb:
                    r = [(c or '').replace('\n', ' ').strip() for c in r]
                    if len(r) >= 8 and re.fullmatch(r'\d{1,3}', r[0]) and wards_of(r[1]) and re.fullmatch(r'\d{0,5}', r[2]):
                        yn = lambda c: True if re.match(r'yes', c, re.I) else (False if re.match(r'no', c, re.I) else None)
                        rows.append({'zone': z, 'wards': wards_of(r[1]), 'capacity': int(r[2]) if r[2] else None, 'name': clean(r[3]), 'streets': clean(r[4]),
                                     'water': yn(r[5]), 'toilets': yn(r[6]), 'cooking': yn(r[7])})
                        page_rows += 1
            if page_rows:
                found_any = True
            elif found_any:
                break   # the relief-centre tables are contiguous; a page without one ends the section
        got = (len(rows), sum(r['capacity'] or 0 for r in rows))
        same = stated == got
        blanks = sum(1 for r in rows if r['capacity'] is None)
        print(f"zone {z:2}: table {got[0]} centres, capacity {got[1]}{f' ({blanks} blank)' if blanks else ''}; zone statement {stated} -> {'same' if same else 'DIFFERENT (recorded)'}")
        if not same:
            checks.append({'zone': z, 'tableCentres': got[0], 'tableCapacity': got[1], 'blankCapacities': blanks,
                           'statedCentres': stated[0] if stated else None, 'statedCapacity': stated[1] if stated else None})
        if same:
            centres += rows      # shipped: the parsed table equals the plan's own statement for this zone
    return centres, checks


def main():
    with pdfplumber.open(PDF) as pdf:
        regs = read_registers(pdf)
        l2023 = read_2023(pdf)
        relief, relief_checks = read_relief(pdf)

    wards = collections.defaultdict(lambda: {'inundation': {}, 'in2023': [], 'relief': []})
    for year, rows in regs.items():
        for r in rows:
            for w in r['wards']:
                y = wards[w]['inundation'].setdefault(year, {'n': 0, 'veryHigh': 0, 'high': 0, 'medium': 0, 'low': 0, 'deep': []})
                y['n'] += 1
                if r['cls']:
                    y[r['cls']] += 1
                if r['cls'] in ('veryHigh', 'high') and len(y['deep']) < 4:
                    y['deep'].append(r['name'])
    for r in l2023:
        wards[r['ward']]['in2023'].append(r['name'])
    for r in relief:                      # verified zones only
        for w in r['wards']:
            wards[w]['relief'].append({k: r[k] for k in ('name', 'capacity', 'streets', 'water', 'toilets', 'cooking')})

    out = {
        'source': 'Greater Chennai Corporation, City Disaster Management Perspective Plan 2024 (806 pages)',
        'note': 'Street names with ward numbers, not coordinates, so everything is per ward. A location listed under several wards counts once in each. Depth classes: veryHigh above 5 ft, high 3 to 5 ft, medium 2 to 3 ft, low under 2 ft.',
        'registers': {y: {'pages': f'{a}-{b}', 'locations': sum(t)} for y, (a, b, t) in REGISTERS.items()},
        'list2023': {'page': LIST_2023_PAGE, 'locations': len(l2023), 'label': '2023 north-east monsoon (no depth classes)'},
        'reliefNote': "Capacity and facilities are shipped only for zones where the parsed relief-centre table equals the zone's own statement of centres and capacity; the plan's tables and statements disagree in the other zones and its tables come in several layouts.",
        'reliefTotals': {'centres': len(relief), 'capacity': sum(r['capacity'] or 0 for r in relief), 'withoutCapacity': sum(1 for r in relief if r['capacity'] is None)},
        'reliefZoneDiscrepancies': relief_checks,
        'wards': {str(w): v for w, v in sorted(wards.items())},
    }
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, separators=(',', ':'), ensure_ascii=False)
    print(f"wrote {OUT} ({os.path.getsize(OUT) // 1024} KB): {len(wards)} wards; relief centres {len(relief)}, capacity {out['reliefTotals']['capacity']}; {len(relief_checks)} zones where the table and the plan's own statement differ")


if __name__ == '__main__':
    main()
