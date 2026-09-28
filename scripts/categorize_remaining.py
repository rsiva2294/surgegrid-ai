"""Categorize remaining 21 unmapped records into recoverable vs unresolvable."""
import json

with open('data/chennai_abstract_outages_resolved_with_gold.json', 'r', encoding='utf-8') as f:
    doc = json.load(f)

outages = doc['outages']
remaining = [o for o in outages if o.get('mappingStatus') != 'VERIFIED_ASSET']

# Load gold registry for substation catalog
with open('public/data/chennai_outage_gold_registry.json', 'r', encoding='utf-8') as f:
    registry = json.load(f)

# Build section -> substations mapping from registry
section_to_ss = {}
for sig_key, sig in registry['signatures'].items():
    sec = sig.get('secName', '')
    ss = sig.get('ssName', '')
    if sec and ss:
        sec_lower = sec.lower().strip()
        if sec_lower not in section_to_ss:
            section_to_ss[sec_lower] = set()
        section_to_ss[sec_lower].add(ss)

# Categories
recoverable_via_section = []  # Have section, can map to SS via registry
has_ss_from_gemini = []       # Gemini found SS but we didn't match
truly_street_level = []       # No SS, no clear section-to-SS path

for o in remaining:
    gem = o.get('gemini_enrichment', {})
    gemini_ss = gem.get('substation_name')
    cause = o.get('cause', '')
    area = o.get('area', '')
    
    # Check if resolved section exists
    resolved_sec = o.get('resolvedSection', {})
    sec_name = resolved_sec.get('name', '') if resolved_sec else ''
    
    # Also check cause text for section mentions
    cause_lower = cause.lower()
    matched_sections = []
    for sec_key in section_to_ss:
        # Extract just the section name part
        sec_base = sec_key.replace(' section', '').replace('ae/o&m ', '').strip()
        if sec_base and len(sec_base) > 3 and sec_base in cause_lower:
            matched_sections.append((sec_key, section_to_ss[sec_key]))
    
    if gemini_ss and gemini_ss != 'None':
        has_ss_from_gemini.append(o)
    elif matched_sections or (sec_name and sec_name.lower().strip() in section_to_ss):
        recoverable_via_section.append((o, matched_sections or [(sec_name.lower().strip(), section_to_ss.get(sec_name.lower().strip(), set()))]))
    else:
        truly_street_level.append(o)

print("=" * 80)
print("ABSTRACT OUTAGE RECOVERY ANALYSIS")
print("=" * 80)

print(f"\n✅ CATEGORY A: Gemini already identified SS ({len(has_ss_from_gemini)} records)")
print("   These have a substation name from Gemini but didn't match our registry.")
print("   ACTION: 2nd pass with fuzzy matching + expanded alias table.")
for o in has_ss_from_gemini:
    gem = o.get('gemini_enrichment', {})
    print(f"   [{o['outage_id'][:30]}] Gemini SS: {gem.get('substation_name')} | {o.get('cause', '')[:60]}")

print(f"\n🔄 CATEGORY B: Recoverable via Section→SS mapping ({len(recoverable_via_section)} records)")
print("   These mention a section that maps to known substations in our registry.")
for o, secs in recoverable_via_section:
    for sec_key, ss_set in secs:
        print(f"   [{o['outage_id'][:30]}] Section: {sec_key} → SS: {', '.join(ss_set)}")
        print(f"      Cause: {o.get('cause', '')[:80]}")

print(f"\n❌ CATEGORY C: True street-level faults ({len(truly_street_level)} records)")
print("   No substation identifiable - these are LT cable/fuse/pillar faults.")
for o in truly_street_level:
    print(f"   [{o['outage_id'][:30]}] {o.get('area')} | {o.get('cause', '')[:70]}")

print(f"\n{'='*80}")
print(f"SUMMARY:")
print(f"  Total remaining: {len(remaining)}")
print(f"  Recoverable (A+B): {len(has_ss_from_gemini) + len(recoverable_via_section)}")
print(f"  Unresolvable (C): {len(truly_street_level)}")
print(f"  Potential new coverage: {771 + len(has_ss_from_gemini) + len(recoverable_via_section)}/{len(outages)} = {(771 + len(has_ss_from_gemini) + len(recoverable_via_section))/len(outages)*100:.1f}%")
