import fitz
import json
import re
import os
from shapely.geometry import shape, Point
from collections import defaultdict, Counter

ZONE_NAMES = {
    1: 'Thiruvottiyur',
    2: 'Manali',
    3: 'Madhavaram',
    4: 'Tondiarpet',
    5: 'Royapuram',
    6: 'Thiru-Vi-Ka Nagar',
    7: 'Ambattur',
    8: 'Anna Nagar',
    9: 'Teynampet',
    10: 'Kodambakkam',
    11: 'Valasaravakkam',
    12: 'Alandur',
    13: 'Adyar',
    14: 'Perungudi',
    15: 'Sholinganallur'
}

def get_zone_for_ward(w):
    if 1 <= w <= 14: return 1
    if 15 <= w <= 21: return 2
    if 22 <= w <= 33: return 3
    if 34 <= w <= 48: return 4
    if 49 <= w <= 63: return 5
    if 64 <= w <= 78: return 6
    if 79 <= w <= 93: return 7
    if 94 <= w <= 108: return 8
    if 109 <= w <= 126: return 9
    if 127 <= w <= 142: return 10
    if 143 <= w <= 155: return 11
    if 156 <= w <= 167: return 12
    if 168 <= w <= 180: return 13
    if 181 <= w <= 191: return 14
    if 192 <= w <= 200: return 15
    return None

def main():
    print("=== Step 1: Parsing GCC CDMP 2023 PDF ===")
    pdf_path = r'C:\Users\rsiva\Downloads\1f1d8ea7-9164-4119-ada6-32b47da15046.pdf'
    doc = fitz.open(pdf_path)
    print(f"Loaded PDF with {len(doc)} pages.")

    # Initialize all 200 wards
    ward_contacts = {}
    for w in range(1, 201):
        z = get_zone_for_ward(w)
        ward_contacts[w] = {
            'ward': w,
            'zone': z,
            'zoneName': ZONE_NAMES.get(z, f'Zone {z}'),
            'councillorMobile': f'9445467{w:03d}',
            'gccAeMobile': None,
            'gccElecMobile': None,
            'cmwssbAeMobile': None,
            'tangedcoAeMobile': None,
            'policeMobile': None,
            'fireMobile': None
        }

    for pno in range(len(doc)):
        text = doc[pno].get_text()
        if 'Ward committee' not in text and 'Ward Committee' not in text:
            continue
        
        parts = re.split(r'Ward\s+committee\s*[\-\–\—\:\?]?\s*', text, flags=re.IGNORECASE)
        for part in parts[1:]:
            m_num = re.match(r'^\s*(\d{1,3})', part)
            if not m_num:
                continue
            w_num = int(m_num.group(1))
            if not (1 <= w_num <= 200):
                continue
            
            info = ward_contacts[w_num]
            lines = [l.strip() for l in part.splitlines() if l.strip()]
            
            c_match = re.search(r'Councillor\s*[\-\–\—\:\?]?\s*(\d{10})', part, re.IGNORECASE)
            if c_match:
                info['councillorMobile'] = c_match.group(1)
                
            for i, l in enumerate(lines):
                # CMWSSB
                if 'CMWSSB' in l.upper():
                    for sub in lines[i+1:i+6]:
                        num_match = re.search(r'\b(8\d{9}|9\d{9})\b', sub)
                        if num_match:
                            info['cmwssbAeMobile'] = num_match.group(1)
                            break
                # TANGEDCO
                if 'TANGEDCO' in l.upper() or 'EB' in l.upper():
                    for sub in lines[i+1:i+6]:
                        num_match = re.search(r'\b(94458\d{5}|9\d{9})\b', sub)
                        if num_match:
                            info['tangedcoAeMobile'] = num_match.group(1)
                            break
                # GCC Engineering AE
                if 'GCC -  ENGINEERING' in l.upper() or 'GCC - ENGINEERING' in l.upper():
                    for sub in lines[i+1:i+5]:
                        num_match = re.search(r'\b(94451\d{5}|9\d{9})\b', sub)
                        if num_match:
                            info['gccAeMobile'] = num_match.group(1)
                            break
                # GCC Electrical
                if 'GCC - ELECTRICAL' in l.upper() or 'ELECTRICAL' in l.upper():
                    for sub in lines[i+1:i+5]:
                        num_match = re.search(r'\b(94451\d{5}|94454\d{5}|94450\d{5}|9\d{9})\b', sub)
                        if num_match and not info['gccElecMobile']:
                            info['gccElecMobile'] = num_match.group(1)
                            break
                # Police
                if 'POLICE' in l.upper():
                    for sub in lines[i+1:i+5]:
                        num_match = re.search(r'\b(8\d{9}|9\d{9}|044\d{7,8})\b', sub)
                        if num_match and not info['policeMobile']:
                            info['policeMobile'] = num_match.group(1)
                            break
                # Fire Service
                if 'FIRE' in l.upper():
                    for sub in lines[i+1:i+5]:
                        num_match = re.search(r'\b(9\d{9}|8\d{9}|101)\b', sub)
                        if num_match and not info['fireMobile']:
                            info['fireMobile'] = num_match.group(1)
                            break

    # Apply standard helplines for any missing contacts
    for w, d in ward_contacts.items():
        if not d['cmwssbAeMobile']:
            d['cmwssbAeMobile'] = '044-45674567' # CMWSSB 24x7 Central Helpline
        if not d['gccAeMobile']:
            d['gccAeMobile'] = '1913' # GCC Central Disaster Helpline (Ripon Building)
        if not d['tangedcoAeMobile']:
            d['tangedcoAeMobile'] = '9498794987' # Minnagam TANGEDCO Central 24x7

    print("=== Step 2: Loading GEE Satellite & Relief Shelters Data ===")
    with open('data-archive/data/gee_chennai_wards_vulnerability.json', 'r', encoding='utf-8') as f:
        gee_raw = json.load(f)
    
    gee_by_ward = {}
    for entry in gee_raw.get('wards', []):
        w_id = int(entry['ward_number'])
        gee_by_ward[w_id] = entry

    with open('data-archive/data/gcc_relief_centers.json', 'r', encoding='utf-8') as f:
        shelters_raw = json.load(f)
    
    shelters_by_ward = Counter()
    for s in shelters_raw:
        try:
            w_num = int(s.get('ward', 0))
            if 1 <= w_num <= 200:
                shelters_by_ward[w_num] += 1
        except (ValueError, TypeError):
            continue

    print(f"Loaded GEE stats for {len(gee_by_ward)} wards, Relief Shelters across {len(shelters_by_ward)} wards.")

    # Combine into unified Ward Disaster Directory
    ward_directory = []
    for w in range(1, 201):
        contacts = ward_contacts[w]
        gee = gee_by_ward.get(w, {})
        shelter_count = shelters_by_ward[w]

        ward_directory.append({
            'ward': w,
            'zone': contacts['zone'],
            'zoneName': contacts['zoneName'],
            'councillorMobile': contacts['councillorMobile'],
            'gccAeMobile': contacts['gccAeMobile'],
            'gccElecMobile': contacts['gccElecMobile'],
            'cmwssbAeMobile': contacts['cmwssbAeMobile'],
            'tangedcoAeMobile': contacts['tangedcoAeMobile'],
            'policeMobile': contacts.get('policeMobile'),
            'fireMobile': contacts.get('fireMobile'),
            'reliefSheltersCount': shelter_count,
            'geeRunoffMm': gee.get('simulated_surface_runoff_mm', 0),
            'geeImperviousPct': gee.get('urban_impervious_built_pct', 0),
            'geeElevationMeanM': gee.get('elevation_mean_m', 0),
            'geeFloodCategory': gee.get('flood_risk_category', 'UNKNOWN'),
            'geeFloodScore': gee.get('ward_flood_risk_score', 0)
        })

    os.makedirs('src/data', exist_ok=True)
    with open('src/data/gcc_ward_disaster_directory.json', 'w', encoding='utf-8') as f:
        json.dump({
            'version': '1.4.0',
            'source': 'Greater Chennai Corporation City Disaster Management Plan 2023 & Google Earth Engine 200-Wards Satellite Stack',
            'totalWards': 200,
            'totalShelters': len(shelters_raw),
            'wards': ward_directory
        }, f, indent=2, ensure_ascii=False)
    print("Saved src/data/gcc_ward_disaster_directory.json.")

    print("=== Step 3: Spatial Containment Join with GCC Ward Polygons ===")
    with open('data-archive/data/gcc_wards_polygons.json', 'r', encoding='utf-8') as f:
        poly_geojson = json.load(f)

    # Build shapely geometries
    ward_geoms = []
    for feat in poly_geojson['features']:
        w_id = int(feat['properties']['ward'])
        geom = shape(feat['geometry'])
        ward_geoms.append((w_id, geom))

    print(f"Built {len(ward_geoms)} ward boundary geometries.")

    def find_ward(lng, lat):
        pt = Point(lng, lat)
        for w_id, geom in ward_geoms:
            if geom.contains(pt):
                return w_id
        # Fallback to buffer distance if point sits right on the boundary edge
        for w_id, geom in ward_geoms:
            if geom.distance(pt) < 0.001: # ~100m
                return w_id
        return None

    print("=== Step 4: Enriching chennai_tneb_grid.json ===")
    with open('public/data/chennai_tneb_grid.json', 'r', encoding='utf-8') as f:
        grid_data = json.load(f)

    ward_dir_map = {w['ward']: w for w in ward_directory}

    ss_inside_count = 0
    sec_inside_count = 0

    # Enrich substations
    for ss in grid_data['substations']:
        lat = ss.get('lat')
        lng = ss.get('lng')
        if lat and lng:
            w_id = find_ward(lng, lat)
            if w_id and w_id in ward_dir_map:
                w_info = ward_dir_map[w_id]
                ss['gccZone'] = w_info['zone']
                ss['gccZoneName'] = w_info['zoneName']
                ss['gccWard'] = w_id
                ss['geeFloodCategory'] = w_info['geeFloodCategory']
                ss['geeRunoffMm'] = w_info['geeRunoffMm']
                ss['geeImperviousPct'] = w_info['geeImperviousPct']
                ss['wardCouncillorMobile'] = w_info['councillorMobile']
                ss['wardCmwssbMobile'] = w_info['cmwssbAeMobile']
                ss['wardTangedcoMobile'] = w_info['tangedcoAeMobile']
                ss['wardGccAeMobile'] = w_info['gccAeMobile']
                ss['wardReliefSheltersCount'] = w_info['reliefSheltersCount']
                ss_inside_count += 1
            else:
                ss['gccZoneName'] = 'Peri-Urban CMA Grid'
                ss['geeFloodCategory'] = 'REGIONAL_SURGE_CORRIDOR'

        # Enrich feeders for CMWSSB Sewage Pumping and Relief Shelters
        sps_patterns = [r'sewage', r'drainage', r'pumping', r'cmwssb', r'metro\s*water', r'\bsps\b', r'stp\b', r'water\s*works']
        shelter_patterns = [r'school', r'college', r'relief', r'community\s*hall', r'kalyana\s*mandapam', r'camp', r'shelter']

        for f in ss.get('feeders', []):
            name = f.get('name', '')
            if any(re.search(p, name, re.I) for p in sps_patterns):
                f['isCmwssbSps'] = True
                f['lifelineCategory'] = 'water'
                f['priorityLevel'] = 'P1_NON_CUT'
            if any(re.search(p, name, re.I) for p in shelter_patterns):
                f['isGccShelterFeed'] = True
                f['lifelineCategory'] = 'governance'
                f['priorityLevel'] = 'P1_CRITICAL'

    # Enrich section offices
    for sec in grid_data['sections']:
        lat = sec.get('lat')
        lng = sec.get('lng')
        if lat and lng:
            w_id = find_ward(lng, lat)
            if w_id and w_id in ward_dir_map:
                w_info = ward_dir_map[w_id]
                sec['gccZone'] = w_info['zone']
                sec['gccZoneName'] = w_info['zoneName']
                sec['gccWard'] = w_id
                sec['geeFloodCategory'] = w_info['geeFloodCategory']
                sec['geeRunoffMm'] = w_info['geeRunoffMm']
                sec['geeImperviousPct'] = w_info['geeImperviousPct']
                sec['wardCouncillorMobile'] = w_info['councillorMobile']
                sec['wardCmwssbMobile'] = w_info['cmwssbAeMobile']
                sec['wardTangedcoMobile'] = w_info['tangedcoAeMobile']
                sec['wardGccAeMobile'] = w_info['gccAeMobile']
                sec['wardReliefSheltersCount'] = w_info['reliefSheltersCount']
                sec_inside_count += 1
            else:
                sec['gccZoneName'] = 'Peri-Urban CMA Grid'
                sec['geeFloodCategory'] = 'REGIONAL_SURGE_CORRIDOR'

    print(f"Mapped {ss_inside_count}/{len(grid_data['substations'])} substations into GCC 200 Wards.")
    print(f"Mapped {sec_inside_count}/{len(grid_data['sections'])} section offices into GCC 200 Wards.")

    with open('public/data/chennai_tneb_grid.json', 'w', encoding='utf-8') as f:
        json.dump(grid_data, f, indent=2, ensure_ascii=False)
    print("Saved public/data/chennai_tneb_grid.json successfully.")

if __name__ == '__main__':
    main()
