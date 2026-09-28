"""
Instagram Scraper for TNPDCL Outage Notices and Abstract Reports.
Extracts posts from https://www.instagram.com/tnpdcl_offcl/ via GraphQL
from present (Sep 28, 2026) back to July 01, 2026.
Every image is saved with an Indian Standard Time (IST) date prefix:
  YYYY-MM-DD_HH-MM-SS_<post_id>.jpg
  YYYY-MM-DD_HH-MM-SS_<post_id>_slide<n>.jpg (for carousels)
"""

import os
import sys
import json
import time
import random
import re
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote

sys.stdout.reconfigure(encoding='utf-8')

# Output directories
SINGLE_DIR = Path('c:/projects/surgegrid-ai/data/tneb_abstract_reports')
CAROUSEL_DIR = Path('c:/projects/surgegrid-ai/data/tneb_carousel_abstracts')

SINGLE_DIR.mkdir(parents=True, exist_ok=True)
CAROUSEL_DIR.mkdir(parents=True, exist_ok=True)

# Target date: Stop when we reach posts before July 01, 2026 (IST)
IST = timezone(timedelta(hours=5, minutes=30))
CUTOFF_DT = datetime(2026, 7, 1, 0, 0, 0, tzinfo=IST)
CUTOFF_TS = int(CUTOFF_DT.timestamp())

# Cookies & headers extracted from authenticated session
COOKIES = {
    'ds_user_id': '78440927411',
    'ig_did': 'C8FF8B08-1A06-4FE5-800F-B47BF74BAB1A',
    'csrftoken': 'WuxfFDZMntI88qGzBhYXQw',
    'mid': 'ahDJlgALAAEY3pnSs4yJZ1UDAu4N',
    'ps_l': '1',
    'ps_n': '1',
    'datr': 'rvRXamrJ4njUXUNC0bX-_JE6',
    'dpr': '1.5625',
    'sessionid': '78440927411:6y5UYnoWLvPZ1e:2:AYnGjcI4s0gmDHuoSOdaOht4CYZkq9MxEhqoQxHJo1Q',
    'wd': '1065x1004',
    'rur': 'VCN,17841478462355115,1791800635:01ff470cddf4571c6e977d5dd70f46830210775316429d8c1631499489f874d3bb066f03',
}

HEADERS = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.6',
    'content-type': 'application/x-www-form-urlencoded',
    'origin': 'https://www.instagram.com',
    'referer': 'https://www.instagram.com/tnpdcl_offcl/',
    'sec-ch-ua': '"Chromium";v="154", "Brave";v="154", "Not A(Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
    'x-asbd-id': '359341',
    'x-bloks-version-id': '62077fc559de123afe03ebeb18194a88ba5d4e6874d9a07873752f3792adb8a0',
    'x-csrftoken': 'WuxfFDZMntI88qGzBhYXQw',
    'x-fb-friendly-name': 'PolarisProfilePostsTabContentQuery_connection',
    'x-fb-lsd': 'sNEKb-Qt0S2LqeGz7WSL9h',
    'x-ig-app-id': '936619743392459',
    'x-root-field-name': 'xdt_api__v1__feed__user_timeline_graphql_connection',
}

def load_base_payload():
    with open('c:/projects/surgegrid-ai/scratch_raw_data.txt', 'r', encoding='utf-8') as f:
        raw = f.read().strip()
    raw = raw.replace('  --data-raw ', '')
    if raw.startswith('^"') and raw.endswith('^"'):
        raw = raw[2:-2]
    elif raw.startswith('"') and raw.endswith('"'):
        raw = raw[1:-1]
    raw = raw.replace('^&', '&').replace('^%^', '%').replace('^', '')
    return raw

def fetch_page(base_payload, cursor=None):
    if cursor is None:
        payload = re.sub(r'%22after%22%3A(?:%22.*?%22|null)(?=%2C%22before)', '%22after%22%3Anull', base_payload)
    else:
        # Surgically substitute the after parameter (URL-encode cursor if needed)
        encoded_cursor = quote(cursor) if not cursor.startswith('%') else cursor
        payload = re.sub(r'%22after%22%3A(?:%22.*?%22|null)(?=%2C%22before)', f'%22after%22%3A%22{encoded_cursor}%22', base_payload)
    
    resp = requests.post(
        'https://www.instagram.com/graphql/query',
        headers=HEADERS,
        cookies=COOKIES,
        data=payload.encode('utf-8'),
        timeout=30
    )
    return resp

def download_image(url, dest_path):
    if dest_path.exists():
        return False, "already_exists"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            with open(dest_path, 'wb') as f:
                f.write(r.content)
            return True, len(r.content)
        return False, f"HTTP_{r.status_code}"
    except Exception as e:
        return False, str(e)

def run():
    print("=" * 65)
    print(f"Starting Instagram Scraper for tnpdcl_offcl")
    print(f"Single Notices: {SINGLE_DIR}")
    print(f"Carousel Abstracts: {CAROUSEL_DIR}")
    print(f"Cutoff Date: {CUTOFF_DT.strftime('%Y-%m-%d %H:%M:%S IST')} (ts={CUTOFF_TS})")
    print("=" * 65)

    base_payload = load_base_payload()
    cursor = None
    page_num = 0
    total_downloaded = 0
    total_skipped = 0

    while True:
        page_num += 1
        print(f"\n[Page {page_num}] Requesting posts (cursor={cursor[:25] + '...' if cursor else 'START'})...")
        
        resp = fetch_page(base_payload, cursor)
        if resp.status_code != 200 or 'xdt_api' not in resp.text:
            print(f"  [ERROR] HTTP {resp.status_code}: {resp.text[:300]}")
            break

        data = resp.json()
        conn = data['data']['xdt_api__v1__feed__user_timeline_graphql_connection']
        edges = conn['edges']
        page_info = conn.get('page_info', {})
        end_cursor = page_info.get('end_cursor')
        has_next = page_info.get('has_next_page', False)

        if not edges:
            print("  No edges returned in page. Stopping.")
            break

        print(f"  Received {len(edges)} posts on this page.")
        reached_cutoff = False

        for i, edge in enumerate(edges):
            node = edge['node']
            pk = node['pk']
            taken_at = node.get('taken_at', 0)
            
            # Format IST date & time
            post_dt = datetime.fromtimestamp(taken_at, IST) if taken_at else None
            date_prefix = post_dt.strftime('%Y-%m-%d_%H-%M-%S') if post_dt else 'unknown'
            caption_snippet = (node.get('caption') or {}).get('text', '')[:45].replace('\n', ' ')

            if taken_at and taken_at < CUTOFF_TS:
                print(f"  [CUTOFF] Post {pk} from {date_prefix} IST is before cutoff. Stopping pagination.")
                reached_cutoff = True
                break

            media_type = node.get('media_type')  # 1=photo, 8=carousel
            caption_snippet = (node.get('caption') or {}).get('text', '')[:45].replace('\n', ' ')

            # A. CAROUSEL POST (Abstract Reports / Multi-slide announcements)
            if media_type == 8 and node.get('carousel_media'):
                carousel_slides = node['carousel_media']
                print(f"  [CAROUSEL] Post {pk} ({len(carousel_slides)} slides) from {date_prefix} IST - {caption_snippet}")
                for s_idx, slide in enumerate(carousel_slides):
                    s_cand = slide.get('image_versions2', {}).get('candidates', [])
                    if s_cand:
                        slide_fn = f"{date_prefix}_{pk}_slide{s_idx + 1}.jpg"
                        slide_dest = CAROUSEL_DIR / slide_fn
                        s_ok, s_res = download_image(s_cand[0]['url'], slide_dest)
                        if s_ok:
                            total_downloaded += 1
                            print(f"      [+] Saved slide {s_idx + 1}: {slide_fn} ({s_res // 1024} KB)")
                        elif s_res == "already_exists":
                            total_skipped += 1
                        else:
                            print(f"      [!] Failed slide {s_idx + 1}: {s_res}")

            # B. SINGLE PHOTO POST (Individual outage notices)
            else:
                candidates = node.get('image_versions2', {}).get('candidates', [])
                if candidates:
                    main_fn = f"{date_prefix}_{pk}.jpg"
                    main_dest = SINGLE_DIR / main_fn
                    ok, res = download_image(candidates[0]['url'], main_dest)
                    if ok:
                        total_downloaded += 1
                        print(f"  [SINGLE] Saved {main_fn} ({res // 1024} KB) - {caption_snippet}")
                    elif res == "already_exists":
                        total_skipped += 1
                    else:
                        print(f"  [!] Failed {main_fn}: {res}")

        if reached_cutoff or not has_next or not end_cursor:
            print(f"\nPagination finished. (reached_cutoff={reached_cutoff}, has_next={has_next})")
            break

        cursor = end_cursor
        sleep_sec = random.uniform(1.8, 3.2)
        print(f"  Sleeping {sleep_sec:.1f}s before next page...")
        time.sleep(sleep_sec)

    print("\n" + "=" * 65)
    print(f"Done! Downloaded {total_downloaded} new images, Skipped {total_skipped} existing.")
    print(f"Carousel Abstract Reports in {CAROUSEL_DIR}: {len(list(CAROUSEL_DIR.glob('*.jpg')))}")
    print(f"Single Notices in {SINGLE_DIR}: {len(list(SINGLE_DIR.glob('*.jpg')))}")
    print("=" * 65)

if __name__ == '__main__':
    run()
