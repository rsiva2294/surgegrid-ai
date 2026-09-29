# gemini-proxy

Cloud Function `surgegridGemini` (Node 22, gen2, region `asia-south1`, project `namma-map-407ca`).
It sits between the SurgeGrid AI browser app and Gemini, so **no Gemini API key exists in the app or in this repo**.

- Calls Gemini 2.5 Flash on Google Cloud's Gemini Enterprise Agent Platform (formerly Vertex AI) using its own
  service account, `surgegrid-gemini-proxy@namma-map-407ca.iam.gserviceaccount.com`, which has only `roles/aiplatform.user`.
- Accepts only `POST` from allowed website origins (localhost:5173 and the `surgegrid` Firebase Hosting site; add more
  with the `ALLOWED_ORIGINS` env var, comma separated).
- Fixes the model, caps request size (30 KB) and output length (4,096 tokens), passes through only whitelisted
  generation settings, rate-limits per IP (120 requests per 5 minutes per instance), and runs at most 3 instances.
- Public URL: `https://asia-south1-namma-map-407ca.cloudfunctions.net/surgegridGemini`.
  The app calls `/api/gemini`, which Vite proxies in development and Firebase Hosting rewrites in production.

## Deploy

```bash
gcloud functions deploy surgegridGemini --gen2 --project namma-map-407ca --region asia-south1 \
  --runtime nodejs22 --source ./gemini-proxy --entry-point surgegridGemini --trigger-http --allow-unauthenticated \
  --service-account surgegrid-gemini-proxy@namma-map-407ca.iam.gserviceaccount.com \
  --max-instances 3 --memory 256Mi --timeout 60s \
  --set-env-vars GEMINI_LOCATION=asia-south1,GCP_PROJECT=namma-map-407ca
```

Deploy Firebase Hosting afterwards so the `/api/gemini` rewrite in `firebase.json` goes live.
