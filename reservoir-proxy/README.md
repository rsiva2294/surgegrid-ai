# reservoir-proxy

Cloud Function `surgegridReservoirs` (Node 22, gen2, region `asia-south1`, project `namma-map-407ca`).
It reads the CMWSSB Lake Level page (`https://cmwssb.tn.gov.in/lake-level`), which has no API and no CORS headers,
and returns the reservoir table as JSON for the LIVE-mode pill in the SurgeGrid AI app. Figures pass through unchanged.

- `GET` only, from allowed website origins (localhost:5173 and the `surgegrid` Hosting site; add more with `ALLOWED_ORIGINS`).
  A request with no `Origin` header (same-origin through Hosting) is allowed.
- One upstream fetch per 30 minutes per instance; the last good copy is served for up to 24 hours if CMWSSB is down.
- Returns 502 if the page layout is not the expected one (it checks the table header), so the app hides the pill instead of showing wrong numbers.
- The app calls `/api/reservoirs`, which Vite proxies in development and Firebase Hosting rewrites in production.

## Run locally

```bash
cd reservoir-proxy && npm install && npx functions-framework --target=surgegridReservoirs --port=8091
```

## Deploy

```bash
gcloud functions deploy surgegridReservoirs --gen2 --project namma-map-407ca --region asia-south1   --runtime nodejs22 --source ./reservoir-proxy --entry-point surgegridReservoirs --trigger-http --allow-unauthenticated   --max-instances 2 --memory 256Mi --timeout 30s
```

Deploy Firebase Hosting afterwards so the `/api/reservoirs` rewrite in `firebase.json` goes live.
