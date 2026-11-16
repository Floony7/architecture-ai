# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Project APIs (06) — Complete

## Current Goal

- Backend-only Project APIs (06) implemented and verified; await the next feature unit.

## Completed

- Design system and UI primitives (01). Installed shadcn/ui, all seven requested primitives, and Lucide React. Added the shared cn() helper and applied the dark palette to the app and Clerk screens.

- Editor chrome (02). Added the fixed-height navbar, sliding project sidebar with empty tabs, and token-styled dialog content pattern.

- Editor route (02). Mounted the workspace chrome at the protected `/editor` route and added Playwright regression tests against it.

- Authentication (03). Applied the Clerk dark theme and app tokens, built responsive sign-in and sign-up screens, and added session-based root redirects, default route protection, and the Clerk account menu in the editor.

- Project Dialogs & Editor Home (04). Added the centered editor home, create dialog with live slug preview, rename dialog with keyboard submission, and destructive delete confirmation. Both create entry points use the same dialog. Sidebar actions are available for owned projects, and an outside tap dismisses the sidebar on mobile. Mock edits live in memory for the current page.

- Prisma Schema And Data Layer (05). Added the Project and ProjectCollaborator models, enum, indexes, cascade relation, cached connection-aware client, and initial SQL migration. Applied the migration to PostgreSQL and regenerated Prisma Client.

- Project APIs (06). Added authenticated list/create/rename/delete handlers, owner-scoped listing, default create names, existing Prisma IDs, owner-only mutations, JSON validation/errors, and focused API regression tests. UI remains unchanged.

## In Progress

- None.

## Next Up

- Await the next feature unit.

## Open Questions

- None.

## Architecture Decisions

- Add decisions that affect the system design or data model.

- Project API contract (06): list returns `{ projects }` for the authenticated owner's projects; create/rename return `{ project }` (201/200), delete returns 204, and errors return `{ error }`. Missing records return 404. JSON object bodies accept a non-empty trimmed `name`; an omitted create name defaults to `Untitled Project`. Only name is accepted into mutations; owner and ID always come from Clerk and Prisma respectively.

## Session Notes

- The production build, lint, and frozen lockfile check passed. Browser smoke checks covered all seven primitives and both Clerk screens with a light browser preference. The generated UI sources matched their installation hashes, and `cn()` merged conflicting utilities.

- Editor chrome passed TypeScript, lint, and desktop and mobile browser checks in an isolated fixture. The browser checks covered the navbar controls, both sidebar tabs, canvas dimensions, and the dialog pattern.

- Editor route passed the production build, TypeScript, lint, and the signed-out Playwright redirect check. The signed-in desktop and mobile layout test requires an existing Clerk development test user configured through `E2E_CLERK_USER_EMAIL`.

- Authentication (03) passed the npm production build, lint, and Playwright checks against the production build. Browser coverage included signed-out redirects and protected routes, both public auth forms at desktop and mobile widths, the signed-in editor redirect and layout, and the Clerk account menu and sign-out.

- Project Dialogs & Editor Home (04) passed TypeScript, lint, and isolated desktop and mobile Edge checks. The browser fixture used the editor components and styles with a stubbed Clerk account control. The full Playwright suite stopped during its production build because Turbopack could not spawn a CSS worker in this environment. Signed-in route coverage also requires `E2E_CLERK_USER_EMAIL`.

- Prisma setup (05): added the multi-file schema, cached direct/Accelerate client, generated migration, and client generation in the build script. Prisma validation, TypeScript (including query and transaction call sites), lint, singleton initialization/cache reuse for both connection branches, and the production build passed. The build required the Node executable directory on PATH for the Windows CSS worker. Migration application is deferred until the user finishes initial setup.

- Prisma setup (05) completed on 2026-11-12 with Prisma ORM 7.10.1. Applied 20261111090000_init_projects using the connection loaded from .env.local and regenerated the client. Schema validation passed, migration status is up to date, and schema diff found no differences. Read-only counts through the application singleton returned zero projects and zero collaborators; development singleton reuse passed. The production build script (Prisma generation and Next.js build, including TypeScript) passed using pnpm with the Node executable directory on PATH. All feature 05 checks are complete.

- Project APIs (06) completed on 2026-11-12. Eight handler tests passed via node --test tests/api/projects.test.mjs, covering signed-out access, owner-scoped listing, creation defaults and forged fields, invalid input, owner/non-owner mutations, and missing records. TypeScript and lint passed. The production build script (Prisma generation and Next.js build) passed using pnpm --config.verifyDepsBeforeRun=false run build; npm is unavailable in this shell. Production HTTP checks at localhost verified JSON 401 responses for all four endpoints and preserved the editor sign-in redirect. The test server required the bundled Node directory on PATH. Authenticated handler tests use Clerk/Prisma boundary doubles; a live signed-in database round trip was not run.
