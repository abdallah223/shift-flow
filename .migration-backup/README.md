# ShiftFlow — Call Center Operations Tracker

A local-first activity tracker for call center team leaders, supervisors, and QA staff. All data lives in the browser's IndexedDB — there is no backend or database to host.

## Stack

- React 18 + Vite
- Tailwind CSS
- Chart.js (in-app charts)
- ExcelJS + jsPDF (client-side report exports)
- IndexedDB (local persistence, no server)

## Project structure

```
shiftflow/
├── index.html
├── src/
│   ├── main.jsx              # entrypoint
│   ├── App.jsx                # layout + view router
│   ├── index.css              # tailwind + custom animations
│   ├── db/database.js         # IndexedDB wrapper
│   ├── data/categories.js     # default activity categories
│   ├── context/AppContext.jsx # global state, timer, CRUD logic
│   ├── components/
│   │   ├── icons/DynamicIcon.jsx
│   │   ├── Sidebar.jsx
│   │   ├── CurrentActivityCard.jsx
│   │   └── modals/
│   │       ├── QuickAddModal.jsx
│   │       ├── ManualAddModal.jsx
│   │       └── CommandPaletteModal.jsx
│   └── views/
│       ├── DashboardView.jsx
│       ├── TimelineView.jsx
│       ├── CalendarView.jsx
│       ├── ReportsView.jsx
│       ├── ExportView.jsx
│       └── SettingsView.jsx
```

## Local development

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

The production build is emitted to `dist/`.

## Deploying

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: ShiftFlow"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Host on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Vercel auto-detects the Vite framework preset (also pinned in `vercel.json`):
   - Build command: `npm run build`
   - Output directory: `dist`
3. Click **Deploy**. No environment variables are required since everything runs client-side in IndexedDB.

Alternatively, with the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## Notes

- All activity data is stored locally per-browser via IndexedDB (`ShiftFlow_CallCenter_DB`). Clearing site data/browser storage will wipe the data — use the **Backup IndexedDB Ledger** button on the Export page regularly, or before clearing browser storage.
- Keyboard shortcuts: `N` quick add, `Space` pause/resume timer, `E` jump to export, `Ctrl/Cmd+K` command palette.
