# Core Menu Layout Scaffold Pass 01 Report

## Summary

Dashboard v2 is now used as the Opti-Me UI baseline for the main menu surface. This pass does not finish every screen. It creates consistent desktop light layout scaffolds so the major routes open in the same app system before per-screen polish begins.

## Screens Created

| Screen | Route | Screenshot |
| --- | --- | --- |
| Dashboard v2 | `/` | `screenshots/menu-dashboard.png` |
| 약 관리 | `/scan` | `screenshots/menu-medications.png` |
| 복용 기록 | `/history` | `screenshots/menu-medication-records.png` |
| 복약 알림 | `/reminders` | `screenshots/menu-reminders.png` |
| 상호작용 체크 | `/interactions` | `screenshots/menu-interactions.png` |
| AI 건강 상담 | `/chat` | `screenshots/menu-ai-consult.png` |
| 리포트 출력 | `/reports` | `screenshots/menu-reports.png` |
| 가족 관리 | `/family` | `screenshots/menu-family.png` |
| 반려동물 관리 | `/pets` | `screenshots/menu-pets.png` |
| 설정 | `/settings` | `screenshots/menu-settings.png` |

## Mock Data Locations

- Dashboard v2 fixtures: `src/pages/DashboardPage.tsx`
- 약 관리 fallback rows: `src/pages/MedicationScanPage.tsx`
- 복용 기록 grouped rows: `src/pages/MedicationHistoryPage.tsx`
- 복약 알림 reminder rows: `src/pages/RemindersPage.tsx`
- 상호작용 체크 chips/results: `src/pages/SafetyCheckPage.tsx`
- AI 건강 상담 messages/questions/history: `src/pages/RuleChatPage.tsx`
- 리포트 출력 report rows/options: `src/pages/ReportsPage.tsx`
- 가족 관리 fallback member cards: `src/pages/FamilyAdminPage.tsx`
- 반려동물 관리 fallback pet cards: `src/pages/PetAdminPage.tsx`
- 설정 scaffold cards: `src/pages/SettingsPage.tsx`

Mock data is render-only and is not persisted to DB.

## Reused Components

- `AppShell`
- `Icon`
- Dashboard v2 sidebar/header/card/button/badge/input/color tokens in `src/dashboard-v2.css`
- Existing app route structure in `src/App.tsx`

## New Common Components

Created `src/components/CoreMenuScaffold.tsx`:

- `CoreMenuPage`
- `CoreSummaryGrid`
- `CoreCard`
- `CoreToolbar`
- `CoreListRow`
- `CoreBadge`
- `CoreChip`
- `CoreIconCircle`
- `CoreAvatar`
- `CoreEmptyState`
- `CoreChatBubble`
- `CoreToggle`

## UI Guide Application

- All menu pages use the Dashboard v2 app shell.
- All section titles use slate text.
- Primary color is reserved for active navigation, buttons, links, and chat user bubbles.
- Danger color is reserved for warning counts, warning badges, and caution cards.
- Success color is reserved for completed/healthy status badges and status icons.
- Cards, badges, buttons, inputs, list rows, empty states, and chat bubbles use a shared `.core-*` scaffold layer.
- Dark mode and mobile polish remain out of scope.

## Unfinished Functionality

- Buttons are layout placeholders unless they already existed as app shell navigation.
- New add/edit/delete/search/filter/report/chat logic was not implemented.
- Interaction results are mock guidance only and do not perform medical judgment.
- AI 상담 screen does not call an AI API.
- Report generation/download is scaffold only.
- Family/pet permission and edit flows are scaffold only.

## Next Polish Candidates

1. 약 관리: table density, registration drawer, real search/filter behavior.
2. AI 건강 상담: full-height chat layout, message composer behavior, guidance copy.
3. 가족/반려동물 관리: card grid balance and edit form patterns.
4. 상호작용 체크: selected medicine chip UX and safety result hierarchy.
5. 리포트 출력: report preview and generation options.

## Verification

- Browser route verification used CSS viewport `1920x1080`, DPR `2`.
- Each screenshot saved at `3840x2160`.
- Sidebar click navigation was verified for all target menu items and returned the expected route/active state.
- `npm run build` passed.
- No dedicated `test` or `lint` script is present in `package.json`.
