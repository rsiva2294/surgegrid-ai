import json
import urllib.request
import re
import os

API_KEY = os.environ.get('GEMINI_API_KEY', '').strip()
if not API_KEY:
    raise SystemExit('ERROR: environment variable GEMINI_API_KEY is not set (see scripts/README.md).')
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
        gold_registry = json.load(f)

    outages = resolved_doc['outages']
    candidates = [o for o in outages if o.get('mappingStatus') != 'VERIFIED_ASSET']
    print(f"Total candidates needing enrichment: {len(candidates)}")

    # Extract cause lines
    items_to_send = []
    for c in candidates:
        items_to_send.append({
            "outage_id": c['outage_id'],
            "area": c.get('area', ''),
            "district_or_zone": c.get('district_or_zone', ''),
            "cause": c.get('cause', '')
        })

    prompt = f"""
You are a senior electrical distribution engineer analyzing Tamil Nadu Electricity Board (TNEB/TANGEDCO) power outage incident notices in the Chennai Metropolitan Area.

Analyze each of the following outage records. For each record, extract structured power grid entities and technical failure characteristics:
1. "substation_name": The standardized physical substation name (e.g. "Kovur SS" -> "KOVOOR SS", "Poonthamallee SS" -> "POONAMALLEE SS", "Flower Bazar SS" -> "FLOWER BAZAAR SS", "Pulianthoppu SS" -> "PULIANTHOPE SS", "Mudichoor Feeder of 110kV Pudhuthangal SS" -> "PUDHUTHANGAL SS", "Thiruverkaadu SS" -> "THIRUVERKADU SS", "Chindadiripet SS" -> "CHINTADRIPET SS", "KITS SS" -> "KITS SS"). If no substation is mentioned, set to null.
2. "feeder_name": The specific 11 kV or 33 kV feeder line name (e.g. "Ayanar Feeder", "Ayyapillai Feeder", "VOC Feeder", "Shenoy Nagar Feeder", "Kandanchavadi Feeder", "Mettu Street Feeder", "Vazhuthalambedu Feeder"). If not mentioned, set to null.
3. "section_name": The Assistant Engineer (AE) O&M section office if mentioned or inferable (e.g. "Muthialpet Section", "Mandaveli Section", "Medavakkam Section", "Nammalwarpet Section"). If not mentioned, set to null.
4. "component_type": One of ["Distribution Transformer", "Current Transformer (CT)", "Potential Transformer (PT)", "Feeder Breaker", "Underground Cable", "Overhead Jumper", "Pole", "Ring Main Unit (RMU)", "Busbar Coupler", "Pillar Box", "Transmission Source Grid", "Other"]
5. "failure_mode": One of ["Fire / Explosion", "Flashover / Sparking", "Overload Trip", "Cable Joint / Insulation Fault", "Mechanical Jumper Cut", "Pole Damage", "Component Replacement / Maintenance", "Supply Interruption"]
6. "grid_severity": One of ["CRITICAL_GRID_COLLAPSE", "MAJOR_SUBSTATION_CORE", "MODERATE_FEEDER_TRIP", "MINOR_STREET_FAULT"]
7. "explanation": Brief 1-sentence engineering reasoning.

Input records:
{json.dumps(items_to_send, indent=2)}

Respond with a JSON array of objects, one per outage_id, with the exact schema:
[
  {{
    "outage_id": "...",
    "substation_name": "...",
    "feeder_name": "...",
    "section_name": "...",
    "component_type": "...",
    "failure_mode": "...",
    "grid_severity": "...",
    "explanation": "..."
  }}
]
"""

    print("Querying Gemini 2.5 Flash Lite for deep extraction...")
    response_text = call_gemini(prompt)
    extracted = json.loads(response_text)
    print(f"Received structured extractions for {len(extracted)} records from Gemini.")

    extracted_by_id = {item['outage_id']: item for item in extracted}

    # Load master switchyards for coordinate mapping
    with open('public/data/chennai_outage_gold_registry.json', 'r', encoding='utf-8') as f:
        registry = json.load(f)

    # Build known substations catalog
    known_substations = {}
    for sig in registry['signatures'].values():
        if sig.get('ssName') and sig.get('ssLat'):
            norm_name = clean_key(sig['ssName'])
            if norm_name not in known_substations:
                known_substations[norm_name] = {
                    "ssName": sig['ssName'],
                    "ssCode": sig.get('ssCode'),
                    "ssLat": sig['ssLat'],
                    "ssLng": sig['ssLng'],
                    "secName": sig.get('secName'),
                    "secCode": sig.get('secCode')
                }

    # Also map common canonical names
    aliases = {
        "kovoor": "kovoor",
        "kovur": "kovoor",
        "flowerbazaar": "flowerbazaar",
        "flowerbazar": "flowerbazaar",
        "pulianthope": "pulianthope",
        "pulianthoppu": "pulianthope",
        "poonamallee": "poonamallee",
        "poonthamallee": "poonamallee",
        "thiruverkadu": "thiruverkadu",
        "thiruverkaadu": "thiruverkadu",
        "chintadripet": "chindatripet",
        "chindadiripet": "chindatripet",
        "pudhuthangal": "puduthangal",
        "mudichur": "mudichur",
        "mudichoor": "mudichur",
        "velachery": "velachery",
        "kits": "kits",
        "thiruporur": "thiruporur",
        "perungudi": "perungudi",
        "pallavakkam": "perungudi"
    }

    promoted_to_verified = 0
    novel_signatures_to_add = {}

    for c in candidates:
        oid = c['outage_id']
        gem = extracted_by_id.get(oid)
        if not gem:
            continue

        c['gemini_enrichment'] = gem

        # Try to resolve substation if currently missing
        if not c.get('resolvedSubstation') and gem.get('substation_name'):
            ss_cand = clean_key(gem['substation_name'])
            # Check aliases
            for alias_from, alias_to in aliases.items():
                if alias_from in ss_cand:
                    ss_cand = alias_to
                    break

            # Find matching known substation
            matched_ss = None
            for k, val in known_substations.items():
                if ss_cand in k or k in ss_cand:
                    matched_ss = val
                    break

            if matched_ss:
                c['resolvedSubstation'] = {
                    "name": matched_ss['ssName'],
                    "code": matched_ss['ssCode'],
                    "lat": matched_ss['ssLat'],
                    "lng": matched_ss['ssLng']
                }
                c['latitude'] = matched_ss['ssLat']
                c['longitude'] = matched_ss['ssLng']
                c['mappingStatus'] = 'VERIFIED_ASSET'
                c['resolutionMethod'] = 'gemini_reasoned_asset_recovery'
                c['confidence'] = 0.95
                promoted_to_verified += 1

                # Generate signature for Gold Registry
                town_k = clean_key(c.get('area', ''))
                sec_k = clean_key(c.get('resolvedSection', {}).get('name') if c.get('resolvedSection') else matched_ss.get('secName', ''))
                ss_k = clean_key(matched_ss['ssName'])
                feeder_k = clean_key(gem.get('feeder_name', ''))

                if ss_k and feeder_k:
                    sig_k = f"{ss_k}|{feeder_k}"
                    if sig_k not in registry['signatures']:
                        novel_signatures_to_add[sig_k] = {
                            "ssName": matched_ss['ssName'],
                            "ssCode": matched_ss['ssCode'],
                            "ssLat": matched_ss['ssLat'],
                            "ssLng": matched_ss['ssLng'],
                            "secName": matched_ss.get('secName') or "AE/O&M",
                            "secCode": matched_ss.get('secCode') or "000",
                            "secLat": matched_ss['ssLat'],
                            "secLng": matched_ss['ssLng'],
                            "verifiedAt": "2026-09-28",
                            "source": "gemini_abstract_enrichment"
                        }

                if town_k and sec_k and ss_k and feeder_k:
                    full_sig = f"{town_k}|{sec_k}|{ss_k}|{feeder_k}"
                    if full_sig not in registry['signatures']:
                        novel_signatures_to_add[full_sig] = {
                            "ssName": matched_ss['ssName'],
                            "ssCode": matched_ss['ssCode'],
                            "ssLat": matched_ss['ssLat'],
                            "ssLng": matched_ss['ssLng'],
                            "secName": matched_ss.get('secName') or "AE/O&M",
                            "secCode": matched_ss.get('secCode') or "000",
                            "secLat": matched_ss['ssLat'],
                            "secLng": matched_ss['ssLng'],
                            "verifiedAt": "2026-09-28",
                            "source": "gemini_abstract_enrichment"
                        }

    print(f"\nSuccessfully promoted {promoted_to_verified} records to VERIFIED_ASSET!")
    print(f"Extracted {len(novel_signatures_to_add)} novel verified signatures for Gold Registry.")

    # Save enriched abstract outages
    with open('data/chennai_abstract_outages_resolved_with_gold.json', 'w', encoding='utf-8') as f:
        json.dump(resolved_doc, f, indent=2)
    print("Saved enriched outages to data/chennai_abstract_outages_resolved_with_gold.json")

    # If novel signatures exist, add to Gold Registry
    if novel_signatures_to_add:
        for k, v in novel_signatures_to_add.items():
            registry['signatures'][k] = v
        registry['counts']['uniqueSignatures'] = len(registry['signatures'])
        registry['updatedAt'] = "2026-09-28T22:30:00.000Z"
        with open('public/data/chennai_outage_gold_registry.json', 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2)
        print(f"Updated public/data/chennai_outage_gold_registry.json (New Total: {registry['counts']['uniqueSignatures']} signatures)")

    # Print summary of the 27 enriched records
    print("\n--- SAMPLE ENRICHED RECORDS ---")
    for c in candidates[:10]:
        gem = c.get('gemini_enrichment', {})
        print(f"ID: {c['outage_id']}")
        print(f"  Area: {c.get('area')} | Status: {c.get('mappingStatus')}")
        print(f"  Cause: {c.get('cause')}")
        print(f"  Gemini -> SS: {gem.get('substation_name')} | Feeder: {gem.get('feeder_name')} | Component: {gem.get('component_type')} ({gem.get('failure_mode')})")
        if c.get('resolvedSubstation'):
            print(f"  Recovered SS: {c['resolvedSubstation']['name']}")
        print()

if __name__ == '__main__':
    main()
