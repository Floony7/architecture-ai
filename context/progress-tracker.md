# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Share Dialog (09) — Complete

## Current Goal

- Feature 09 is implemented and verified; await the next feature unit.

## Completed

- Alternative dark palette preview (2026-11-16). Applied midnight navy surfaces, amber controls, blue-gray text, periwinkle AI accents, and coordinated status colors through the shared CSS tokens. Updated the UI palette documentation.

- Design system and UI primitives (01). Installed shadcn/ui, all seven requested primitives, and Lucide React. Added the shared cn() helper and applied the dark palette to the app and Clerk screens.

- Editor chrome (02). Added the fixed-height navbar, sliding project sidebar with empty tabs, and token-styled dialog content pattern.

- Editor route (02). Mounted the workspace chrome at the protected `/editor` route and added Playwright regression tests against it.

- Authentication (03). Applied the Clerk dark theme and app tokens, built responsive sign-in and sign-up screens, and added session-based root redirects, default route protection, and the Clerk account menu in the editor.

- Project Dialogs & Editor Home (04). Added the centered editor home, create dialog with live slug preview, rename dialog with keyboard submission, and destructive delete confirmation. Both create entry points use the same dialog. Sidebar actions are available for owned projects, and an outside tap dismisses the sidebar on mobile. Mock edits live in memory for the current page.

- Prisma Schema And Data Layer (05). Added the Project and ProjectCollaborator models, enum, indexes, cascade relation, cached connection-aware client, and initial SQL migration. Applied the migration to PostgreSQL and regenerated Prisma Client.

- Project APIs (06). Added authenticated list/create/rename/delete handlers, owner-scoped listing, default create names, existing Prisma IDs, owner-only mutations, JSON validation/errors, and focused API regression tests. UI remains unchanged.

- Wire Editor Home (07). Added server-side owned/shared project lists, sidebar workspace links, and `useProjectActions` for API-backed dialogs. Create previews and persists an aligned project/room ID before navigating; rename refreshes; delete refreshes or redirects to `/editor` when deleting the active room. Pending actions prevent duplicate submissions and errors remain visible for retry.

- Editor Workspace Shell (08). Added the server-rendered `/editor/[roomId]` route, reusable Clerk identity and project access helpers, and a shared access-denied view for unavailable projects. The workspace shows the current project name, highlighted sidebar room, disabled share action, canvas placeholder, and toggleable AI placeholder. Existing project dialogs remain connected to their APIs. No canvas, Liveblocks, AI chat, or sharing behavior was added.

- Share Dialog (09). Enabled the workspace Share button and added owner-managed invitations, collaborator removal, and project-link copying with temporary Copied! feedback. Collaborators see a read-only list. Added authenticated collaborator APIs, owner-scoped mutations, validated and normalized email input, duplicate handling, and Clerk name/avatar enrichment with email fallback. Uses the existing collaborator model without a local user table or email delivery.

## In Progress

- None.

## Next Up

- Await the next feature specification.

## Open Questions

- None.

## Architecture Decisions

- Add decisions that affect the system design or data model.

- Project API contract (06): list returns `{ projects }` for the authenticated owner's projects; create/rename return `{ project }` (201/200), delete returns 204, and errors return `{ error }`. Missing records return 404. JSON object bodies accept a non-empty trimmed `name`; an omitted create name defaults to `Untitled Project`. Only name is accepted into mutations; owner and ID always come from Clerk and Prisma respectively.

- Editor home contract (07): extends feature 06 with an optional validated `roomId` in create requests, persisted as the Project ID so room and project identity stay aligned. Omitting it retains CUID generation; raw `id` and `ownerId` remain ignored. No existing data helper was present, so `lib/projects.ts` supplies the server-side owned and primary-email collaborator queries. The workspace destination route remains feature 08.

## Session Notes

- Alternative palette verification passed the production build, including Prisma generation and TypeScript. Contrast checks passed at 4.5:1 or higher for primary/secondary/muted text, button labels, brand/AI accents, and status colors on their intended surfaces. Signed-in visual verification was not run.

- Share Dialog (09) completed on 2026-11-16. Production build (Prisma generation, Next.js compilation and TypeScript), ESLint, and all 38 Node regression tests passed. New coverage checks signed-out and unauthorized access, owner-scoped invite/remove writes, collaborator read-only access, normalized/invalid/duplicate emails, missing projects, Clerk enrichment/fallback, client list updates, pending guards, retry behavior, temporary clipboard feedback, and owner/collaborator dialog markup. Production HTTP checks confirmed JSON 401 responses for GET, POST, and DELETE on the collaborator endpoint. Extended the signed-in Playwright scenario with invite/remove, clipboard, and focus-restoration checks; it remains unrun because `E2E_CLERK_USER_EMAIL` is not configured. Node tests use Clerk/Prisma/fetch boundary doubles; no live signed-in database round trip was run. Used `pnpm --config.verifyDepsBeforeRun=false run build` because npm is unavailable in this shell.

- Editor Workspace Shell (08) completed on 2026-11-16. TypeScript, ESLint, the production build, and all 21 Node regression tests passed. New boundary tests cover Clerk primary-email identity, owner/collaborator query scoping, signed-out redirects before data access, denied rooms before sidebar queries, and authorized workspace props. Production HTTP verification confirmed the workspace returns a 307 redirect to sign-in when signed out. Extended the Playwright scenario for workspace controls, active-room highlighting, mobile width, and the missing-project view; signed-in browser execution remains unrun because `E2E_CLERK_USER_EMAIL` is not configured. Authorization tests use Clerk/Prisma boundary doubles; no live signed-in database round trip was run.

- The production build, lint, and frozen lockfile check passed. Browser smoke checks covered all seven primitives and both Clerk screens with a light browser preference. The generated UI sources matched their installation hashes, and `cn()` merged conflicting utilities.

- Editor chrome passed TypeScript, lint, and desktop and mobile browser checks in an isolated fixture. The browser checks covered the navbar controls, both sidebar tabs, canvas dimensions, and the dialog pattern.

- Editor route passed the production build, TypeScript, lint, and the signed-out Playwright redirect check. The signed-in desktop and mobile layout test requires an existing Clerk development test user configured through `E2E_CLERK_USER_EMAIL`.

- Authentication (03) passed the npm production build, lint, and Playwright checks against the production build. Browser coverage included signed-out redirects and protected routes, both public auth forms at desktop and mobile widths, the signed-in editor redirect and layout, and the Clerk account menu and sign-out.

- Project Dialogs & Editor Home (04) passed TypeScript, lint, and isolated desktop and mobile Edge checks. The browser fixture used the editor components and styles with a stubbed Clerk account control. The full Playwright suite stopped during its production build because Turbopack could not spawn a CSS worker in this environment. Signed-in route coverage also requires `E2E_CLERK_USER_EMAIL`.

- Prisma setup (05): added the multi-file schema, cached direct/Accelerate client, generated migration, and client generation in the build script. Prisma validation, TypeScript (including query and transaction call sites), lint, singleton initialization/cache reuse for both connection branches, and the production build passed. The build required the Node executable directory on PATH for the Windows CSS worker. Migration application is deferred until the user finishes initial setup.

- Prisma setup (05) completed on 2026-11-12 with Prisma ORM 7.10.1. Applied 20261111090000_init_projects using the connection loaded from .env.local and regenerated the client. Schema validation passed, migration status is up to date, and schema diff found no differences. Read-only counts through the application singleton returned zero projects and zero collaborators; development singleton reuse passed. The production build script (Prisma generation and Next.js build, including TypeScript) passed using pnpm with the Node executable directory on PATH. All feature 05 checks are complete.

- Project APIs (06) completed on 2026-11-12. Eight handler tests passed via node --test tests/api/projects.test.mjs, covering signed-out access, owner-scoped listing, creation defaults and forged fields, invalid input, owner/non-owner mutations, and missing records. TypeScript and lint passed. The production build script (Prisma generation and Next.js build) passed using pnpm --config.verifyDepsBeforeRun=false run build; npm is unavailable in this shell. Production HTTP checks at localhost verified JSON 401 responses for all four endpoints and preserved the editor sign-in redirect. The test server required the bundled Node directory on PATH. Authenticated handler tests use Clerk/Prisma boundary doubles; a live signed-in database round trip was not run.

- Wire Editor Home (07) completed on 2026-11-16. All 18 focused Node regression tests passed, covering existing API authorization plus server query scoping, room ID validation and persistence, duplicate-ID conflicts, create navigation, rename refresh, both delete paths, errors, and pending submission guards. ESLint, TypeScript, and the production build passed. Used `pnpm --config.verifyDepsBeforeRun=false run build` because npm is unavailable; the build needed network access for existing Google Fonts. Updated the Playwright scenario for persisted projects; signed-in browser execution was not run because `E2E_CLERK_USER_EMAIL` is not configured. Tests use Clerk/Prisma/router boundary doubles; no live signed-in database round trip was run. The create destination is intentionally the feature 08 route, which is not implemented yet.
