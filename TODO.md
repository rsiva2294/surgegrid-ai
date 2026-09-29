# SurgeGrid AI — Action Items & Upstream To-Do

## Upstream Cloud Function Notice Deduplication

- [ ] **Target Repository:** `C:\projects\nammamap-v2\tneb-outage\nammamap-outage-aggregator`
- [ ] **Target File:** [`functions/src/utils/crossDeduplicator.ts`](file:///C:/projects/nammamap-v2/tneb-outage/nammamap-outage-aggregator/functions/src/utils/crossDeduplicator.ts)
- [ ] **Cloud Function:** `outageApi` (deployed on project `namma-map-407ca`, serving `https://outage.nammamap.in/api/v2/outages`)

### Problem
The upstream API `/api/v2/outages` merges web portal notices with official Twitter flyers. While it deduplicates Twitter flyers against web notices, it currently does **not** deduplicate duplicate web portal notices against each other if multiple scraper runs ingest the same notice. This caused 6 duplicate notice objects with identical fingerprints in the 2026-09-29 payload.

### Current Mitigation in SurgeGrid AI
SurgeGrid AI's [`src/services/liveOutageService.ts`](file:///c:/projects/surgegrid-ai/src/services/liveOutageService.ts) has client-side fingerprint deduplication active in `getLiveChennaiOutages()`, so the client application is already fully protected.

### Required Upstream Change
In `C:\projects\nammamap-v2\tneb-outage\nammamap-outage-aggregator\functions\src\utils\crossDeduplicator.ts`, update `deduplicateAndMergeOutages()`:

```typescript
export function deduplicateAndMergeOutages(webOutages: any[], twitterNotices: any[]): CrossDedupResult {
  // 1. Deduplicate web outages by fingerprint to eliminate scraper re-run duplicate notices
  const seenWebFp = new Set<string>();
  const uniqueWebOutages = (webOutages || []).filter(w => {
    if (!w) return false;
    const fp = w.outageFingerprint || w.fingerprint || w.id || `${w.substation}_${w.feeder}_${w.date}_${w.fromTime}`;
    if (seenWebFp.has(fp)) return false;
    seenWebFp.add(fp);
    return true;
  });

  const mergedWeb = uniqueWebOutages.map(w => ({ ...w }));
  const standaloneTwitter: any[] = [];
  let duplicatesCount = 0;

  for (const t of (twitterNotices || [])) {
    if (!t) continue;
    const matchedWeb = mergedWeb.find(w => isDuplicateOutage(w, t));
    if (matchedWeb) {
      mergeTwitterIntoWebOutage(matchedWeb, t);
      duplicatesCount++;
    } else {
      standaloneTwitter.push(t);
    }
  }

  // 2. Final deduplication across combined set by fingerprint
  const seenCombinedFp = new Set<string>();
  const combinedOutages: any[] = [];
  for (const o of [...mergedWeb, ...standaloneTwitter]) {
    const fp = o.outageFingerprint || o.fingerprint || o.id || `${o.substation}_${o.feeder}_${o.date}_${o.fromTime}`;
    if (!seenCombinedFp.has(fp)) {
      seenCombinedFp.add(fp);
      combinedOutages.push(o);
    }
  }

  return {
    combinedOutages,
    duplicatesCount,
    standaloneTwitterCount: standaloneTwitter.length
  };
}
```

### Build & Deploy Instructions
From a terminal in the aggregator project:
```powershell
cd C:\projects\nammamap-v2\tneb-outage\nammamap-outage-aggregator\functions
npm run build
firebase deploy --only functions:outageApi
```
