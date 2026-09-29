/**
 * officialSources.ts
 *
 * Single source of truth for every rule, warning and action the app attributes to an
 * official disaster management plan. Each quote was checked word-for-word against the
 * source PDF text. Nothing in this file is paraphrased or invented.
 *
 * Page numbers: `pdfPage` is the page in a PDF viewer; `printedPage` is the number
 * printed on the page (omitted where the page carries none). The human-readable copy
 * of this list is docs/SOURCES.md.
 */

export type OfficialSourceId = 'MOP_DMP_2021' | 'TANGEDCO_DMP_2017' | 'TN_SDMP_2023' | 'GCC_CDMP_2023';

export interface OfficialSource {
  id: OfficialSourceId;
  shortName: string;
  title: string;
  issuer: string;
  year: number;
}

export const OFFICIAL_SOURCES: Record<OfficialSourceId, OfficialSource> = {
  MOP_DMP_2021: {
    id: 'MOP_DMP_2021',
    shortName: 'MoP Power-Sector DMP 2021',
    title: 'Disaster Management Plan for Power Sector',
    issuer: 'Ministry of Power, Government of India (prepared by Central Electricity Authority)',
    year: 2021,
  },
  TANGEDCO_DMP_2017: {
    id: 'TANGEDCO_DMP_2017',
    shortName: 'TANGEDCO DMP 2017',
    title: 'TANGEDCO Disaster Management Plan (Version 3.0)',
    issuer: 'Tamil Nadu Generation and Distribution Corporation Limited',
    year: 2017,
  },
  TN_SDMP_2023: {
    id: 'TN_SDMP_2023',
    shortName: 'TN SDMP 2023',
    title: 'State Disaster Management Plan 2023 (Volume II)',
    issuer: 'Tamil Nadu State Disaster Management Authority',
    year: 2023,
  },
  GCC_CDMP_2023: {
    id: 'GCC_CDMP_2023',
    shortName: 'GCC City DMP 2023',
    title: 'City Disaster Management Perspective Plan 2023',
    issuer: 'Greater Chennai Corporation',
    year: 2023,
  },
};

export type OfficialTopic =
  | 'STANDBY_RESOURCES'
  | 'FLOOD_PREPARATION'
  | 'DEWATERING'
  | 'SUPPLY_SWITCH_OFF'
  | 'RECHARGE_SAFETY'
  | 'RESTORATION_PRIORITY'
  | 'HARDENING'
  | 'PAST_EVENT'
  | 'CONTEXT';

export interface OfficialRule {
  id: string;
  topic: OfficialTopic;
  /** Word-for-word text from the source. */
  quote: string;
  sourceId: OfficialSourceId;
  pdfPage: number;
  printedPage?: number;
  /** Set when the quote runs onto the next page. */
  endPdfPage?: number;
  endPrintedPage?: number;
  /** Section or table heading in the source, where one applies. */
  section?: string;
}

export const OFFICIAL_RULES: OfficialRule[] = [
  // ---- Cyclone alert actions (MoP) ----
  {
    id: 'mop-diesel-7-days',
    topic: 'STANDBY_RESOURCES',
    quote:
      'Adequate diesel shall be kept to run Substation DG set continuously for 7 days at Substations which are likely to be affected by the cyclone/tsunami.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.2 Cyclone/Tsunamis',
  },
  {
    id: 'mop-check-inventories',
    topic: 'STANDBY_RESOURCES',
    quote:
      'Inventories at places near to likely cyclone/tsunami affected areas shall be checked and additional inventories shall be arranged, if required.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.2 Cyclone/Tsunamis',
  },
  {
    id: 'mop-move-ers-towers',
    topic: 'STANDBY_RESOURCES',
    quote: 'The ERS towers shall be moved to the nearest Substation of likely affected area to save transportation time.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.2 Cyclone/Tsunamis',
  },
  {
    id: 'mop-deploy-manpower',
    topic: 'STANDBY_RESOURCES',
    quote: 'Expert manpower shall be deployed to the nearest station of likely affected area.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.2 Cyclone/Tsunamis',
  },

  // ---- Flood alert actions (MoP) ----
  {
    id: 'mop-identify-flood-prone',
    topic: 'FLOOD_PREPARATION',
    quote: 'Flood prone locations where substations, towers and buildings etc. are located shall be identified.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.3 Floods/cloud burst/urban flood',
  },
  {
    id: 'mop-dewatering-pump-arranged',
    topic: 'DEWATERING',
    quote: 'Adequate de-watering pump shall be arranged.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.3 Floods/cloud burst/urban flood',
  },
  {
    id: 'mop-trigger-mechanism',
    topic: 'FLOOD_PREPARATION',
    quote: 'The trigger mechanism shall be established to initiate the action plan.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 246,
    printedPage: 245,
    section: '8.3.3 Floods/cloud burst/urban flood',
  },
  {
    id: 'mop-switch-off-if-required',
    topic: 'SUPPLY_SWITCH_OFF',
    quote: 'The power supply should be switched off, if required, to avoid electrocution and other damages.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 247,
    printedPage: 246,
    section: '8.3.3 Floods/cloud burst/urban flood',
  },
  {
    id: 'mop-dewatering-pumps-needed',
    topic: 'DEWATERING',
    quote: 'Availability of de-watering pumps is therefore considered necessary for stations located in flood-prone areas.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 233,
    printedPage: 232,
    section: 'De-watering Pumps',
  },
  {
    id: 'mop-mobile-dg-sets',
    topic: 'DEWATERING',
    quote:
      'A sufficient number of mobile DG sets should be available and should be moved immediately to provide emergency relief and for operating the dewatering pumps.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 233,
    printedPage: 232,
    section: 'Mobile DG sets',
  },

  // ---- Restoration (MoP) ----
  {
    id: 'mop-restore-priority',
    topic: 'RESTORATION_PRIORITY',
    quote:
      'The power supply of vital installations e.g. Drainage pumping stations, drinking water supply plants, hospitals, post offices, banks, government offices and residential complexes should be restored on a priority basis.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 240,
    printedPage: 239,
    section: '8.2.5.1.4 Restoration of Distribution Networks',
  },
  {
    id: 'mop-emergency-operation-centre',
    topic: 'RESTORATION_PRIORITY',
    quote:
      'Every distribution company must build up Emergency Operation Centre (EOC) with full logistics, conventional and alternative communication systems and connectivity with external authorities for assistance and support.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 240,
    printedPage: 239,
    section: '8.2.5.1.4 Restoration of Distribution Networks',
  },
  {
    id: 'mop-mobile-substation-12-24h',
    topic: 'RESTORATION_PRIORITY',
    quote:
      'Mobile Substation deployment capability is a major advantage to utilities as it can be used to restore power supply in disaster affected areas in 12-24 hours, which otherwise may take several days to weeks.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 240,
    printedPage: 239,
    section: 'Mobile Substation',
  },

  // ---- Hardening (MoP) ----
  {
    id: 'mop-underground-in-cyclone-areas',
    topic: 'HARDENING',
    quote:
      'the existing overhead distribution system should be replaced with the underground cable system in cyclone-prone areas.',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 112,
    printedPage: 111,
    section: '6.1.2.1 Cyclone',
  },
  {
    id: 'mop-raised-platform',
    topic: 'HARDENING',
    quote: 'Construction of building, substations on a raised platform',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 127,
    printedPage: 126,
    section: '6.2 General Recommendations for Building Resilience',
  },
  {
    id: 'mop-floodwalls',
    topic: 'HARDENING',
    quote: 'Floodwalls can be established around the substation',
    sourceId: 'MOP_DMP_2021',
    pdfPage: 148,
    printedPage: 147,
    section: 'Table-12.2.3: Investing in DRR - Structural Measures (Flood)',
  },

  // ---- TANGEDCO 2017 ----
  {
    id: 'tangedco-oh-lines-out-of-service',
    topic: 'SUPPLY_SWITCH_OFF',
    quote:
      'The O/H lines may be kept out of service in the areas likely to be affected by flood to avoid damage due to snapping of conductors, electrocution etc.,',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 77,
    printedPage: 73,
    section: '5.11 Operation coordination, Drills and exercises',
  },
  {
    id: 'tangedco-no-recharge-before-patrol',
    topic: 'RECHARGE_SAFETY',
    quote:
      'Sub-station operators may be instructed not to recharge the lines before the fault is cleared. They should charge the feeders only after ensuring safety of the public after patrolling the feeders.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 77,
    printedPage: 73,
    section: '5.11 Operation coordination, Drills and exercises',
  },
  {
    id: 'tangedco-retaining-wall',
    topic: 'FLOOD_PREPARATION',
    quote:
      'In all outdoor sub-stations, where there is likelihood of floods entering the sub-station, arrangements may be made to provide strong retaining wall or otherwise to prevent possible damages to the sub-station.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 77,
    printedPage: 73,
  },
  {
    id: 'tangedco-pump-out-flood',
    topic: 'DEWATERING',
    quote: 'In case, flood enters the sub-station, it should be arranged to be pumped out quickly to safeguard electrical equipments.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 77,
    printedPage: 73,
    endPdfPage: 78,
    endPrintedPage: 74,
    section: '5.11 Operation coordination, Drills and exercises',
  },
  {
    id: 'tangedco-sandbags',
    topic: 'FLOOD_PREPARATION',
    quote: 'As temporary measures sand bags are kept to avoid water entry.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 78,
    printedPage: 74,
  },
  {
    id: 'tangedco-diesel-pumps-low-lying',
    topic: 'DEWATERING',
    quote: 'also diesel pumps for draining flood water from the Sub-stations which are located in low lying areas.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 78,
    printedPage: 74,
  },
  {
    id: 'tangedco-dewatering-pumps-low-lying',
    topic: 'DEWATERING',
    quote: 'The Sub Stations in low lying area is provided with Dewatering pumps to pump out the flooded water.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 79,
    printedPage: 75,
  },
  {
    id: 'tangedco-restore-priority',
    topic: 'RESTORATION_PRIORITY',
    quote: 'The priority is for Hospitals, drinking water supply, public lighting, community centers where peoples have been safely accommodated.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 79,
    printedPage: 75,
    section: 'Initial assessment of Damages',
  },
  {
    id: 'tangedco-switch-off-or-trip',
    topic: 'SUPPLY_SWITCH_OFF',
    quote: 'Generally power supply is switched off or tripped on protection to ensure safety of public and equipments.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 87,
    printedPage: 83,
    section: 'Part II, Chapter I: Cyclone and Storm',
  },

  // ---- TN SDMP 2023 ----
  {
    id: 'sdmp-disconnect-at-cyclone-strike',
    topic: 'SUPPLY_SWITCH_OFF',
    quote: 'Disconnect power supply at the time of striking of cyclone.',
    sourceId: 'TN_SDMP_2023',
    pdfPage: 154,
    printedPage: 152,
    section: 'Response matrix (responsibility: TANGEDCO)',
  },

  // ---- GCC 2023 ----
  {
    id: 'gcc-cut-off-during-flooding',
    topic: 'SUPPLY_SWITCH_OFF',
    quote: 'Power supply to be cut off during flooding, if required.',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 165,
    printedPage: 147,
    section: 'Mitigation plan: Tamil Nadu Electricity Board',
  },
  {
    id: 'gcc-check-transformers-pillar-boxes',
    topic: 'FLOOD_PREPARATION',
    quote: 'To attend the faults, check transformers and pillar boxes to avoid electrocution.',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 165,
    printedPage: 147,
    section: 'Mitigation plan: Tamil Nadu Electricity Board',
  },
  {
    id: 'gcc-run-dg-set-relief-campus',
    topic: 'STANDBY_RESOURCES',
    quote: 'Run DG set in case of power failure in Relief campus/ UPHC/ govt offices/ schools.',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 156,
    printedPage: 138,
    section: '8.9 Lighting facilities',
  },
  {
    id: 'gcc-generators-sewage-pumping',
    topic: 'STANDBY_RESOURCES',
    quote: 'To ensure working conditions of sewerage pumping stations and to keep generator sets in pumping stations.',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 164,
    printedPage: 146,
  },
  {
    id: 'gcc-rectify-low-lying-cables',
    topic: 'FLOOD_PREPARATION',
    quote: 'Rectify low lying TANGEDCO cables.',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 156,
    printedPage: 138,
    section: '8.9 Lighting facilities',
  },

  // ---- Past events (context only, not actions) ----
  {
    id: 'tangedco-2015-six-feet',
    topic: 'PAST_EVENT',
    quote: 'water flooded in the Substations up to a height of 6 feet',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 37,
    printedPage: 33,
    section: 'Case history: floods of November-December 2015',
  },
  {
    id: 'tangedco-2015-substations-kept-off',
    topic: 'PAST_EVENT',
    quote:
      '22 Nos. substations in Chennai Districts, 13 Nos. substations in Kanchipuram District feeding Chennai area and 6 Nos. substations in Tiruvallur District feeding Chennai area were kept off for safety purposes due to water logging.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 37,
    printedPage: 33,
    section: 'Case history: floods of November-December 2015',
  },
  {
    id: 'tangedco-vardah-cut-off',
    topic: 'PAST_EVENT',
    quote: 'To avoid accidents, as precautionary measure power supply was cut off in many parts.',
    sourceId: 'TANGEDCO_DMP_2017',
    pdfPage: 38,
    printedPage: 34,
    section: 'Case history: Vardah cyclone, 2016',
  },
  {
    id: 'gcc-vardah-fallen-trees',
    topic: 'PAST_EVENT',
    quote: '81 electricity installations were covered with fallen trees which delayed the restoration of power supply',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 54,
    printedPage: 36,
    section: '4.1.2.1 Damages Caused (Vardah, 2016)',
  },
  {
    id: 'gcc-average-elevation',
    topic: 'CONTEXT',
    quote: 'most of the areas are with average elevation of barely 2.0 meters above mean sea level',
    sourceId: 'GCC_CDMP_2023',
    pdfPage: 5,
    section: 'Preface',
  },
];

/** IMD cyclone classes, MoP DMP 2021, Table-4 (PDF p. 73, printed p. 72). Wind speed in km/h. */
export interface ImdCycloneClass {
  name: 'Severe' | 'Very Severe' | 'Extra Severe' | 'Super';
  minKmh: number;
  maxKmh: number | null;
  inundationFromCoast: string;
  damage: string;
}

export const IMD_CYCLONE_CLASSES: ImdCycloneClass[] = [
  { name: 'Severe', minKmh: 88, maxKmh: 117, inundationFromCoast: 'Up to 5 km', damage: 'Moderate' },
  { name: 'Very Severe', minKmh: 118, maxKmh: 167, inundationFromCoast: 'Up to 10 km', damage: 'Large' },
  { name: 'Extra Severe', minKmh: 168, maxKmh: 221, inundationFromCoast: 'Up to 10-15 km', damage: 'Extensive' },
  { name: 'Super', minKmh: 222, maxKmh: null, inundationFromCoast: 'Up to 40 km', damage: 'Catastrophic' },
];

export const IMD_CLASS_CITATION = 'MoP Power-Sector DMP 2021, Table-4, PDF p. 73 (printed p. 72)';

/** Returns the IMD cyclone class for a wind speed, or null when below the lowest listed class (88 km/h). */
export function getImdCycloneClass(windKmh: number): ImdCycloneClass | null {
  const w = Math.abs(windKmh);
  for (let i = IMD_CYCLONE_CLASSES.length - 1; i >= 0; i--) {
    if (w >= IMD_CYCLONE_CLASSES[i].minKmh) return IMD_CYCLONE_CLASSES[i];
  }
  return null;
}

/** IMD four-stage cyclone warning system, TN SDMP 2023 (PDF p. 148, printed p. 146). */
export interface WarningStage {
  name: 'Pre-Cyclone Watch' | 'Cyclone Alert' | 'Cyclone Warning' | 'Post Landfall Outlook';
  hoursBefore: number;
}

export const IMD_WARNING_STAGES: WarningStage[] = [
  { name: 'Pre-Cyclone Watch', hoursBefore: 72 },
  { name: 'Cyclone Alert', hoursBefore: 48 },
  { name: 'Cyclone Warning', hoursBefore: 24 },
  { name: 'Post Landfall Outlook', hoursBefore: 12 },
];

export const WARNING_STAGE_CITATION = 'TN SDMP 2023, Four Stage Warning System, PDF p. 148 (printed p. 146)';

export function getOfficialRule(id: string): OfficialRule | undefined {
  return OFFICIAL_RULES.find(r => r.id === id);
}

export function getRulesByTopic(topic: OfficialTopic): OfficialRule[] {
  return OFFICIAL_RULES.filter(r => r.topic === topic);
}

/** Short citation for display, e.g. "MoP Power-Sector DMP 2021, PDF p. 246 (printed p. 245)". */
export function formatCitation(rule: OfficialRule): string {
  const src = OFFICIAL_SOURCES[rule.sourceId];
  const spans = rule.endPdfPage !== undefined && rule.endPdfPage !== rule.pdfPage;
  const pdf = spans ? `PDF pp. ${rule.pdfPage}-${rule.endPdfPage}` : `PDF p. ${rule.pdfPage}`;
  let printed = '';
  if (rule.printedPage !== undefined) {
    printed = spans && rule.endPrintedPage !== undefined
      ? ` (printed pp. ${rule.printedPage}-${rule.endPrintedPage})`
      : ` (printed p. ${rule.printedPage})`;
  }
  return `${src.shortName}, ${pdf}${printed}`;
}

/**
 * Chennai's average elevation in metres above mean sea level.
 * GCC City DMP 2023, Preface (rule id gcc-average-elevation).
 */
export const CHENNAI_AVERAGE_ELEVATION_M = 2.0;

/** Quote and citation for a rule id, or null if the id is unknown. */
export function getQuote(id: string): { quote: string; citation: string } | null {
  const rule = getOfficialRule(id);
  return rule ? { quote: rule.quote, citation: formatCitation(rule) } : null;
}
