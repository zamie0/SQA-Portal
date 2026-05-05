# SQA Portal

SQA Portal is a Next.js workspace for QA teams to manage automation projects, runs, schedules, tools, and collaboration in one place.

## What This Project Is For

The app supports two main delivery types:

- **Test Automation projects**: test cases, API checks, scripts, execution results
- **RPA projects**: flow-based automation with run tracking

It combines dashboarding, project workspaces, notifications, team settings, and AI-assisted help.

## Main Project Areas (App Routes)

- `/` -> Portal dashboard and quick access cards
- `/portal/*` -> Core portal sections
  - `/portal/projects` -> project catalog
  - `/portal/testbeds` -> environments/testbeds
  - `/portal/tools` -> tools hub
  - `/portal/admin` -> user approvals and admin controls
- `/projects` -> all projects
- `/projects/[projectId]` -> detailed project workspace with tabs
- `/runs` -> run history across projects
- `/schedule` -> calendar and recurring execution plans
- `/notifications` -> event feed and alerts
- `/profile` -> user profile and membership overview
- `/settings` -> workspace configuration
- `/help/*` -> FAQ, tutorial, chat assistant, contact
- `/tools/*` -> product modules:
  - `/tools/qe` -> QE Automation Hub
  - `/tools/orca*` -> orchestration, agents, swarms, logs
  - `/tools/qa-genius*` -> AI generation/library/history
  - `/tools/performance*` -> performance testing, scenarios, reports

## Current Source Structure

```text
src/
  app/                      # Active Next.js App Router pages/layouts/api
  components/
    ui/                     # Reusable UI primitives
    layout/                 # Layout wrappers (Shell entrypoint)
    shared/                 # Shared wrappers (RequireAuth, StatusBadge entrypoints)
    auth/                   # Legacy auth component location (compat)
    project/                # Legacy project component location (compat)
  features/
    auth/components/        # Feature-first auth component entrypoints
    projects/components/    # Feature-first project component entrypoints
    help/                   # Help content entrypoint
  state/                    # App state/auth/storage/data entrypoints
  services/                 # Service/API entrypoints
  utils/                    # Utility entrypoints
  lib/                      # Existing implementation modules (gradual migration source)
  routes/                   # Legacy TanStack routes (now grouped by functionality)
  legacy/                   # Legacy migration notes
```

## Legacy Routes Folder (Organized by Functionality)

`src/routes` is legacy and excluded from the active Next.js runtime, but it is now grouped:

- `routes/auth/`
- `routes/help/`
- `routes/portal/`
- `routes/projects/`
- `routes/tools/`
- `routes/workspace/`

There is also `routes/route-groups.ts` for grouped exports.

## Tech Stack

- **Framework**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **UI**: Radix UI primitives + shadcn-style components
- **Charts**: Recharts
- **Validation/Forms**: Zod + React Hook Form
- **Lint/Format**: ESLint + Prettier

## Scripts

```bash
npm run dev      # start local development server
npm run build    # production build
npm run start    # run production server
npm run lint     # lint code
npm run format   # format code
```

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Migration Status

- Active runtime: **Next.js App Router** (`src/app`)
- Legacy TanStack artifacts remain for reference in `src/routes`, `src/router.tsx`, and `src/routeTree.gen.ts`
- New development should target:
  - `src/app`
  - `src/features`
  - `src/components/layout`, `src/components/shared`, `src/components/ui`
  - `src/state`, `src/services`, `src/utils`
