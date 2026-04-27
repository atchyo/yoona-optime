# Opti-Me Dashboard v2 UI Guide

## Baseline

Dashboard v2 is the UI baseline for Opti-Me. New product surfaces should inherit this system unless a later design-system pass explicitly replaces it.

- Primary target: desktop light.
- Design direction: soft premium healthcare dashboard.
- Superseded criteria from earlier dashboard experiments are not part of this baseline.
- Deferred: dark mode polish, mobile polish, and narrow desktop/tablet responsive compression.
- Prohibited: global body font-size scaling, `zoom`, `transform: scale(...)`, broad visual rewrites outside the active screen.

## Color Tokens

- Primary: `#4F46E5`
- Primary strong/button: `#554EE3`
- Secondary purple: `#5F5BE8`
- Page background: `#F6F8FC`
- Card background: `#FFFFFF`
- Card soft background: `#F8FAFD`
- Card border: `#DFE6F2`
- Card border strong: `#D5DEEC`
- Text strongest: `#2F3A4A`
- Text primary: `#334155`
- Text soft: `#475569`
- Text secondary: `#64748B`
- Text muted: `#7C8AA0`
- Text faint: `#94A3B8`
- Danger text: `#B94743`
- Danger strong: `#A9443F`
- Danger background: `#FFF8F6`
- Danger soft background: `#FFEDEA`
- Danger border: `#F2D1CC`
- Success text: `#0A8F67`
- Success background: pale mint / `#E4F8ED` family.

## Color Usage

- All section titles use slate: `#334155` or the `text primary` token.
- Primary is reserved for CTA links, active navigation, primary buttons, AI user bubble, send buttons, and focused interactive states.
- Danger is reserved for warning count, warning icons, danger CTA, warning borders/backgrounds, and risk/status expression.
- Success/green is reserved for completed badges, positive status, and document/status icons.
- Do not color section titles by card meaning. `오늘의 복용 일정`, `주의가 필요한 상호작용`, `AI 건강 상담`, `복약 지도 리포트`, records, family, and pet titles all stay slate.

## Typography

- Page greeting: 30px, 720-750, `#334155`.
- Greeting subtitle: 17px, `text secondary`.
- Sidebar logo title: 30px, 720-750.
- Sidebar logo subtitle: 16px, 600-630, `text soft`.
- Sidebar menu label: 21px, 640-670, line-height 1.35-1.42.
- Section title: 23px, 680-710, `text primary`.
- Card body title: 17-18px, 640-690, `text strongest`.
- Body copy: 16-17px, `text secondary`.
- Meta copy: 15.5-16px, `text muted`.
- Summary title: 17px, 700, `text secondary`.
- Summary number: 34px, 720-750, slate for normal cards and muted danger for danger cards.
- CTA text: 16px, 760, primary or muted danger.
- Badge text: 13px, 760.
- Font weight should not be increased to compensate for readability. Use size, spacing, and contrast before weight.

## Layout

- Desktop light is the canonical layout.
- Wide desktop sidebar: 304-320px, current baseline 312px.
- Main content padding: left around 34px, top around 44px, right reduced enough to keep card grids comfortable on wide desktop.
- Summary grid: 4 columns.
- Main dashboard grid: schedule card plus right status stack.
- Lower grid: recent records, AI consult, report cards in 3 columns.
- Sidebar promo card aligns visually to the recent records card bottom line. Target bottom delta is 4px or less in 1920x1080 CSS viewport.
- Tablet/mobile layouts are allowed to remain smoke-check only until their dedicated pass.

## App Shell And Sidebar

- Dashboard v2 uses the shared `AppShell` chrome as the app baseline.
- Sidebar background is white, with a subtle right border.
- Active navigation uses pale indigo background with primary icon/text.
- Nav icon style is one line-icon system from `src/components/Icon.tsx`.
- Sidebar menu row height is 58-62px on wide desktop.
- Sidebar menu icon size is about 20px inside a soft circular icon background.
- Sidebar promo image uses contained image fitting and should never crop faces or important content.

## Brand Logo

- Dashboard v2 sidebar brand logo uses `public/assets/opti-me-icon.png`.
- Do not use generated placeholder marks for the desktop Dashboard v2 sidebar brand.
- Logo size: 52-60px, current baseline 56px.
- Logo shape: rounded square app icon, 16-18px radius.
- Logo must not show black corners/background, distortion, or clipping.
- `Opti-Me` title top should align optically with the dashboard greeting title top.
- Subtitle `가족 약 관리` is supporting text and must not compete with the brand title.

## Header

- Greeting format: `안녕하세요. {user.name}님!`
- Greeting name must come from the logged-in user name, not hard-coded text.
- Top actions share the same system: notification, help, and user dropdown are 48px high on wide desktop.
- Help/user text: 17px.
- Notification icon: 22px.
- User avatar circle: 38px.
- Header controls must remain vertically centered and visually quieter than the page greeting.

## Cards

- Base card background: white.
- Base card border: `#DFE6F2`.
- Base radius: 16px.
- Shadow: subtle blue-gray opacity only.
- Default card padding: 22-24px.
- Avoid cards nested inside cards.
- Repeated card items should share border, radius, padding, and shadow values.
- Danger cards use danger background/border while keeping section title slate.

## Summary Cards

- Structure: icon circle / text content / CTA.
- Icon circle: about 42px.
- Icon-content gap: about 16px.
- Title-number gap: about 7px.
- CTA sits in a stable right area and must not crowd the number.
- All four summary cards should look like instances of the same component.
- Danger summary uses danger value/CTA color only; layout remains identical.

## Buttons And Links

- Primary wide button uses `#554EE3`.
- Text CTA uses primary but should not appear neon or overly saturated.
- Secondary button uses white background, soft border, and softened primary text.
- Danger action uses muted danger scale, not primary purple.
- Icon buttons should use the shared line-icon system.
- Button text should not be scaled up enough to make pills cramped.

## Badges

- Badge height: 24-26px.
- Radius: full pill.
- Family/scheduled badges use pale indigo background and softened primary text.
- Completed badges use pale mint background and success text.
- Danger badges/counts use muted danger text.
- Padding should be adjusted before increasing font size.

## Inputs

- Inputs use soft card background or white with a light border depending on context.
- Placeholder text should be muted but readable.
- Input height should visually align with adjacent buttons.
- Chat input baseline: 44px input and 42px circular send button in Dashboard v2.
- Focus styles use primary color subtly.

## Icons And Avatars

- Use `src/components/Icon.tsx` as the single line-icon source for Dashboard v2.
- Stroke width baseline: 1.8.
- Summary icons sit inside soft circular backgrounds.
- Danger icons use muted coral backgrounds.
- People avatars use minimalist head-and-shoulder line icons, not character faces.
- Dog avatar keeps its friendly mark but must stay centered inside the circular container. Current dog positioning uses a lowered/scaled inner graphic so ears do not break out of the circle.

## AI Chat Bubble

- AI consult uses a chat preview / iMessage-like bubble layout on desktop.
- User bubble: right aligned, primary background, white text, 22px radius, right-bottom tail.
- Assistant bubble: left aligned, soft lavender/indigo background, slate text, 22px radius, left-bottom tail.
- Both tails must be clearly visible and must not be clipped by card or parent overflow.
- Avoid negative z-index tail layering. Prefer stable pseudo-elements with visible overflow.
- User question `감기약 먹으면서 운전해도 될까요?` stays one line at 1920x1080 desktop.
- Assistant bubble is max-width limited and must not read as a full-width information box.
- AI avatar/mark may sit outside the assistant bubble to keep text breathable.
- Input bar and send button are part of the chat UI and align at the bottom of the card.

## Reusable Component Inventory

- `CoreMenuPage`
- `CoreSummaryGrid`
- `CoreCard`
- `CoreToolbar`
- `CoreListRow`
- `CoreBadge`
- `CoreIconCircle`
- `CoreAvatar`
- `CoreEmptyState`
- `CoreChatBubble`
- `CoreToggle`
- `SectionCard`
- `CardHeader`
- `SummaryCard`
- `MedicationScheduleCard`
- `InteractionWarningCard`
- `FamilyStatusCard`
- `PetStatusCard`
- `RecentMedicationCard`
- `AiConsultCard`
- `ReportCard`
- `Badge`
- `IconCircle`
- `MedicationDot`
- `FamilyAvatar`

## Implementation Notes

- Keep Dashboard v2 CSS in `src/dashboard-v2.css` until the rest of the app is migrated.
- New screens should reuse the Dashboard v2 shell, card, typography, badge, button, and icon rules before introducing new variants.
- Core menu scaffold screens use `src/components/CoreMenuScaffold.tsx` and the `.core-*` CSS pattern names as the first pass for non-dashboard desktop light surfaces.
- Core menu scaffold is an 80% layout baseline, not final per-screen polish. Screen-specific refinements should happen in later focused passes.
- Mock/fixture data in Dashboard v2 is render-only and must not write to DB.
- Future real data wiring should preserve the visual contract first, then replace fixture values carefully.
