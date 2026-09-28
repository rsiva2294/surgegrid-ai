"""
scripts/extract_chennai_outages.py

Extracts all Chennai-related power outage records from the master dataset
(data/tneb_abstract_outages_master.json) into a dedicated clean dataset:
data/chennai_abstract_outages.json.

Includes:
- All 5 direct Chennai distribution circles:
  Chennai Central, Chennai South 1, Chennai South 2, Chennai North, Chennai West.
- Metropolitan suburban Chennai grid records (Chengalpattu/Kanchipuram/Tiruvallur)
  that physically connect to Chennai TNEB Grid substations.
"""

import json
import re
from pathlib import Path

MASTER_PATH = Path('c:/projects/surgegrid-ai/data/tneb_abstract_outages_master.json')
GRID_PATH = Path('c:/projects/surgegrid-ai/public/data/chennai_tneb_grid.json')
OUTPUT_PATH = Path('c:/projects/surgegrid-ai/data/chennai_abstract_outages.json')

def extract_entities_from_cause(cause_text):
    """Parses candidate substation, feeder, and section strings from the TNEB Cause column."""
    if not cause_text:
        return {}, {}, {}
    
    # Substation regex
    ss_match = re.search(r'(?:of\s+|in\s+)?(?:the\s+)?(\d+(?:/\d+)?\s*(?:kV|KV)\s+[A-Za-z0-9\.\-\s]+?\s+(?:SS|Substation|Sub\s+Station)|\b[A-Za-z0-9\.\-]+?\s+(?:SS|Substation)\b)', cause_text, re.I)
    candidate_ss = ss_match.group(1).strip() if ss_match else None

    # Feeder regex
    fdr_match = re.search(r'(?:in\s+|of\s+)?(?:the\s+)?(\d+(?:/\d+)?\s*(?:kV|KV)\s+[A-Za-z0-9\.\-\s]+?\s+Feeder|\b[A-Za-z0-9\.\-]+?\s+Feeder\b)', cause_text, re.I)
    candidate_fdr = fdr_match.group(1).strip() if fdr_match else None

    # Section regex
    sec_match = re.search(r'([A-Za-z0-9\.\-\s]+?\s+Section)\b', cause_text, re.I)
    candidate_sec = sec_match.group(1).strip() if sec_match else None

    return candidate_ss, candidate_fdr, candidate_sec

def run():
    print("=" * 65)
    print("Extracting Chennai Power Outages from Master Dataset...")
    print(f"Master file: {MASTER_PATH}")
    print(f"Grid reference: {GRID_PATH}")
    print("=" * 65)

    with open(MASTER_PATH, 'r', encoding='utf-8') as f:
        master = json.load(f)

    with open(GRID_PATH, 'r', encoding='utf-8') as f:
        grid = json.load(f)

    grid_ss_names = set(s['name'].lower() for s in grid.get('substations', []))
    grid_ss_cleans = set(s.get('cleanName', '').lower() for s in grid.get('substations', []) if s.get('cleanName'))
    all_grid_ss = grid_ss_names | grid_ss_cleans

    chennai_records = []
    direct_circle_counts = {}
    suburban_counts = {}

    for r in master['reports']:
        rd = r.get('report_date')
        ps = r.get('period_start')
        pe = r.get('period_end')
        pk = r.get('post_key')

        for o in r.get('outages', []):
            dz = (o.get('district_or_zone') or '').strip()
            s_no = o.get('s_no')
            cause = o.get('cause', '')
            area = o.get('area', '')

            cand_ss, cand_fdr, cand_sec = extract_entities_from_cause(cause)

            is_direct_chennai = 'chennai' in dz.lower()
            is_suburban_chennai = False
            suburban_matched_ss = None

            if not is_direct_chennai and any(k in dz.lower() for k in ['chengalp', 'kanchi', 'tiruval']):
                cause_l = cause.lower()
                area_l = area.lower()
                matched = [s for s in all_grid_ss if len(s) > 4 and (s in cause_l or s in area_l)]
                if matched:
                    is_suburban_chennai = True
                    suburban_matched_ss = matched[0]

            if is_direct_chennai or is_suburban_chennai:
                item = {
                    "outage_id": f"{pk}_{s_no}",
                    "post_key": pk,
                    "report_date": rd,
                    "period_start": ps,
                    "period_end": pe,
                    "s_no": s_no,
                    "area": area,
                    "district_or_zone": dz,
                    "is_direct_chennai_circle": is_direct_chennai,
                    "is_suburban_grid_asset": is_suburban_chennai,
                    "suburban_grid_reference": suburban_matched_ss,
                    "from_time": o.get('from_time'),
                    "duration": o.get('duration'),
                    "duration_minutes": o.get('duration_minutes'),
                    "power_status": o.get('power_status'),
                    "cause": cause,
                    "parsed_entities": {
                        "detected_substation": cand_ss,
                        "detected_feeder": cand_fdr,
                        "detected_section": cand_sec
                    }
                }
                chennai_records.append(item)

                if is_direct_chennai:
                    direct_circle_counts[dz] = direct_circle_counts.get(dz, 0) + 1
                else:
                    suburban_counts[dz] = suburban_counts.get(dz, 0) + 1

    # Sort chronologically by report_date, then s_no
    chennai_records.sort(key=lambda x: (x.get('report_date') or '', x.get('s_no') or 0))

    output_payload = {
        "description": "Historical Chennai Outages extracted from TNEB Abstract Reports (July 03 - September 27, 2026)",
        "total_chennai_outages": len(chennai_records),
        "direct_circle_outages": sum(direct_circle_counts.values()),
        "suburban_grid_outages": sum(suburban_counts.values()),
        "circle_distribution": direct_circle_counts,
        "suburban_distribution": suburban_counts,
        "outages": chennai_records
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as out_f:
        json.dump(output_payload, out_f, indent=2, ensure_ascii=False)

    print(f"\nSUCCESS: Extracted {len(chennai_records)} Chennai-related outage records.")
    print(f" - Direct Chennai Circles: {sum(direct_circle_counts.values())}")
    for c, cnt in sorted(direct_circle_counts.items()):
        print(f"     {c}: {cnt}")
    print(f" - Suburban Grid Assets: {sum(suburban_counts.values())}")
    for c, cnt in sorted(suburban_counts.items()):
        print(f"     {c}: {cnt}")
    print(f"\nSaved to: {OUTPUT_PATH}")
    print("=" * 65)

if __name__ == '__main__':
    run()
