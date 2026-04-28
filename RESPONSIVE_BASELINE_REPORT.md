# Dashboard v2 Responsive Layout Rebuild Pass 13

Checked on: 2026-04-28 KST

## Scope

This pass focused only on the Dashboard v2 home screen desktop-light responsive
baseline.

No new feature logic, database, auth, backend, payment, dark mode, mobile polish,
or broad menu-screen work was performed. The existing Dashboard v2 visual
direction, colors, cards, icons, and information structure were kept.

## Diagnosis

The dashboard looked acceptable at `1920x1080` because the `1800px+` wide
desktop rules were active. That viewport had enough dashboard width for a
312px sidebar, 4 summary columns, 2-column main content, and a 3-column lower
grid.

At `1512px` and `1440px`, the earlier responsive structure was too close to the
wide layout:

- Summary cards were still trying to fit into one row.
- The CTA inside each summary card competed with Korean title/value text.
- Lower cards still behaved like a 3-column desktop layout, which squeezed the
AI chat preview.
- The old wide-readable assumptions were effectively tied to `1800px+`, leaving
real MacBook-style desktop widths under-served.

## Breakpoints

Dashboard v2 now treats real desktop widths as first-class verification targets:

- Wide desktop: `1800px+`.
- Standard desktop: `1440px-1799px`.
- Compact desktop: `1280px-1439px`.
- Tablet-like desktop: `1024px-1279px`, still left for a later focused pass.

Readable scale is no longer documented as an `1800px+`-only concern. The
standard desktop tier uses readable typography while adapting grids to the
available width.

## Layout Changes

### Sidebar Width

- Wide desktop (`1800px+`): `312px`.
- Standard desktop (`1440px-1799px`): `276px`.
- Compact desktop (`1280px-1439px`): `248px`.

The standard desktop width keeps the Opti-Me brand and menu readable without
starving the dashboard cards.

### Main Content Padding

Dashboard v2 content padding is controlled by `.dashboard-v2-shell` variables:

- Wide desktop: `44px 36px 34px 34px`.
- Standard desktop: `40px 28px 32px 28px`.
- Compact desktop: `36px 24px 30px 24px`.

The large right padding from the older desktop rule no longer applies at 1512px.

### Summary Grid

- Wide desktop: 4 columns.
- Standard desktop: 2 columns x 2 rows.
- Compact desktop: 2 columns.

Summary card internals now use a two-column, two-row structure:

```text
icon / title + value
icon / CTA
```

This prevents the CTA from stealing width from Korean labels. Summary titles and
values use `word-break: keep-all`; values and CTA text use `white-space: nowrap`.

Verified no wrapping for:

- `복용중인 약`
- `오늘 복용 예정`
- `주의 상호작용`
- `이번 주 리포트`
- `7개`
- `3개`
- `1건`
- `2개`

### Main Grid

- Wide desktop keeps the schedule card plus right status stack in 2 columns.
- Standard desktop keeps 2 columns with a less aggressive right-column minimum.
- Compact desktop may switch to 1 column for stability.

### Bottom Grid

- Wide desktop keeps recent records, AI consult, and report cards in 3 columns.
- Standard desktop uses 2 columns on the first row:
  - left: recent records
  - right: report card
  - second row: AI consult spans full width
- Compact desktop uses 1 column.

This keeps the AI chat card from being squeezed into a narrow 3-column slot at
1512px and 1440px.

## Namespace Protection

Dashboard home rules remain in `.dv2-*`.

Core menu scaffold rules remain in `.core-*`.

This pass did not add broad selectors such as `.card`, `.title`, `.button`,
`.page`, `.header`, `.sidebar`, or `.grid` to control Dashboard v2 behavior.
Other menu scaffold screens were not polished in this pass and should not alter
`.dv2-*` layout rules.

## Local Verification

All local screenshots used light mode with a demo local user.

### 1440x900 CSS Viewport

- `window.innerWidth`: `1440`
- `window.innerHeight`: `900`
- `window.devicePixelRatio`: `2`
- Active tier: standard desktop (`1440px-1799px`)
- Sidebar width: `276px`
- Dashboard width: `1108px`
- Summary grid: `545px 545px`
- Summary card layout: 2 columns x 2 rows
- Main grid: `597.297px 488.688px`
- Lower grid: `543px 543px`, AI card spans full second row
- AI card width: `1108px`
- Horizontal overflow: no
- Summary title/value wrapping: no
- Screenshot: `screenshots/dashboard-v2-desktop-1440.png`
- Saved size: `2880x1800`

### 1512x982 CSS Viewport

- `window.innerWidth`: `1512`
- `window.innerHeight`: `982`
- `window.devicePixelRatio`: `2`
- Active tier: standard desktop (`1440px-1799px`)
- Sidebar width: `276px`
- Dashboard width: `1180px`
- Summary grid: `581px 581px`
- Summary card layout: 2 columns x 2 rows
- Main grid: `636.891px 521.109px`
- Lower grid: `579px 579px`, AI card spans full second row
- AI card width: `1180px`
- Horizontal overflow: no
- Summary title/value wrapping: no
- Screenshot: `screenshots/dashboard-v2-desktop-1512.png`
- Saved size: `3024x1964`

### 1920x1080 CSS Viewport, DPR 2

- `window.innerWidth`: `1920`
- `window.innerHeight`: `1080`
- `window.devicePixelRatio`: `2`
- Active tier: wide desktop (`1800px+`)
- Sidebar width: `312px`
- Dashboard width: `1538px`
- Summary grid: `369.5px` x 4
- Summary card layout: 4 columns
- Main grid: `832.688px 681.312px`
- Lower grid: `562.438px 463.781px 463.766px`
- Horizontal overflow: no
- Summary title/value wrapping: no
- Screenshot: `screenshots/dashboard-v2-desktop-4k.png`
- Saved size: `3840x2160`

### 1920x1080 CSS Viewport, DPR 1

- `window.innerWidth`: `1920`
- `window.innerHeight`: `1080`
- `window.devicePixelRatio`: `1`
- Active tier: wide desktop (`1800px+`)
- Screenshot: `screenshots/dashboard-v2-desktop-standard.png`
- Saved size: `1920x1080`

### Close-up Screenshots

- Summary close-up: `screenshots/dashboard-v2-summary-closeup.png`
  - Saved size: `2392x514`
  - Confirms all four summary cards use 2x2 layout at 1512px.
- Bottom grid close-up: `screenshots/dashboard-v2-bottom-grid-closeup.png`
  - Saved size: `2360x1090`
  - Confirms recent/report share row one and AI consult spans row two at 1512px.

## Build / Test

- `npm run build`: passed.
- `npm run lint`: not available in `package.json`.
- `npm run typecheck`: not available in `package.json`; TypeScript checking runs as
  part of `npm run build` via `tsc -b`.

## Production Status

Pushed to `origin/main` after local responsive verification and build passed.

- Responsive code commit pushed: `9be5466`
- Deployment verification report commit pushed: `8da03e1`
- Production URL checked: `https://optime.jeongung.cloud/`
- Live assets confirmed:
  - `/assets/index-v9M4PRI0.js`
  - `/assets/index-BpLqe4VZ.css`
- Production viewport probe:
  - `window.innerWidth`: `1512`
  - `window.innerHeight`: `982`
  - `window.devicePixelRatio`: `2`
  - Final URL without a signed-in session: `https://optime.jeongung.cloud/login`
  - Login screen visible: yes
  - Dashboard DOM visible without session: no

The production deployment is serving the new responsive build assets. The home
dashboard itself requires an authenticated production session, so unauthenticated
automation could verify the deployed bundle and login routing but could not
inspect the signed-in Dashboard v2 DOM on the production domain.

## Remaining Issues

- At 1440px and 1512px the home dashboard is vertically scrollable. This is
  acceptable for the responsive desktop baseline, because the card layout no
  longer breaks and horizontal overflow is gone.
- Other core menu scaffold screens were intentionally left out of this pass.
- Tablet-like desktop and mobile need separate focused passes.
