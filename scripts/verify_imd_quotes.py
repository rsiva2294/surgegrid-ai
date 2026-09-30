"""
Check that every quote in src/data/imdBulletins.ts appears in the IMD press-release PDFs.

The PDFs are not stored in the repo. Download them first (for example with curl) into one folder:
  https://internal.imd.gov.in/press_release/20231203_pr_2669.pdf   (and 20231204_pr_2671, 20231205_pr_2674, 20231206_pr_2677)
The PDF text has broken spacing ("east -northeast", "0 830"), so the comparison ignores all whitespace.
Usage:  python scripts/verify_imd_quotes.py <folder-with-the-pdfs>
"""
import os
import re
import sys

import pypdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
folder = sys.argv[1] if len(sys.argv) > 1 else '.'
src = open(os.path.join(ROOT, 'src', 'data', 'imdBulletins.ts'), encoding='utf-8').read()

files = {
    m.group(1): m.group(2)
    for m in re.finditer(r"(\w+): \{ id: '\w+', label: '[^']*', issuedIst: '[^']*', file: '([^']+)'", src)
}


def squash(t):
    t = t.replace('\uf0b7', '-').replace('\ufffd', '-').replace('\u2013', '-').replace('\u2019', "'")
    return re.sub(r'\s+', '', t)


texts = {}
for bid, fn in files.items():
    r = pypdf.PdfReader(os.path.join(folder, fn))
    texts[bid] = squash('\n'.join((p.extract_text() or '') for p in r.pages))

ok = bad = 0
for m in re.finditer(r"bulletin: (\w),\s*kind: '([^']+)',\s*text: '((?:[^'\\]|\\.)*)'", src):
    letter, kind, text = m.group(1), m.group(2), m.group(3).replace("\\'", "'")
    bid = {'A': 'b3dec', 'B': 'b4dec', 'C': 'b5dec', 'D': 'b6dec'}[letter]
    found = squash(text) in texts[bid]
    ok += found
    bad += not found
    print(('OK   ' if found else 'MISS ') + f'{bid} [{kind}] {text[:70]}...')
print(f'{ok} found, {bad} missing')
sys.exit(1 if bad else 0)
