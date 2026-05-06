## Legacy TanStack Area

This folder is reserved for old TanStack router artifacts during migration.

Current legacy files still in root `src`:

- `routes/`
- `router.tsx`
- `routeTree.gen.ts`

They are excluded from active Next.js build/lint flow.

Next cleanup step:

1. Move the files listed above into this folder.
2. Remove old dependencies/imports that are no longer used.
3. Delete this folder when migration is fully complete.
