# Production Control System

A production management web application for an electrical meter manufacturing operation.

Built with **React + TypeScript + Vite + Supabase**.

---

## Features

- 📈 **Dashboard** — KPI cards, production trend charts, target vs actual, defects/downtime trends
- ⏱️ **Downtime Log** — Record, edit, and filter downtime events with auto-calculated duration
- 📋 **Daily Production Report** — Enter targets, actuals, defects; auto-calculates good qty and achievement %
- 🔮 **Future** — Placeholder page for upcoming features
- 🌍 **Bilingual** — Full Arabic (RTL) and English (LTR) support with instant toggle
- 🌙 **Dark / Light Mode** — Persistent theme toggle
- 📱 **Responsive** — Desktop sidebar + mobile bottom nav
- 🔒 **Auth + RLS** — Supabase Auth with Row Level Security per role
- ↻ **Shift Rotation Engine** — DB-driven configurable 8-day cycle, overnight shift support
- 👥 **Auto Group Detection** — User's group comes from their profile; no manual selection
- 📅 **Excel Import Ready** — Placeholder service/architecture in place

---

## Setup Instructions

### 1. Clone / Open

```bash
cd "PRODUCTION CONTROL"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase

Create a `.env` file (copy from `.env.example`):

```bash
copy .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
```

> ⚠️ **NEVER** add your Supabase Service Role (Secret) key here. It must only be used in a secure server environment.

### 4. Run Supabase SQL Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open and run `supabase/schema.sql`

This creates all tables, relationships, RLS policies, indexes, and seed data.

### 5. Create First Admin User

1. In Supabase dashboard → **Authentication** → **Users** → Add user
2. After the user is created, their profile row is auto-created
3. In Supabase **Table Editor** → `profiles` table:
   - Find the user
   - Set `role = 'admin'`
   - Set `group_id` to one of the production group IDs

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder. Deploy to Vercel, Netlify, or any static hosting.

---

## Project Structure

```
src/
  components/
    ui/           ← Reusable UI primitives
    layout/       ← Sidebar, Header, MobileNav, AppLayout
  contexts/
    AppContext.tsx ← Auth + Profile global state
  pages/
    Dashboard/    ← KPIs, charts, shift info
    Downtime/     ← Form, table, CRUD
    DailyProduction/ ← Form, table, CRUD
    Future/       ← Placeholder
    Auth/         ← Login page
  services/
    supabase.ts            ← Supabase client
    shiftRotationService.ts ← DB-driven rotation engine
    profileService.ts      ← User profile operations
    productionService.ts   ← Production report CRUD
    downtimeService.ts     ← Downtime CRUD
    excelImportService.ts  ← PLACEHOLDER (future)
  hooks/
    useAuth.ts
    useProfile.ts
    useShiftRotation.ts
    useLanguage.ts
    useTheme.ts
  types/
    index.ts      ← All TypeScript types
  utils/
    dateUtils.ts  ← Date helpers, shift detection
    calculations.ts ← Achievement, good qty, duration
  locales/
    en.ts         ← English strings
    ar.ts         ← Arabic strings
  lib/
    i18n.ts       ← i18next init
supabase/
  schema.sql      ← Full DB schema + RLS + seed
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: manage users, configuration, all records |
| `supervisor` | View all, insert/edit/delete own records |
| `operator` | Insert records, view |
| `viewer` | Read-only access |

Roles are enforced by **Supabase RLS policies** — not just frontend checks.

---

## Production Lines

| Code | Name |
|------|------|
| `SINGLE` | Single Phase |
| `THREE` | Three Phase |

---

## Production Groups

| Code | Name |
|------|------|
| `A` | Group A |
| `B` | Group B |
| `C` | Group C |
| `D` | Group D |

---

## Shift Schedule

| Shift | Code | Time |
|-------|------|------|
| Morning | `MORNING` | 07:00 – 19:00 |
| Evening | `EVENING` | 19:00 – 07:00 |

Rotation is configurable in the `shift_rotations` table. Default: 8-day cycle.

- Days 1–4: Group A (Morning) + Group B (Evening)
- Days 5–8: Group C (Morning) + Group D (Evening)

---

## Excel Import (Future)

The `src/services/excelImportService.ts` file is a placeholder skeleton.

Once the Excel format is defined, implement:
1. `parseExcelFile(file)` — using SheetJS (`xlsx`)
2. `validateImportRecords(records)` — validate and find duplicates
3. `importRecords(records)` — bulk insert to `daily_production_reports`

The database schema is already designed to accept Excel-imported data via `actual_quantity`.

---

## Security Notes

- The `VITE_SUPABASE_PUBLISHABLE_KEY` is the **anon** key — safe for frontend use
- The **Service Role key** must never appear in frontend code
- All business permissions are enforced via **Supabase RLS**
- Users cannot change their own group — only admins can update `profiles.group_id`
- Historical records retain the group assigned at creation time

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (dark mode, RTL logical props) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| i18n | react-i18next |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL + RLS |
| Icons | Lucide React |
| Toasts | Sonner |
| Date | date-fns |

---

*Production Control System — Electrical Meter Manufacturing*
