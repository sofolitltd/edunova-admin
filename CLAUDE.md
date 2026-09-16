# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # Start dev server (Turbopack, localhost:3000)
npm run build   # Production build
npm run start   # Serve production build
npm run lint    # ESLint (eslint-config-next core-web-vitals + typescript)
```

No test suite exists in this repo. `npm run lint` and a clean `npm run build` (which runs the TypeScript compiler via Next) are the closest things to a pre-commit gate.

`NEXT_PUBLIC_API_URL` (in `.env.local`) points at the Go backend API; defaults to `http://localhost:8080/api` if unset.

## Sibling repos

This is the admin/public dashboard for EduNova, backed by a separate Go API server and mirrored by a separate Flutter mobile app — neither lives in this repo:

```
Go backend:    /Users/reyad/Documents/Programming/Go/edunova-server
Flutter app:   /Users/reyad/Documents/Programming/Flutter/edunova
```

Adding or changing a backend endpoint means updating `src/lib/api.ts` here to match; there's no shared type generation between the Go server and this frontend, so request/response shapes must be kept in sync by hand.

## Architecture

Next.js App Router, all routes under `src/app/`. Two largely separate UIs share one codebase and one `api` object:

- **Admin panel** (`src/app/admin/**`, one `page.tsx` per section, gated by `src/app/admin/layout.tsx`): dashboard, users, courses, batches, attendance, enrollments, exams, hierarchy (question-bank taxonomy), question-bank, admins (master_admin-only UI), finance, expenses, doubts, calendar, lessons, payments, articles, notifications, transitions, notes, profile. Nav items and route list live directly in `admin/layout.tsx`.
- **Public site + student dashboard** (`src/app/page.tsx`, `courses/`, `login/`, `register/`, `dashboard/**`, etc.): landing/marketing pages plus a logged-in-student area at `/dashboard/*` (separate `layout.tsx` from admin's).
- No `src/app/api/*` route handlers — this app is a pure client of the Go backend, not a backend itself.

**Auth:** two entirely independent auth states in `src/lib/auth.ts`, both backed by plain `localStorage` (no cookies/middleware-based auth): admin token+profile under `edunova_admin_token`/`edunova_admin`, student/user token+profile under `edunova_user_token`/`edunova_user`. `src/app/admin/layout.tsx` and `src/app/dashboard/layout.tsx` each do their own client-side `isAuthenticated()` check and redirect — there is no Next.js middleware enforcing auth centrally.

**API client:** `src/lib/api.ts` is a single file exporting one `request<T>()` wrapper (adds JSON/FormData headers and bearer token, and on a 401 clears the relevant localStorage keys and hard-redirects to `/admin/login` or `/login` depending on path prefix) plus one plain object per domain built on top of it: `api` (auth/user/courses/exams/enrollments), `hierarchyApi`, `questionsApi`, `financeApi`, `batchApi`, `attendanceApi`, `doubtApi`, `calendarApi`, `lessonApi`, `paymentApi`, `articleApi`. When wiring up a new admin feature, add a new object here following the same pattern rather than calling `fetch`/`request` directly from a page.

**Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config` file — config lives in `globals.css`), `next-themes` for light/dark, Google Sans + Noto Sans Bengali via `@fontsource/*`. No component library dependency (no shadcn/radix in `package.json`) — components are built directly with Tailwind classes; `src/lib/utils.ts` + `clsx`/`tailwind-merge` provide the `cn()`-style class merging helper.

**Forms/data:** `react-hook-form` + `zod` + `@hookform/resolvers` for forms, `swr` for data fetching/caching against the API client above, `recharts` for dashboard charts, `sonner` for toasts.

Note: `reactStrictMode` is explicitly disabled in `next.config.ts`.
