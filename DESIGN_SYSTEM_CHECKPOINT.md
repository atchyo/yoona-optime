# Dashboard v2 Design System Checkpoint

## Scope

- Branch: `main`
- Push: not performed
- Production deployment: not touched
- Backend, DB, auth, and payment code: not touched
- UI baseline: current Dashboard v2 desktop light
- Deferred work: dark mode polish, mobile polish, and narrow desktop/tablet responsive refinement

## Main Baseline Status

- `main` now contains the Dashboard v2 checkpoint commits.
- Backup branch already exists: `backup/main-before-dashboard-v2`
- Previous dashboard visual direction is deprecated.
- Dashboard v2 is now treated as the Opti-Me UI baseline for future screen work.

## Documentation Updates

- Updated `docs/UI_GUIDE.md` to describe the current Dashboard v2 design system.
- Added `docs/SCREEN_PATTERN_GUIDE.md` for applying the Dashboard v2 system to other app screens.
- Removed or superseded stale guidance:
  - Original-image recreation criteria
  - Micro Bump Level A typography guidance
  - Fixed `224px` sidebar rule
  - Meaning-based section title color rules
  - Old placeholder / CSS logo rules

## Current UI Rules Captured

- Desktop light is the canonical baseline.
- All section titles use slate text.
- Primary, danger, and success colors are reserved for CTAs, icons, badges, counts, and status expression.
- Sidebar, header, cards, badges, buttons, inputs, avatars, and AI chat bubbles should reuse Dashboard v2 proportions and tokens.
- Dashboard v2 uses `public/assets/opti-me-icon.png` as the sidebar brand icon.
- AI consult cards use the chat-preview bubble pattern.
- Mobile and dark mode are intentionally documented as separate future passes.

## Screen Pattern Guide

`docs/SCREEN_PATTERN_GUIDE.md` now covers:

- List screens
- Detail screens
- Create/edit screens
- Empty states
- Warning/caution cards
- Search/filter areas
- Chat/consultation screens
- Report/document lists
- Status badges

## Verification

- Build command: `npm run build`
- Build result: passed
- Test/lint scripts: no dedicated `test` or `lint` script exists in `package.json`
- Browser verification server:
  - `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --host 127.0.0.1 --port 5176`
  - Supabase env was intentionally blanked only for local visual verification so the demo Dashboard v2 state can render without auth.

## Screenshot

- Updated screenshot: `screenshots/dashboard-v2-desktop-4k.png`
- CSS viewport: `1920x1080`
- Device scale factor: `2`
- Saved image size: `3840x2160`
- Verified Dashboard v2 shell rendered in desktop light mode.

## Notes

- `main` remains local-only for this checkpoint.
- Do not push until the screenshot and checkpoint report are reviewed.
- Next recommended step: use `docs/SCREEN_PATTERN_GUIDE.md` to migrate one secondary menu screen at a time without changing data or backend behavior.
