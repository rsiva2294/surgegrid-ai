"""
Check that every GCC quote in src/data/officialSources.ts also appears, word for word, in the GCC City Disaster Management
Perspective Plan 2024 (the 2023 edition is the one the quotes were first taken from), and print the 2024 PDF pages.

The 2024 PDF (not stored in the repo) has a broken font map: "fl", "ff", "fi" and "ffi" come out as CJK characters, so they are
repaired before comparing. The comparison ignores case, spacing and punctuation.

Usage: python scripts/verify_gcc_quotes_2024.py [path-to-plan-2024.pdf]
"""
import io
import os
import re
import sys

import pypdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'chennai Gcc ddmp 2024.pdf')

GLYPHS = (('昀氀', 'fl'), ('昀昀', 'ff'), ('昀椀', 'fi'), ('昀케', 'ffi'), ('昀', 'f'))


def squash(s):
    for bad, good in GLYPHS:
        s = s.replace(bad, good)
    return re.sub(r'[^a-z0-9]', '', s.lower())


def gcc_quotes():
    cur, out = {}, []
    for line in io.open(os.path.join(ROOT, 'src', 'data', 'officialSources.ts'), encoding='utf-8'):
        s = line.strip()
        m = re.match(r"id: '([^']+)',", s)
        if m:
            cur = {'id': m.group(1)}
        m = re.match(r"quote: (['\"])(.*)\1,\s*$", s)
        if m and cur:
            cur['quote'] = m.group(2).replace("\\'", "'")
        m = re.match(r"sourceId: '([^']+)'", s)
        if m and 'id' in cur:
            cur['src'] = m.group(1)
        m = re.match(r'pdfPage: (\d+)', s)
        if m and 'id' in cur and 'quote' in cur:
            cur['pp'] = int(m.group(1))
            out.append(dict(cur))
            cur = {}
    return [e for e in out if e.get('src', '').startswith('GCC')]


def main():
    quotes = gcc_quotes()
    reader = pypdf.PdfReader(PDF)
    pages = {}
    for i, page in enumerate(reader.pages, start=1):
        try:
            pages[i] = squash(page.extract_text() or '')
        except Exception:
            pages[i] = ''
    missing = 0
    print(f'{len(quotes)} GCC quotes in the bank; 2024 plan has {len(pages)} pages')
    for e in quotes:
        hit = [p for p, x in pages.items() if squash(e['quote']) in x]
        missing += not hit
        print(f"{'FOUND  ' if hit else 'MISSING'} {e['id']:36} 2023 PDF p.{e['pp']:<4} -> 2024 PDF pages {hit[:4]}")
    sys.exit(1 if missing else 0)


if __name__ == '__main__':
    main()
