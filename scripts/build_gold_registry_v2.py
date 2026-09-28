import sys
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

# Paths
surgegrid_gold_path = 'public/data/chennai_outage_gold_registry.json'
aggregator_gold_path = r'C:\projects\nammamap-v2\tneb-outage\nammamap-outage-aggregator\functions\src\data\chennai_outage_gold_registry.json'
sched_path = 'data/chennai_scheduled_outages_2026_verified.json'
abs_path = 'data/chennai_abstract_outages_resolved_with_gold.json'

with open(surgegrid_gold_path, 'r', encoding='utf-8') as f:
    gold = json.load(f)

with open(sched_path, 'r', encoding='utf-8') as f:
    sched_data = json.load(f)

with open(abs_path, 'r', encoding='utf-8') as f:
    abstract_data = json.load(f)

existing_sigs = gold.get('signatures', {})
print(f"Loaded existing Gold Registry signatures: {len(existing_sigs)}")

def clean(str_val):
    if not str_val:
        return ''
    t = str_val.lower()
    t = re.sub(r'[\d/]+\s*kv\b', ' ', t)
    t = re.sub(r'\bss\b', ' ', t)
    t = re.sub(r'\bfeeder\b', ' ', t)
    t = re.sub(r'[^a-z0-9]', ' ', t)
    return ' '.join(t.split())

def squash(str_val):
    return clean(str_val).replace(' ', '')

novel_signatures = {}
duplicates_skipped = 0

# 1. Ingest Scheduled Outages Signatures
for r in sched_data['records']:
    if r.get('isDuplicate'):
        continue
    
    ss = r['substation']
    sec = r['section']
    fdr = r['feeder']
    loc = r['location']
    
    if not ss['ssCode'] or not sec['secCode']:
        continue
        
    entry = {
        "ssName": ss['ssName'],
        "ssCode": ss['ssCode'],
        "ssLat": ss['lat'],
        "ssLng": ss['lng'],
        "secName": sec['secName'],
        "secCode": sec['secCode'],
        "secLat": sec['lat'],
        "secLng": sec['lng'],
        "verifiedAt": "2026-09-28",
        "source": "scheduled_maintenance_audit"
    }
    
    t_sq = squash(sec.get('reportedTown', ''))
    c_sq = squash(sec.get('reportedCircle', ''))
    f_sq = squash(fdr.get('reportedRaw', ''))
    loc_clean = clean(loc.get('reportedLocation', ''))
    loc_sq = squash(loc_clean[:30])
    
    keys = []
    if t_sq and f_sq and loc_sq:
        keys.append(f"{t_sq}|{c_sq}|{f_sq}|{loc_sq}")
    if t_sq and f_sq:
        keys.append(f"{t_sq}|{f_sq}")
    if c_sq and f_sq and c_sq != t_sq:
        keys.append(f"{c_sq}|{f_sq}")
    if f_sq and loc_sq:
        keys.append(f"{f_sq}|{loc_sq}")
        
    for k in keys:
        if len(k) > 4:
            if k in existing_sigs or k in novel_signatures:
                duplicates_skipped += 1
            else:
                novel_signatures[k] = entry

# 2. Ingest Abstract Breakdown Outages Signatures
for o in abstract_data['outages']:
    ss = o.get('resolvedSubstation')
    sec = o.get('resolvedSection')
    if not ss or not sec or not ss.get('code') or not sec.get('code'):
        continue
        
    method = o.get('resolutionMethod', '')
    if method == 'gold_signature_match':
        continue
        
    entry = {
        "ssName": ss['name'],
        "ssCode": ss['code'],
        "ssLat": ss.get('lat'),
        "ssLng": ss.get('lng'),
        "secName": sec['name'],
        "secCode": sec['code'],
        "secLat": sec.get('lat'),
        "secLng": sec.get('lng'),
        "verifiedAt": "2026-09-28",
        "source": "abstract_breakdown_audit"
    }
    
    area_sq = squash(o.get('area', ''))
    parsed = o.get('parsed_entities', {})
    f_raw = parsed.get('detected_feeder', '')
    f_sq = squash(f_raw)
    
    if f_sq:
        keys = []
        if area_sq and f_sq:
            keys.append(f"{area_sq}|{f_sq}")
        if f_sq and len(f_sq) > 4:
            keys.append(f"{area_sq}|{area_sq}|{f_sq}|")
            
        for k in keys:
            if len(k) > 4:
                if k in existing_sigs or k in novel_signatures:
                    duplicates_skipped += 1
                else:
                    novel_signatures[k] = entry

print(f"Total truly novel signatures: {len(novel_signatures)}")
print(f"Duplicates filtered: {duplicates_skipped}")

# Merge into Master Registry v2.0
master_signatures = dict(existing_sigs)
master_signatures.update(novel_signatures)

gold_v2 = {
    "version": "2.0.0",
    "updatedAt": "2026-09-28T20:10:00.000Z",
    "description": "Master Gold Standard Outage Registry v2.0: Canonical switchyard, section, and feeder mapping signatures for Chennai and CMA",
    "counts": {
        "verifiedInstances": gold.get('counts', {}).get('verifiedInstances', 1170) + len(novel_signatures),
        "uniqueSignatures": len(master_signatures),
        "gazetteerLocalities": len(gold.get('localities', {}))
    },
    "localities": gold.get('localities', {}),
    "signatures": master_signatures
}

# Save to surgegrid-ai
with open(surgegrid_gold_path, 'w', encoding='utf-8') as f:
    json.dump(gold_v2, f, indent=2, ensure_ascii=False)
print(f"Saved Master Registry v2.0 to {surgegrid_gold_path} (signatures: {len(master_signatures)})")

# Save to nammamap-outage-aggregator
import os
if os.path.exists(os.path.dirname(aggregator_gold_path)):
    with open(aggregator_gold_path, 'w', encoding='utf-8') as f:
        json.dump(gold_v2, f, indent=2, ensure_ascii=False)
    print(f"Saved Master Registry v2.0 to {aggregator_gold_path}")
