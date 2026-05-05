## Source Layout

This project is now organized around the active Next.js App Router, with feature-first entry points for future moves.

- `app/`: active Next.js routes and layouts
- `components/ui/`: shared, framework-agnostic UI primitives
- `components/layout/`: app shell/navigation wrappers
- `components/shared/`: shared cross-feature components
- `features/`: domain-oriented modules (`auth`, `projects`, `help`, ...)
- `services/`: API/server integrations
- `state/`: storage/event-driven client state
- `utils/`: pure utility helpers
- `legacy/tanstack/`: old TanStack router code (migration parking area)

### Migration Notes

Current runtime still imports some files from old paths (for compatibility). New code should prefer:

- `@/components/layout/*`
- `@/components/shared/*`
- `@/features/*`
- `@/services/*`
- `@/state/*`
- `@/utils/*`
