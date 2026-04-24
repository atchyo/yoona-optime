# yoona-optime

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

The app is configured for a root-domain deployment such as `https://optime.jeongung.cloud/`.

## Supabase

The app works in demo mode without Supabase credentials. To enable real auth and
backend storage, create a Supabase project and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

For GitHub Pages production builds, the app can also read these public browser
values from `.env.production`. Only the publishable browser key belongs there;
never put `service_role` or other server secrets in a Vite env file.

Apply the schema in `supabase/migrations`, then deploy the Edge Functions in
`supabase/functions`.

Secrets for server-side drug database lookup must be configured in Supabase Edge
Functions, not in the browser:

```bash
DATA_GO_KR_SERVICE_KEY=...
```

### Drug Catalog Batch Sync

Full public-DB indexing should be run as an admin batch job, not from the web UI.
Keep `SUPABASE_SERVICE_ROLE_KEY` on your local machine or a private server only.
Never commit it or put it in a Vite/browser env file.

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
export DATA_GO_KR_SERVICE_KEY=...

npm run sync:drug-catalog -- --source=mfds_health --pages=20
npm run sync:drug-catalog -- --source=mfds_permit --pages=20
npm run sync:drug-catalog -- --source=mfds_easy --pages=20
```

The script also loads `.env.sync` and `.env.sync.local` if present. These files
are gitignored and are meant for local admin secrets only.

Use `--start-page=21` to continue after a partial run. Use `--all-pages` only
when you are ready to let the job run for a long time:

```bash
npm run sync:drug-catalog -- --source=mfds_health --start-page=21 --pages=20
npm run sync:drug-catalog -- --source=all --all-pages
```

## Data Sources

- MFDS drug product permission API for Korean product/ingredient data.
- MFDS e약은요 API for consumer-friendly usage, warning, interaction, and storage text.
- RxNorm, DailyMed, and openFDA for US or overseas lookup fallback.

## Safety

Opti-Me does not replace medical advice. It stores medication records, highlights
possible duplicate ingredients or caution text, and encourages users to confirm
unclear cases with a pharmacist or doctor.
