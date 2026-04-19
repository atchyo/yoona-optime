# yoona-app

Opti-Me family medication care web app for GitHub Pages.

The V2 app focuses on taking a medication bag/label photo, running browser OCR,
matching the detected drug name against trusted medication databases, and storing
the result under a family profile.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app is configured for GitHub Pages at `/yoona-app/`.

## Supabase

The app works in demo mode without Supabase credentials. To enable real auth and
backend storage, create a Supabase project and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Apply the schema in `supabase/migrations`, then deploy the Edge Functions in
`supabase/functions`.

Secrets for server-side drug database lookup must be configured in Supabase Edge
Functions, not in the browser:

```bash
DATA_GO_KR_SERVICE_KEY=...
```

## Data Sources

- MFDS drug product permission API for Korean product/ingredient data.
- MFDS e약은요 API for consumer-friendly usage, warning, interaction, and storage text.
- RxNorm, DailyMed, and openFDA for US or overseas lookup fallback.

## Safety

Opti-Me does not replace medical advice. It stores medication records, highlights
possible duplicate ingredients or caution text, and encourages users to confirm
unclear cases with a pharmacist or doctor.
