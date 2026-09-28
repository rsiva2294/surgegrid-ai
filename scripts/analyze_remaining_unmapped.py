"""Analyze remaining unmapped/localized abstract outages for a 2nd Gemini pass."""
import json

with open('data/chennai_abstract_outages_resolved_with_gold.json', 'r', encoding='utf-8') as f:
    doc = json.load(f)

outages = doc['outages']
remaining = [o for o in outages if o.get('mappingStatus') != 'VERIFIED_ASSET']

# Already enriched by gemini?
already_gemini = [o for o in remaining if o.get('gemini_enrichment')]
no_gemini = [o for o in remaining if not o.get('gemini_enrichment')]

print(f"Total outages: {len(outages)}")
print(f"VERIFIED_ASSET: {len(outages) - len(remaining)}")
print(f"Remaining non-verified: {len(remaining)}")
print(f"  - Already have gemini_enrichment: {len(already_gemini)}")
print(f"  - No gemini_enrichment yet: {len(no_gemini)}")
print()

# Group by mappingStatus
from collections import Counter
status_counts = Counter(o.get('mappingStatus', 'NONE') for o in remaining)
print("By mappingStatus:")
for s, c in status_counts.most_common():
    print(f"  {s}: {c}")

print("\n--- ALL REMAINING RECORDS ---")
for i, o in enumerate(remaining):
    gem = o.get('gemini_enrichment', {})
    print(f"\n[{i+1}] {o['outage_id']}")
    print(f"    Status: {o.get('mappingStatus')} | Method: {o.get('resolutionMethod')}")
    print(f"    Area: {o.get('area')} | Zone: {o.get('district_or_zone')}")
    print(f"    Cause: {o.get('cause')}")
    if gem:
        print(f"    Gemini SS: {gem.get('substation_name')} | Feeder: {gem.get('feeder_name')}")
        print(f"    Component: {gem.get('component_type')} | Failure: {gem.get('failure_mode')}")
        print(f"    Severity: {gem.get('grid_severity')}")
        print(f"    Explanation: {gem.get('explanation')}")
    else:
        print(f"    [NO GEMINI DATA]")
    if o.get('resolvedSubstation'):
        print(f"    Resolved SS: {o['resolvedSubstation']}")
