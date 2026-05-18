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
  app/                      # Active Next.js App Router URLs, layouts, and API routes
  modules/                  # Owned feature areas and page implementations
    auth/
    help/
    portal/
      admin/
      projects/
      testbeds/
      tools/
    projects/
    tools/
      orca/
      performance/
      qa-genius/
      qe/
    workspace/
  shared/                   # Cross-feature reusable code
    components/
      layout/
      ui/
    hooks/
    lib/
    services/
    state/
    utils/
  components/               # Compatibility forwards to shared modules
  features/                 # Compatibility forwards to feature modules
  routes/                   # Legacy TanStack routes
  legacy/                   # Legacy migration notes
```

## Development Ownership

Use `src/modules` as the first place to look for product work. If a developer changes QA Genius, they should usually work under `src/modules/tools/qa-genius`. If they change admin controls, they should usually work under `src/modules/portal/admin`.

Use `src/shared` only for code that is reused by multiple modules. Route files in `src/app` should stay thin and only import the module page they expose.

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
- **Database**: MongoDB with the official Node.js driver
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
npm run db:seed  # create MongoDB collections, roles, permissions, and demo admin
npm run lint     # lint code
npm run format   # format code
```

## Local Setup

```bash
npm install
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

MongoDB must be running before `npm run db:seed`. For local development, the default connection is:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=sqa-portal
```

SQA Copilot is the AI chat assistant under `/help/chat`.
It requires the following environment variables in `.env.local`:

```env (Key Aliss ni, jangan habiskan | Guna key sendiri kalau boleh |)
GEMINI_API_KEY=AIzaSyCL4hG101gHs1MEd6B5bqTGW7Bj8OB57t8
GEMINI_MODEL=gemini-2.5-flash
```

After seeding, MongoDB Compass should show the `sqa-portal` database. The seeded demo admin account is:

```text
Username: adminpower
Password: adminpowertocontrol
```

You can verify the database connection in the browser:

```text
http://127.0.0.1:3000/api/database/status
```

## Data Status

MongoDB is now the active database for auth, users, roles, permissions, admin approvals, profile updates, email/password changes, password reset requests, tools, and audit logs.

Some project/tool workspace areas still use mock data or browser storage while their MongoDB APIs are being built.

## Migration Status

- Active runtime: **Next.js App Router** (`src/app`)
- Legacy TanStack artifacts remain for reference in `src/routes`, `src/router.tsx`, and `src/routeTree.gen.ts`
- New development should target:
  - `src/app` for route entrypoints only
  - `src/modules` for feature-owned code
  - `src/shared` for reusable components, state, services, hooks, and utilities
