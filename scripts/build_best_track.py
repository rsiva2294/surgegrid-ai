"""
Build public/data/scenarios/michaung2023_track.json: the observed best track of Cyclone Michaung, every row of Table 1 of the
IMD final report ("Severe Cyclonic Storm MICHAUNG over the Bay of Bengal during 1st-6th December 2023"), 3-hourly and a few 6-hourly.

Each row: time (UTC), centre latitude and longitude, estimated central pressure (hPa), estimated maximum sustained wind (kt) and
grade (D, DD, CS, SCS). The row text is kept as printed so scripts/verify_imd_quotes.py-style checks can find it.
The script checks itself: 34 rows, times increasing, and the five rows the app already shows for its steps (src/data/imdBulletins.ts)
are equal to the rows read here. Landfall (0700-0900 UTC on 5 December near 15.7 N 80.3 E) is IMD's own sentence in the same table.

Usage: python scripts/build_best_track.py [path-to-IMD-final-report.pdf]
"""
import io
import json
import os
import re
import sys

import pypdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', '26_0580dd_Michaung Report_Final_Sir.pdf')
OUT = os.path.join(ROOT, 'public', 'data', 'scenarios', 'michaung2023_track.json')

ROW = re.compile(r'^(\d{4}) (\d{1,2}\.\d) (\d{2,3}\.\d) (\d\.\d|-) (\d{3,4}) (\d{2}) (\d{1,2}|-) (D|DD|CS|SCS)$')
DATE = re.compile(r'^(\d{2})\.12\.23$')

# the five rows src/data/imdBulletins.ts already quotes for the app's steps
KNOWN = [
    '1800 11.1 82.7 2.0 996 30 6 DD',
    '1500 12.4 81.9 2.5 994 40 8 CS',
    '2100 13.0 81.4 3.0 992 45 10 CS',
    '0900 13.7 80.7 3.0 988 50 14 SCS',
    '0900 15.8 80.3 - 990 50 12 SCS',
]


def main():
    reader = pypdf.PdfReader(PDF)
    text = '\n'.join((reader.pages[i].extract_text() or '') for i in range(3, 6))
    rows, day = [], None
    for line in text.splitlines():
        s = ' '.join(line.split())
        m = DATE.match(s)
        if m:
            day = int(m.group(1))
            continue
        m = ROW.match(s)
        if m and day:
            hhmm, lat, lng, ci, pres, wind, drop, grade = m.groups()
            rows.append({
                'utc': f'2023-12-{day:02d}T{hhmm[:2]}:{hhmm[2:]}:00Z',
                'lat': float(lat), 'lng': float(lng), 'grade': grade,
                'windKt': int(wind), 'pressureHpa': int(pres), 'row': s,
            })
    stamps = [r['utc'] for r in rows]
    problems = []
    if len(rows) != 34:
        problems.append(f'expected 34 rows, read {len(rows)}')
    if stamps != sorted(stamps) or len(set(stamps)) != len(stamps):
        problems.append('times are not strictly increasing')
    have = {r['row'] for r in rows}
    for k in KNOWN:
        if k not in have:
            problems.append(f'known row not found: {k}')
    print(f'{len(rows)} rows from {stamps[0]} to {stamps[-1]}')
    if problems:
        print('PROBLEMS:', *problems, sep='\n  ')
        sys.exit(1)
    out = {
        'source': 'India Meteorological Department, final report on Severe Cyclonic Storm MICHAUNG, Table 1 (best track positions and other parameters)',
        'landfall': {
            'text': 'Crossed South Andhra Pradesh coast close to south of Bapatla during 0700-0900 UTC (1230-1430 IST) of 05th December near Lat 15.7 deg. N and Lon 80.3 deg. E as a severe Cyclonic Storm with the maximum sustained wind speed of 50 knots (90-100 kmph gusting to 110 kmph)',
            'lat': 15.7, 'lng': 80.3, 'utcFrom': '2023-12-05T07:00:00Z', 'utcTo': '2023-12-05T09:00:00Z',
        },
        'points': rows,
    }
    with io.open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, separators=(',', ':'), ensure_ascii=False)
    print(f'wrote {OUT} ({os.path.getsize(OUT)} bytes)')


if __name__ == '__main__':
    main()
