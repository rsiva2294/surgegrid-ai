import os, gzip, json

RAW_DIR = r'C:\projects\nammamap-v2\tneb-outage\nammamap-outage-aggregator\data-source\tneb_gis_raw'
DTR_DIR = r'public\data\dtr'
GRID_PATH = r'public\data\chennai_tneb_grid.json'

cma_circles = ['0400', '0401', '0402', '0404', '0406', '0408', '0410', '0411']

# 1. Update DTR JSONs
print("--- Updating DTR JSONs with Disaster Recovery Metadata ---")
raw_dtr_dir = os.path.join(RAW_DIR, 'distribution_network', 'transformers')

for cir in cma_circles:
    match = next((f for f in os.listdir(raw_dtr_dir) if cir in f), None)
    if not match:
        print(f"Skipping circle {cir} (no raw file found)")
        continue
    
    raw_path = os.path.join(raw_dtr_dir, match)
    with gzip.open(raw_path, 'rt', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    circle_dts = {}
    plinth_count = 0
    loop_ht_count = 0
    
    for f in raw_data.get('features', []):
        p = f.get('properties', {})
        fdr = str(p.get('fdr_code') or '')
        if not fdr:
            continue
        if fdr not in circle_dts:
            circle_dts[fdr] = []
        
        poles = p.get('no_of_pole')
        ht_fdr = p.get('no_ht_fdr')
        lt_fdr = p.get('no_lt_fdr')
        make = p.get('dt_make')
        scheme = p.get('dt_scheme')
        
        if poles == 0:
            plinth_count += 1
        if (ht_fdr or 0) >= 2:
            loop_ht_count += 1
        
        coords = f.get('geometry', {}).get('coordinates', [0, 0])
        circle_dts[fdr].append({
            'id': str(p.get('dt_code') or ''),
            'name': str(p.get('dt_name') or '').strip(),
            'kva': p.get('dt_cap_kva'),
            'cons': p.get('dtconcount'),
            'lat': round(coords[1], 5),
            'lng': round(coords[0], 5),
            'poles': poles,
            'htFeeders': ht_fdr,
            'ltFeeders': lt_fdr,
            'make': make if make and make != 'ABC' else None,
            'scheme': scheme
        })
    
    out_path = os.path.join(DTR_DIR, f"{cir}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(circle_dts, f)
    
    print(f"[OK] Circle {cir}: {len(raw_data['features'])} DTs saved. Plinths(0-pole): {plinth_count}, Loop HT(>=2): {loop_ht_count}")

# 2. Enrich Feeders in chennai_tneb_grid.json with ltLengthKm and feedArea
print("\n--- Enriching Feeders in chennai_tneb_grid.json ---")
meta_path = os.path.join(RAW_DIR, 'grid_infrastructure', 'feeders_master_metadata.json')
with open(meta_path, 'r', encoding='utf-8') as f:
    master_meta = json.load(f)

feeder_meta_map = {}
for f in master_meta.get('feeders', []):
    fdr_code = str(f.get('fdr_code') or '')
    if fdr_code:
        feeder_meta_map[fdr_code] = {
            'ltLengthKm': round(f.get('lt_length') / 1000.0, 2) if f.get('lt_length') else None,
            'feedArea': f.get('feedarea'),
            'feedOwn': f.get('feedown')
        }

with open(GRID_PATH, 'r', encoding='utf-8') as f:
    grid = json.load(f)

enriched_feeders = 0
for sub in grid.get('substations', []):
    for f in sub.get('feeders', []):
        fdr_code = str(f.get('code') or '')
        if fdr_code in feeder_meta_map:
            m = feeder_meta_map[fdr_code]
            if m.get('ltLengthKm'):
                f['ltLengthKm'] = m['ltLengthKm']
            if m.get('feedArea'):
                f['feedArea'] = m['feedArea']
            if m.get('feedOwn'):
                f['feedOwn'] = m['feedOwn']
            enriched_feeders += 1

with open(GRID_PATH, 'w', encoding='utf-8') as f:
    json.dump(grid, f, indent=2)

print(f"[OK] Enriched {enriched_feeders} feeders with low-tension patrol corridor lengths & area classification.")
print("ALL DISASTER RECOVERY METADATA EXTRACTION COMPLETE!")
