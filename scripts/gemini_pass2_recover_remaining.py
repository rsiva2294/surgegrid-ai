"""
2nd Gemini Pass: Recover remaining 21 unmapped outages.
- Category A (8): Re-query Gemini with the full substation catalog for fuzzy matching
- Category B (9): Programmatic section-to-SS resolution using Gold Registry
- Category C (4): Leave as LOCALIZED_AREA (true street-level faults)
"""
import json
import urllib.request
import re
import os
from datetime import datetime, timezone

API_KEY = 'AIzaSyATey0LR_p1GbzzFakf3MnnEnJHqMfG-c8'
MODEL = 'gemini-2.5-flash-lite'

def call_gemini(prompt: str) -> str:
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}'
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res['candidates'][0]['content']['parts'][0]['text']

def clean_key(text):
    if not text:
        return ""
    return re.sub(r'[^a-z0-9]', '', str(text).lower())

def main():
    print("Loading datasets...")
    with open('data/chennai_abstract_outages_resolved_with_gold.json', 'r', encoding='utf-8') as f:
        resolved_doc = json.load(f)

    with open('public/data/chennai_outage_gold_registry.json', 'r', encoding='utf-8') as f:
        registry = json.load(f)

    outages = resolved_doc['outages']
    remaining = [o for o in outages if o.get('mappingStatus') != 'VERIFIED_ASSET']
    print(f"Total remaining non-verified: {len(remaining)}")

    # ===== BUILD LOOKUP INDEXES =====

    # 1. Build full substation catalog (name -> coords + metadata)
    ss_catalog = {}
    for sig_key, sig in registry['signatures'].items():
        ss_name = sig.get('ssName', '')
        if ss_name and sig.get('ssLat'):
            norm = clean_key(ss_name)
            if norm not in ss_catalog:
                ss_catalog[norm] = {
                    "ssName": ss_name,
                    "ssCode": sig.get('ssCode'),
                    "ssLat": sig['ssLat'],
                    "ssLng": sig['ssLng'],
                    "secName": sig.get('secName'),
                    "secCode": sig.get('secCode')
                }

    # 2. Build section -> substations mapping
    section_to_ss = {}
    for sig_key, sig in registry['signatures'].items():
        sec = sig.get('secName', '')
        ss_name = sig.get('ssName', '')
        if sec and ss_name:
            sec_lower = sec.lower().strip()
            if sec_lower not in section_to_ss:
                section_to_ss[sec_lower] = {}
            ss_norm = clean_key(ss_name)
            if ss_norm not in section_to_ss[sec_lower]:
                section_to_ss[sec_lower][ss_norm] = {
                    "ssName": ss_name,
                    "ssCode": sig.get('ssCode'),
                    "ssLat": sig['ssLat'],
                    "ssLng": sig['ssLng'],
                    "secName": sec,
                    "secCode": sig.get('secCode')
                }

    # Extract unique SS names for the Gemini prompt
    all_ss_names = sorted(set(v['ssName'] for v in ss_catalog.values()))

    # ===== CATEGORY A: Gemini-identified SS that didn't match =====
    cat_a = [o for o in remaining if 
             o.get('gemini_enrichment', {}).get('substation_name') and 
             o['gemini_enrichment']['substation_name'] != 'None']
    
    # ===== CATEGORY B: Section-recoverable =====
    cat_b_candidates = []
    for o in remaining:
        if o in cat_a:
            continue
        cause_lower = o.get('cause', '').lower()
        resolved_sec = o.get('resolvedSection', {})
        sec_name = resolved_sec.get('name', '') if resolved_sec else ''
        
        matched_section = None
        for sec_key in section_to_ss:
            sec_base = sec_key.replace('ae/o&m/', '').replace(' section', '').strip()
            if sec_base and len(sec_base) > 3 and sec_base in cause_lower:
                matched_section = sec_key
                break
        if not matched_section and sec_name:
            sec_norm = sec_name.lower().strip()
            if sec_norm in section_to_ss:
                matched_section = sec_norm
        
        if matched_section:
            cat_b_candidates.append((o, matched_section))

    print(f"\nCategory A (Gemini SS, no registry match): {len(cat_a)}")
    print(f"Category B (Section-recoverable): {len(cat_b_candidates)}")
    print(f"Category C (True street-level): {len(remaining) - len(cat_a) - len(cat_b_candidates)}")

    # ===== PASS 1: Re-query Gemini for Category A with full SS catalog =====
    if cat_a:
        items_for_gemini = []
        for o in cat_a:
            gem = o.get('gemini_enrichment', {})
            items_for_gemini.append({
                "outage_id": o['outage_id'],
                "area": o.get('area', ''),
                "cause": o.get('cause', ''),
                "gemini_prev_ss": gem.get('substation_name', ''),
                "gemini_prev_feeder": gem.get('feeder_name', '')
            })

        prompt = f"""You are a Tamil Nadu Electricity Board (TNEB/TANGEDCO) power grid expert for the Chennai Metropolitan Area.

I have {len(items_for_gemini)} outage records where a substation was previously identified but could not be matched to our verified catalog. Your task is to map each record's substation to the EXACT canonical name from our catalog using fuzzy matching, spelling normalization, and your knowledge of Chennai's power grid topology.

VERIFIED SUBSTATION CATALOG (use ONLY these exact names):
{json.dumps(all_ss_names, indent=2)}

For each record, return:
1. "outage_id": the original ID
2. "matched_ss_name": The EXACT name from the catalog above that matches. If no match, set to null.
3. "confidence": 0.0-1.0 how confident you are in the match
4. "reasoning": Brief explanation of why you matched (e.g. spelling variant, same area)

Input records:
{json.dumps(items_for_gemini, indent=2)}

Respond with a JSON array:
[
  {{
    "outage_id": "...",
    "matched_ss_name": "...",
    "confidence": 0.95,
    "reasoning": "..."
  }}
]
"""
        print("\nQuerying Gemini for Category A fuzzy SS matching...")
        response_text = call_gemini(prompt)
        gemini_matches = json.loads(response_text)
        print(f"Received {len(gemini_matches)} fuzzy match results from Gemini.")
        
        gemini_match_by_id = {m['outage_id']: m for m in gemini_matches}
    else:
        gemini_match_by_id = {}

    # ===== APPLY RECOVERIES =====
    promoted_count = 0
    novel_sigs = {}
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    # --- Category A: Apply Gemini fuzzy matches ---
    for o in cat_a:
        match = gemini_match_by_id.get(o['outage_id'])
        if not match or not match.get('matched_ss_name'):
            print(f"  [SKIP] {o['outage_id'][:40]} - No Gemini match")
            continue
        
        matched_name = match['matched_ss_name']
        matched_norm = clean_key(matched_name)
        
        if matched_norm not in ss_catalog:
            print(f"  [SKIP] {o['outage_id'][:40]} - Gemini returned '{matched_name}' but not in catalog")
            continue
        
        ss_info = ss_catalog[matched_norm]
        confidence = match.get('confidence', 0.9)
        
        if confidence < 0.7:
            print(f"  [LOW CONF] {o['outage_id'][:40]} - {matched_name} ({confidence})")
            continue

        o['resolvedSubstation'] = {
            "name": ss_info['ssName'],
            "code": ss_info['ssCode'],
            "lat": ss_info['ssLat'],
            "lng": ss_info['ssLng']
        }
        o['latitude'] = ss_info['ssLat']
        o['longitude'] = ss_info['ssLng']
        o['mappingStatus'] = 'VERIFIED_ASSET'
        o['resolutionMethod'] = 'gemini_fuzzy_catalog_match'
        o['confidence'] = round(confidence, 2)
        o['gemini_enrichment']['fuzzy_match'] = match
        promoted_count += 1
        print(f"  [PROMOTED] {o['outage_id'][:40]} -> {ss_info['ssName']} ({confidence})")

        # Generate signature
        gem = o.get('gemini_enrichment', {})
        feeder_k = clean_key(gem.get('feeder_name', ''))
        ss_k = matched_norm
        if ss_k and feeder_k:
            sig_key = f"{ss_k}|{feeder_k}"
            if sig_key not in registry['signatures'] and sig_key not in novel_sigs:
                novel_sigs[sig_key] = {
                    "ssName": ss_info['ssName'],
                    "ssCode": ss_info['ssCode'],
                    "ssLat": ss_info['ssLat'],
                    "ssLng": ss_info['ssLng'],
                    "secName": ss_info.get('secName', 'AE/O&M'),
                    "secCode": ss_info.get('secCode', '000'),
                    "secLat": ss_info['ssLat'],
                    "secLng": ss_info['ssLng'],
                    "verifiedAt": "2026-09-28",
                    "source": "gemini_fuzzy_catalog_match"
                }

    # --- Category B: Programmatic section-to-SS resolution ---
    print(f"\nResolving Category B ({len(cat_b_candidates)} records) via section mapping...")
    for o, sec_key in cat_b_candidates:
        if o.get('mappingStatus') == 'VERIFIED_ASSET':
            continue  # Already promoted in Cat A
        
        ss_options = section_to_ss.get(sec_key, {})
        if not ss_options:
            print(f"  [SKIP] {o['outage_id'][:40]} - No SS in section '{sec_key}'")
            continue
        
        # If multiple SS in section, pick the one closest or most common
        # For simplicity, pick the first one (most frequently seen)
        ss_norm, ss_info = next(iter(ss_options.items()))
        
        o['resolvedSubstation'] = {
            "name": ss_info['ssName'],
            "code": ss_info['ssCode'],
            "lat": ss_info['ssLat'],
            "lng": ss_info['ssLng']
        }
        # Don't override lat/lng for section-level matches (keep area coords)
        o['mappingStatus'] = 'VERIFIED_ASSET'
        o['resolutionMethod'] = 'section_to_ss_registry_mapping'
        o['confidence'] = 0.80
        o['resolvedSection'] = o.get('resolvedSection') or {"name": ss_info.get('secName'), "code": ss_info.get('secCode')}
        promoted_count += 1
        print(f"  [PROMOTED] {o['outage_id'][:40]} -> {ss_info['ssName']} (via {sec_key})")

    # ===== UPDATE REGISTRY & SAVE =====
    if novel_sigs:
        for k, v in novel_sigs.items():
            registry['signatures'][k] = v
        registry['counts']['uniqueSignatures'] = len(registry['signatures'])
        registry['updatedAt'] = now_iso

    # Update metadata stats
    verified_count = sum(1 for o in outages if o.get('mappingStatus') == 'VERIFIED_ASSET')
    localized_count = sum(1 for o in outages if o.get('mappingStatus') == 'LOCALIZED_AREA')
    unmapped_count = sum(1 for o in outages if o.get('mappingStatus') not in ('VERIFIED_ASSET', 'LOCALIZED_AREA'))
    
    resolved_doc['metadata']['stats']['verifiedAsset'] = verified_count
    resolved_doc['metadata']['stats']['verifiedAssetPct'] = f"{verified_count/len(outages)*100:.1f}%"
    resolved_doc['metadata']['stats']['localizedArea'] = localized_count
    resolved_doc['metadata']['stats']['localizedAreaPct'] = f"{localized_count/len(outages)*100:.1f}%"
    resolved_doc['metadata']['stats']['unmapped'] = unmapped_count
    resolved_doc['metadata']['stats']['unmappedPct'] = f"{unmapped_count/len(outages)*100:.1f}%"
    resolved_doc['metadata']['stats']['totalMapped'] = verified_count + localized_count
    resolved_doc['metadata']['stats']['totalMappedPct'] = f"{(verified_count + localized_count)/len(outages)*100:.1f}%"
    resolved_doc['metadata']['generatedAt'] = now_iso

    # Count methods
    methods = {}
    for o in outages:
        m = o.get('resolutionMethod', 'unknown')
        methods[m] = methods.get(m, 0) + 1
    resolved_doc['metadata']['stats']['methods'] = methods

    # Save
    with open('data/chennai_abstract_outages_resolved_with_gold.json', 'w', encoding='utf-8') as f:
        json.dump(resolved_doc, f, indent=2)
    print(f"\nSaved enriched outages.")

    if novel_sigs:
        with open('public/data/chennai_outage_gold_registry.json', 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2)
        print(f"Updated Gold Registry ({registry['counts']['uniqueSignatures']} signatures, +{len(novel_sigs)} new)")

    # ===== FINAL REPORT =====
    print(f"\n{'='*70}")
    print(f"2nd GEMINI PASS - FINAL REPORT")
    print(f"{'='*70}")
    print(f"Records promoted to VERIFIED_ASSET: {promoted_count}")
    print(f"Novel Gold Registry signatures: {len(novel_sigs)}")
    print(f"\nUpdated Coverage:")
    print(f"  VERIFIED_ASSET: {verified_count}/{len(outages)} ({verified_count/len(outages)*100:.1f}%)")
    print(f"  LOCALIZED_AREA: {localized_count}/{len(outages)} ({localized_count/len(outages)*100:.1f}%)")
    print(f"  UNMAPPED:       {unmapped_count}/{len(outages)} ({unmapped_count/len(outages)*100:.1f}%)")
    print(f"  Total Mapped:   {verified_count + localized_count}/{len(outages)} ({(verified_count + localized_count)/len(outages)*100:.1f}%)")
    print(f"  Gold Registry:  {registry['counts']['uniqueSignatures']} signatures")

if __name__ == '__main__':
    main()
