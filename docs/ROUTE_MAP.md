# Opti-Me Route Map

Dashboard v2 is the UI baseline. The menu routes below now use the shared Dashboard v2 app shell and the Core Menu scaffold pattern for desktop light layout.

| Menu | Route Path | Page Component | Mock Data |
| --- | --- | --- | --- |
| 대시보드 | `/` | `src/pages/DashboardPage.tsx` | Yes, render-only Dashboard v2 fixtures |
| 약 관리 | `/scan` | `src/pages/MedicationScanPage.tsx` | Yes, fallback rows in page file |
| 복용 기록 | `/history` | `src/pages/MedicationHistoryPage.tsx` | Yes, grouped history rows in page file |
| 복약 알림 | `/reminders` | `src/pages/RemindersPage.tsx` | Yes, reminder rows in page file |
| 상호작용 체크 | `/interactions` | `src/pages/SafetyCheckPage.tsx` | Yes, mock selected chips and result rows |
| AI 건강 상담 | `/chat` | `src/pages/RuleChatPage.tsx` | Yes, mock messages, questions, recent consults |
| 리포트 출력 | `/reports` | `src/pages/ReportsPage.tsx` | Yes, mock report rows and options |
| 가족 관리 | `/family` | `src/pages/FamilyAdminPage.tsx` | Yes, fallback family cards when real data is sparse |
| 반려동물 관리 | `/pets` | `src/pages/PetAdminPage.tsx` | Yes, fallback pet cards when real data is sparse |
| 설정 | `/settings` | `src/pages/SettingsPage.tsx` | Partial, account/workspace values are real local app state with scaffold setting cards |

## Notes

- Sidebar navigation is defined in `src/components/AppShell.tsx`.
- `AppShell` now applies `dashboard-v2-shell` to authenticated app routes so sidebar, header, and page background stay consistent.
- The Core Menu scaffold components live in `src/components/CoreMenuScaffold.tsx`.
- This pass does not connect new feature logic, write to the database, or change backend/auth behavior.
