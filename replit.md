# ShiftFlow

A call center operations tracker that lets supervisors log shift activities, track productivity, and generate reports — all stored locally in the browser via IndexedDB.

## Run & Operate

- Workflow `artifacts/shiftflow: web` — runs the Vite dev server for the frontend
- `pnpm run typecheck` — full typecheck across all packages
- No backend or database required — data is stored in IndexedDB (browser)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (JSX), Tailwind CSS v3 (postcss), chart.js, exceljs, jspdf
- Storage: IndexedDB via custom `ShiftFlowDatabase` class
- No backend API or PostgreSQL used

## Where things live

- `artifacts/shiftflow/src/App.jsx` — root app component (view router)
- `artifacts/shiftflow/src/context/AppContext.jsx` — global state + IndexedDB integration
- `artifacts/shiftflow/src/views/` — all page views (Dashboard, Timeline, Calendar, Reports, etc.)
- `artifacts/shiftflow/src/components/` — sidebar, modals, icons
- `artifacts/shiftflow/src/db/database.js` — IndexedDB wrapper
- `artifacts/shiftflow/src/data/categories.js` — default activity categories
- `artifacts/shiftflow/tailwind.config.js` — Tailwind v3 config with brand colors + fonts

## Architecture decisions

- Pure client-side app — no Express backend, no Postgres, no codegen. All data persists in IndexedDB.
- Uses JSX (not TSX) for all components — migrated from Vercel/v0 as-is. TypeScript strict mode not enforced.
- Tailwind CSS v3 via postcss (NOT @tailwindcss/vite) — the copy script removed the v4 plugin and installed v3.
- App routing is state-based (`currentView` in AppContext), not URL-based. No React Router or wouter used.
- chart.js, exceljs, and jspdf are `dependencies` (runtime), not devDependencies.

## Product

ShiftFlow lets call center supervisors log and categorize shift activities in real time, view a timeline and calendar of their work sessions, generate executive and operations reports, track task completion, analyze productivity trends, and export data to Excel/PDF.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do NOT add `@tailwindcss/vite` — the project uses Tailwind v3 with postcss. The vite.config.ts passes tailwind/autoprefixer via `css.postcss.plugins`.
- Do NOT run `pnpm dev` at workspace root. Use the workflow `artifacts/shiftflow: web` or `pnpm --filter @workspace/shiftflow run dev`.
- The app entry point is `src/main.jsx` (JSX, not TSX). The scaffold's `src/main.tsx` and `src/App.tsx` are unused.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
