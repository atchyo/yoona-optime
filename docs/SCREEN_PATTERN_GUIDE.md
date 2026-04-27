# Opti-Me Screen Pattern Guide

## Purpose

This guide translates the Dashboard v2 design system into reusable screen patterns for the rest of Opti-Me. It is not a feature specification. It describes visual structure, hierarchy, and component behavior for future desktop light screens.

## Shared Screen Frame

- Use the Dashboard v2 `AppShell` as the default desktop frame.
- Keep the sidebar, header, top actions, typography, and card style consistent with `docs/UI_GUIDE.md`.
- Use page background `#F6F8FC`.
- Use white cards with `#DFE6F2` border, 16px radius, and subtle shadow.
- Section titles use slate `#334155`.
- Primary/danger/success colors are reserved for actions, icons, badges, counts, and states.
- Desktop light is the canonical target. Dark mode and mobile polish are separate passes.

## List Screen Pattern

Use for medication lists, history lists, report lists, family/member lists, and pet records.

- Header: page title, short subtitle, right-side primary action when needed.
- Control row: search input on the left, filters/sort/actions on the right.
- Content: card-based table/list with stable row height and clear columns.
- Row structure: leading icon/avatar/status dot, primary label, secondary/meta text, right aligned status/action.
- Empty rows should never leave a giant blank card; use an empty state pattern.
- Pagination or "more" actions should sit below the list inside the same section, not floating far away.
- Use compact information density similar to Dashboard v2 recent records and schedule rows.

## Detail Screen Pattern

Use for medication detail, family profile detail, pet profile detail, report detail, and safety detail.

- Header: back action, object title, status badge, primary action.
- Main area: two-column layout on wide desktop.
- Left column: primary content card with essential facts and timeline/detail blocks.
- Right column: compact summary/status cards, related actions, warnings, and metadata.
- Keep section titles slate; use status badges and icons for meaning.
- Avoid decorative hero sections unless the object itself needs a visual preview.
- Critical actions should be grouped and clearly separated from passive metadata.

## Create / Edit Screen Pattern

Use for registering medication, editing profile, adding pet, setting reminders, and report options.

- Header: page title and concise helper text.
- Form container: one white card, not multiple nested cards.
- Group fields into short sections with slate section labels and muted helper text.
- Primary action stays at the bottom right of the form area.
- Secondary/cancel action stays adjacent but visually quieter.
- Required fields should be indicated through label/helper text and validation state, not aggressive color.
- Use inline validation with muted danger styling: soft red text, soft border, and concise message.
- Keep form controls at consistent height, spacing, radius, and border color.

## Empty State Pattern

Use when no medications, no logs, no reports, no family members, no pets, or no search results exist.

- Empty state sits inside the relevant card or list region.
- Use one simple line icon inside a soft circular background.
- Title: slate, 17-20px depending on container size.
- Body copy: muted slate, 15-16px.
- Primary action: one clear CTA when the next step is obvious.
- Secondary action: optional text link only when helpful.
- Avoid oversized illustrations or large empty white panels.
- Empty state should preserve the page grid and card rhythm.

## Warning / Caution Card Pattern

Use for interactions, medication conflicts, missed doses, review warnings, and risky profile states.

- Card or inset background: `#FFF8F6`.
- Border: `#F2D1CC`.
- Warning icon: muted danger icon inside soft coral circle.
- Title remains slate unless it is a small inline warning label.
- Count/status/action uses danger text `#B94743` or `#A9443F`.
- Body text uses slate/muted slate.
- CTA uses muted danger styling and should not look like a destructive confirmation unless it is actually destructive.
- Warning cards should be visible but not visually louder than the whole page.

## Search / Filter Pattern

Use for medication search, history filtering, report filtering, and member/pet filtering.

- Search input sits before filters when both exist.
- Search input uses soft background or white with light border.
- Placeholder is muted but readable.
- Filters use segmented controls, dropdown buttons, chips, or checkboxes depending on cardinality.
- Active filters use pale indigo background and primary text.
- Filter chips use pill radius and small remove icon only when removal is supported.
- Avoid placing filters in a separate floating card unless the screen truly has dense controls.
- Results count appears as muted meta text, not a large title.

## Chat / Consultation Pattern

Use for AI health consultation and future conversational support surfaces.

- Desktop preview cards use the Dashboard v2 AI bubble pattern.
- User messages align right with primary bubble and white text.
- Assistant messages align left with soft lavender/indigo bubble and slate text.
- Both user and assistant bubbles need visible, attached tails.
- Message width is constrained; assistant replies should not become full-width information cards.
- Input bar sits at the bottom with a circular primary send button.
- System/help text should be muted and compact.
- Do not use chat bubbles for static explanatory cards outside chat contexts.

## Report / Document Pattern

Use for generated reports, downloadable files, and document summaries.

- Document rows use a small document icon in a soft green or neutral icon circle.
- Title is slate and 16-17px.
- Date/meta is muted and 15-16px.
- Download/open action sits right aligned.
- A primary create/generate action can sit at the bottom of the card.
- Report card titles remain slate; green is for document/status icons only.

## Status Badge Pattern

- Completed: pale mint background, success text.
- Scheduled/pending: pale indigo background, primary softened text.
- Family/member tag: pale indigo or soft neutral, depending on context.
- Danger/risk: muted danger background and danger text.
- Badge height: 24-26px on desktop.
- Keep badge text compact; avoid increasing font size until padding has been checked.

## Data Density Rules

- Dashboard-like operational screens should prioritize scanability over decorative space.
- Use compact rows with stable heights, predictable column alignment, and clear right-side status/action zones.
- Avoid giant empty cards.
- Avoid nested cards.
- Avoid marketing-style split hero layouts for app screens.
- Use whitespace to separate groups, not to make controls feel sparse.

## Migration Rule For Existing Screens

When migrating an existing screen to the Dashboard v2 baseline:

1. Keep behavior unchanged.
2. Keep data sources unchanged.
3. Replace only visual shell, spacing, typography, cards, icons, badges, buttons, and empty states first.
4. Reuse Dashboard v2 tokens and classes where practical.
5. Verify desktop light before considering dark/mobile polish.
6. Capture a screenshot and update the relevant report before committing.
