# Legacy TanStack Routes

This folder contains legacy TanStack router files from before the Next.js migration.

## Grouped map

- `auth/` -> `login`, `register`, `forgot-password`
- `help/` -> `help`, `help.chat`, `help.faq`, `help.contact`, `help.tutorial`
- `portal/` -> `portal.admin`, `portal.projects`, `portal.testbeds`, `portal.tools`
- `projects/` -> `projects`, `projects.index`, `projects.$projectId`
- `tools/` -> `tools.qe`, `tools.orca*`, `tools.qa-genius*`, `tools.performance*`
- `workspace/` -> `__root`, `index`, `notifications`, `profile`, `runs`, `schedule`, `settings`

## Notes

- These files are excluded from active Next.js build/lint.
- New app code should live in `src/app`.
- Keep this folder only as migration reference until fully removed.

## Group exports

Use `route-groups.ts` if you want a single import point for grouped legacy routes.
