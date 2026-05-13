## Source Layout

This project is organized around thin Next.js route entrypoints and feature-owned modules.

- `app/`: active Next.js routes, layouts, and API routes
- `modules/`: feature-owned implementation folders
- `modules/tools/`: tool modules such as `orca`, `performance`, `qa-genius`, and `qe`
- `modules/portal/`: portal modules such as `admin`, `projects`, `testbeds`, and `tools`
- `modules/projects/`: project list, detail pages, and project workspace components
- `modules/workspace/`: dashboard, runs, schedule, notifications, profile, and settings pages
- `shared/components/`: shared UI, layout, and cross-feature components
- `shared/lib/`: reusable data, storage, auth, notification, and helper logic
- `shared/lib/mongodb.ts`: shared MongoDB connection helper
- `shared/state/`: state entrypoint exports
- `shared/services/`: service/API entrypoint exports
- `shared/utils/`: utility entrypoint exports
- `components/` and `features/`: compatibility forwards for old imports
- `legacy/tanstack/`: old TanStack router code (migration parking area)

### Migration Notes

New code should prefer:

- `@/modules/*`
- `@/shared/components/*`
- `@/shared/lib/*`
- `@/shared/state`
- `@/shared/services`
- `@/shared/utils`

Keep `src/app` files small. A route page should normally import and export a page from `src/modules`.

### Database Notes

MongoDB is the active database for auth, users, roles, permissions, admin approvals, profile updates, email/password changes, and password reset requests.

Run this after installing dependencies and starting MongoDB:

```bash
npm run db:seed
```

Project/tool workspace areas still contain mock data and browser storage while their API wiring is being completed.
