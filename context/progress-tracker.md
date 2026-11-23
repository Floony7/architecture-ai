# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Node Color Toolbar (15) — Complete

## Current Goal

- Collaborators can choose a predefined fill and text color pair from the selected node's toolbar.

## Completed

- Node Color Toolbar (15) (2026-11-23). Selected nodes display a floating toolbar with eight palette swatches. A matching ring marks the active swatch, and hover adds a small glow. Selecting a swatch syncs the fill through the existing canvas state and applies the matching text color to the label and inline editor.

- Node Editing (14) (2026-11-23). Empty nodes display a centered “Add label” prompt. Double-clicking the label area opens a textarea that syncs edits as users type and closes on blur or Escape. Text editing keeps node and viewport positions fixed. Selected-node resize handles and minimum dimensions use the existing collaborative flow.

- Node Shapes (13) (2026-11-23). Reused the existing CSS and SVG geometry and selection outlines. The shape panel now supplies a cursor-centered native drag preview with the same geometry and default dimensions as the dropped node. The browser clears the preview on drop or cancellation.

- Canvas interaction fixes (2026-11-23). Rendered the six stored shape types with CSS and SVG. Selected nodes show resize handles, and circle resizing preserves aspect ratio. Added Delete and Backspace support plus a Delete selection button that uses the existing collaborative deletion flow. Added zoom and fit controls, an expanded zoom range, and an interactive minimap with clearance above the Liveblocks badge.

- Workspace navigation streaming repair (2026-11-17). Added app/editor/[roomId]/loading.tsx, reusing the existing editor loading UI, so uncached Clerk/profile/project reads have a route-local Suspense boundary during client navigation. The parent editor loading boundary was shared across navigations and could not supply the required fallback below that shared segment. Authorization, request-time user reads, and caching configuration are unchanged.

- Shape Panel (12). Added the floating bottom-center pill toolbar with draggable icons for rectangle, diamond, circle, pill, cylinder, and hexagon. Shared defaults define shape dimensions and the neutral node color. Drag payloads include shape and size and are validated before creation. Drop positions use React Flow coordinate conversion inside a ReactFlowProvider; new canvasNode IDs combine shape, timestamp, and a counter, with empty labels and default color. Nodes are created through Liveblocks-synced changes and render as basic bordered rectangles with centered labels and hover handles. Container-based spacing keeps all toolbar buttons clear of the minimap and Liveblocks badge on narrow canvases.

- Base Canvas (11). Replaced the project workspace placeholder with a client-side Liveblocks room wrapper and React Flow canvas while keeping the workspace page server-side. Added initial presence, loading suspense, render/connection error fallbacks, empty Liveblocks-synced nodes and edges with change/connect/delete handlers, shared canvas node/edge types, loose connections, fitView, minimap, and dot background. Applied shared dark tokens without adding controls, custom renderers, artifact persistence, or AI behavior.

- Liveblocks Setup (10). Defined nullable cursor and isThinking presence plus user ID/name/avatar/color metadata. Added the missing @liveblocks/node 3.25.1 server SDK, a lazy global cached server-only client, and a deterministic fixed cursor palette. Implemented POST /api/liveblocks-auth with Clerk authentication, existing project access checks, private get-or-create rooms, exact project room grants, and trusted user metadata. Missing/inaccessible projects return 403. Updated the proxy so signed-out requests receive JSON 401 from the handler. Canvas UI remains feature 11.
- Context file discovery repair (2026-11-17). Removed the `/context` rule from `.gitignore`, which excluded tracked project documentation and all feature specs from ignore-aware file search. Verified that standard `rg --files context/feature-specs` discovers all 30 spec files and that Git ignore checks no longer match them. Codex file-reference picker behavior still needs confirmation in the app.

- Dependency installation repair (2026-11-17). Identified npm 12.0.2 crashing in Arborist while traversing pnpm-linked dependencies during the Liveblocks/React Flow install. Pinned the existing pnpm 11.25.0 version in package.json and documented pnpm-only dependency commands. Installed the original five packages using pnpm: Liveblocks client/react/react-ui/react-flow 3.25.1 and @xyflow/react 12.12.1, matching the Liveblocks integration peer requirement (^12). This installs canvas prerequisites only; no canvas functionality changed. Verification: final offline frozen-lockfile install passed, pnpm peers check reported no issues, TypeScript passed, and all 38 Node regression tests passed.

- PostgreSQL SSL startup warning (2026-11-16). Changed the local `DATABASE_URL` from `sslmode=require` to `sslmode=verify-full`, preserving the pg driver's current certificate and hostname verification behavior without its compatibility warning. Other environments need the same connection setting if they use the deprecated alias.

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

- Node Color Toolbar (15) verified on 2026-11-23. The two-client Liveblocks browser fixture with substitute auth checked selection visibility, spacing above the node, hover and pressed styling, keyboard activation, viewport isolation, and matching fill and text updates for CSS and SVG nodes. Production build via pnpm, TypeScript, ESLint, and all 46 API regression tests passed.

- Node Editing (14) verified on 2026-11-23. The two-client Liveblocks browser fixture with substitute auth passed live label updates, the empty prompt, blur and Escape dismissal, Backspace while editing, text selection and wheel isolation, and synchronized minimum circle size. Production build via pnpm, TypeScript, ESLint, and all 46 API regression tests passed.

- Node Shapes (13) verified on 2026-11-23. The two-client Liveblocks fixture in headless Edge checked the native drag image setup for all six shapes, including matching shape markup, default dimensions, centered cursor offsets, and cleanup after drop and simulated cancellation. The native drop and existing collaboration checks passed. The fixture checks the source element sent to the browser and does not capture the OS drag image. Production build via pnpm, TypeScript, ESLint, and all 46 API regression tests passed.

- Canvas interaction fixes verified on 2026-11-23. The two-client browser fixture against a temporary private Liveblocks room passed shape rendering, native and transformed-coordinate drops, wheel and button zoom, responsive control placement, shared movement and resize dimensions, and selection deletion by button, Delete, and Backspace. It confirmed that deleting a node removes its connected edge. The fixture uses substitute authentication. Full Clerk-authenticated E2E was skipped because `E2E_CLERK_USER_EMAIL` is absent. Production build, TypeScript, ESLint, and all 46 API regression tests passed.

- Workspace streaming repair verified on 2026-11-17. A Next.js 16.4.5 browser fixture with Cache Components and partial prefetching reproduced the uncached-data diagnostic using only the parent loading boundary. With the actual route-local loading module, editor-to-room and room-to-room navigation showed the loading fallback and completed without console or uncached-data errors. The fixture uses the real workspace page with delayed request-time profile fetches and substitutes auth/project dependencies; no live Clerk session or application data was used. The fixture and server were removed afterward. Production build (including TypeScript), ESLint, all 46 Node regression tests, and git diff --check passed. Build ran through pnpm with access to the existing Google Fonts downloads. Documented the repeatable browser check in README.md.

- Shape Panel (12) completed on 2026-11-17. Final production build (Prisma generation, Next.js compilation, and TypeScript), ESLint, standalone TypeScript, all 46 Node regression tests, and the expanded two-client real Liveblocks browser check passed. Used pnpm for the existing build script because npm is unavailable; the build used network access for existing Google Fonts. Browser checks verified all six payloads and default dimensions, canvasNode type/data, empty labels/default fill, unique shape/timestamp/counter IDs, pan/zoom/header-offset drop coordinates, native browser dragging, invalid payload rejection, synchronized labels, mobile layout, and unobstructed button hit targets in both a 320px window and a 400px canvas inside a desktop window. Existing movement, loose connection, deletion, reload, loading, and error checks still pass. Reviewed desktop/mobile screenshots under test-results. Temporary room and fixture were deleted; no application project data changed. The fixture substitutes auth responses; full Clerk-authenticated application E2E was not run. No shape-specific geometry, ghost preview, resize/label editing, persistence, or AI behavior was added.

- Base Canvas (11) completed on 2026-11-17. Production build (including Prisma generation and TypeScript), ESLint, standalone TypeScript, all 46 Node regressions, and the isolated real Liveblocks browser check passed. Used pnpm to run the existing build script because npm is unavailable; the build used network access for existing Google Fonts. Two headless Edge browser contexts verified loading, initially empty diagrams, minimap/dots, absence of controls, shared node movement, loose source-to-source connections, node/edge deletion, reload continuity, and a denied-auth error fallback. Visually reviewed desktop/mobile/error screenshots in test-results; the fixture explicitly scans src for Tailwind classes. The test created and deleted its own private room and removed its local fixture afterward. No application project data changed. Extended the existing signed-in E2E scenario with empty canvas assertions; full Clerk-authenticated application E2E remains unrun because E2E_CLERK_USER_EMAIL is not configured. The isolated browser fixture replaces the auth response only for that test.

- Liveblocks credentials verified on 2026-11-17 after the user added LIVEBLOCKS_SECRET_KEY and LIVEBLOCKS_PUBLIC_KEY to .env.local. Confirmed both keys are present with expected prefixes without displaying their values. An authenticated getRooms request through @liveblocks/node passed with network access; the initial sandbox request was blocked with EACCES. No rooms or application data changed. This verifies the secret/API connection; public-key validity and the full Clerk-authenticated room/token flow were not tested. The current session-based auth endpoint uses the secret key only.

- Liveblocks Setup (10) completed on 2026-11-17. All 46 Node regression tests, ESLint, standalone TypeScript, and the production build passed using pnpm to run the existing build script (npm is unavailable in this shell). Eight new tests cover signed-out access, malformed/wildcard room IDs, inaccessible projects, exact private room grants, trusted metadata and display-name fallbacks, upstream failures, cached client initialization, and deterministic colors. A running production server returned JSON 401 without redirect for signed-out POST /api/liveblocks-auth. The initial sandbox build could not fetch existing Google Fonts; the network-enabled build passed. Local LIVEBLOCKS_SECRET_KEY is not configured, so authenticated live room creation and real token issuance were not run; Clerk/Prisma/Liveblocks boundaries are doubled in automated tests. The temporary production server was stopped.
- SSL configuration verification: the installed pg connection parser reported TLS enabled, certificate verification enabled, and zero warnings. A live read-only `SELECT 1` through pg passed with an authorized TLS connection and zero SSL-mode warnings. The initial sandboxed connection was blocked with EACCES; the permitted network check passed. No application code, Prisma 7.10.1 dependencies, schema, or data changed. Restart the development server to replace the cached Prisma connection pool.

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
