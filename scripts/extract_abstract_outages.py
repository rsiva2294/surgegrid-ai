"""
Parallelized Extraction of TNEB Abstract Carousel Slides into structured JSON.
Processes up to 3 daily posts concurrently (safely within 15 RPM free tier limit).
Outputs individual daily JSON files to data/tneb_abstract_json/
and compiles a consolidated master JSON at data/tneb_abstract_outages_master.json.
"""

import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from PIL import Image

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

sys.stdout.reconfigure(encoding='utf-8')

# Input / Output directories
CAROUSEL_DIR = Path('c:/projects/surgegrid-ai/data/tneb_carousel_abstracts')
OUTPUT_DIR = Path('c:/projects/surgegrid-ai/data/tneb_abstract_json')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MASTER_JSON_PATH = Path('c:/projects/surgegrid-ai/data/tneb_abstract_outages_master.json')

API_KEY = os.environ.get('GEMINI_API_KEY', 'AQ.Ab8RN6L7dKhreV_PbMwNNc1Awwsn2bjqB4mA3qIRD6jwbvBnCQ')
MODEL_NAME = 'gemini-3.1-flash-lite'
client = genai.Client(api_key=API_KEY)

# Pydantic Schemas for Structured JSON Extraction
class OutageEntry(BaseModel):
    s_no: int
    area: str = Field(description="Area name, e.g. Vyarsarpadi, Kollavayal")
    district_or_zone: str = Field(description="District or zone, e.g. Chennai North, Sivagangai")
    cause: str = Field(description="Full text in Cause column including feeder and substation details")
    from_time: str = Field(description="Start time of outage in 24-hr or 12-hr format HH:MM, e.g. 09:40")
    duration: str = Field(description="Duration text as written, e.g. 5 Hrs 20 Mins")
    duration_minutes: Optional[int] = Field(description="Total duration converted to integer minutes")
    power_status: str = Field(description="Power status, e.g. Restored")

class DailyAbstractReport(BaseModel):
    report_date: str = Field(description="Date of the report in YYYY-MM-DD format (from period start)")
    period_start: str = Field(description="Period start string, e.g. 17.09.2026 06:00 Hrs")
    period_end: str = Field(description="Period end string, e.g. 18.09.2026 06:00 Hrs")
    total_outages_listed: int = Field(description="Total count of outage entries extracted")
    outages: List[OutageEntry]

print_lock = threading.Lock()

def safe_print(*args, **kwargs):
    with print_lock:
        print(*args, **kwargs, flush=True)

def get_grouped_posts():
    """Groups carousel slides by unique post key and sorts them in numerical slide order."""
    files = [f for f in os.listdir(CAROUSEL_DIR) if f.endswith('.jpg')]
    posts = defaultdict(list)
    
    for f in sorted(files):
        parts = f.split('_slide')
        if len(parts) == 2:
            post_key = parts[0]
            posts[post_key].append(f)
            
    for k in posts:
        posts[k].sort(key=lambda x: int(x.split('_slide')[1].split('.')[0]))
        
    return dict(sorted(posts.items()))

def process_single_post(post_key, slide_filenames, max_retries=6):
    """Processes all slides for one single post with retries for rate limits and server demand."""
    dest_json = OUTPUT_DIR / f"{post_key}.json"
    if dest_json.exists():
        try:
            with open(dest_json, 'r', encoding='utf-8') as jf:
                data = json.load(jf)
            return data, "skipped", None
        except Exception:
            pass

    slide_paths = [CAROUSEL_DIR / fn for fn in slide_filenames]
    images = [Image.open(p) for p in slide_paths]
    safe_print(f"  [START] Processing {post_key} ({len(slide_filenames)} slides)...")

    prompt = (
        "You are an expert OCR and data extraction system for Tamil Nadu Power Distribution Corporation (TNPDCL/TANGEDCO). "
        "The attached images are consecutive slides (Slide 1, Slide 2, etc.) of a single day's 'POWER OUTAGE ABSTRACT REPORT'. "
        "1. Read the header on Slide 1 to get the exact Period (e.g. 17.09.2026 06:00 Hrs To 18.09.2026 06:00 Hrs) and determine report_date in YYYY-MM-DD. "
        "2. Extract every single row from the table across all slides in sequence (S. No 1, 2, 3...). "
        "3. Maintain exact Area, District/Zone (often in parentheses), Cause, From Time, Duration, and Power Status. "
        "4. Calculate duration_minutes as an integer where possible. "
        "5. Do NOT skip any rows or slides."
    )

    local_client = genai.Client(api_key=API_KEY)
    last_err = None
    for attempt in range(max_retries):
        try:
            response = local_client.models.generate_content(
                model=MODEL_NAME,
                contents=[*images, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DailyAbstractReport,
                    temperature=0.1
                )
            )

            data = json.loads(response.text)
            data['post_key'] = post_key
            data['source_slides'] = slide_filenames
            data['extracted_at'] = datetime.now().isoformat()

            with open(dest_json, 'w', encoding='utf-8') as out_f:
                json.dump(data, out_f, indent=2, ensure_ascii=False)

            return data, "extracted", None
        except Exception as e:
            last_err = e
            err_str = str(e)
            if "503" in err_str or "UNAVAILABLE" in err_str:
                wait_sec = 20 * (attempt + 1)
                safe_print(f"  [WAIT-503] Model high demand for {post_key}. Backing off {wait_sec}s... (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_sec)
            elif "429" in err_str or "ResourceExhausted" in err_str:
                wait_sec = 15 * (attempt + 1)
                safe_print(f"  [WAIT-429] Rate limit for {post_key}. Backing off {wait_sec}s... (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_sec)
            else:
                wait_sec = 10
                safe_print(f"  [RETRY] Error on {post_key}: {e}. Retrying in {wait_sec}s... (attempt {attempt+1}/{max_retries})")
                time.sleep(wait_sec)

    return None, "error", str(last_err)

def run(workers=3):
    posts = get_grouped_posts()
    total_posts = len(posts)
    safe_print("=" * 65)
    safe_print(f"Starting Accelerated TNEB Extraction ({total_posts} daily posts, {workers} parallel workers)")
    safe_print(f"Model: {MODEL_NAME} (Zero-cost Free Tier)")
    safe_print(f"Output Directory: {OUTPUT_DIR}")
    safe_print("=" * 65)

    # First collect any already extracted posts
    to_process = []
    completed_reports = {}

    for post_key, slides in posts.items():
        dest_json = OUTPUT_DIR / f"{post_key}.json"
        if dest_json.exists():
            try:
                with open(dest_json, 'r', encoding='utf-8') as jf:
                    data = json.load(jf)
                completed_reports[post_key] = data
                safe_print(f"  [CACHED] {post_key} -> {data.get('report_date')} ({len(data.get('outages', []))} outages)")
                continue
            except Exception:
                pass
        to_process.append((post_key, slides))

    safe_print(f"\nAlready cached: {len(completed_reports)} / {total_posts}")
    safe_print(f"Remaining to process concurrently: {len(to_process)}")

    if to_process:
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_post = {
                executor.submit(process_single_post, post_key, slides): (post_key, slides)
                for post_key, slides in to_process
            }

            done_count = 0
            for future in as_completed(future_to_post):
                post_key, slides = future_to_post[future]
                done_count += 1
                try:
                    data, status, err = future.result()
                    if status == "extracted":
                        completed_reports[post_key] = data
                        outages = len(data.get('outages', []))
                        safe_print(f"[{done_count}/{len(to_process)}] [SUCCESS] {post_key} -> {data.get('report_date')} ({outages} outages)")
                    elif status == "skipped":
                        completed_reports[post_key] = data
                    else:
                        safe_print(f"[{done_count}/{len(to_process)}] [ERROR] {post_key} failed: {err}")
                except Exception as exc:
                    safe_print(f"[{done_count}/{len(to_process)}] [EXCEPTION] {post_key}: {exc}")

        elapsed = time.time() - start_time
        safe_print(f"\nBatch processing finished in {elapsed:.1f}s (~{elapsed/max(len(to_process), 1):.1f}s/post effective)")

    # Compile consolidated master JSON in strict chronological order
    all_reports = sorted(completed_reports.values(), key=lambda r: r.get('report_date', ''))
    total_outages = sum(len(r.get('outages', [])) for r in all_reports)

    with open(MASTER_JSON_PATH, 'w', encoding='utf-8') as mf:
        json.dump({
            "total_reports": len(all_reports),
            "total_outage_events": total_outages,
            "generated_at": datetime.now().isoformat(),
            "reports": all_reports
        }, mf, indent=2, ensure_ascii=False)

    safe_print("\n" + "=" * 65)
    safe_print("EXTRACTION & MASTER CONSOLIDATION COMPLETE!")
    safe_print(f"Total Daily Reports Compiled: {len(all_reports)}/{total_posts}")
    safe_print(f"Total Outage Events Extracted: {total_outages}")
    safe_print(f"Master Consolidated JSON: {MASTER_JSON_PATH}")
    safe_print("=" * 65)

if __name__ == '__main__':
    run(workers=2)
