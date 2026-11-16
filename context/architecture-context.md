# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app` — Root-level Next.js App Router, colocated with `proxy.ts` so Next.js loads the proxy in development and production.
- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Multi-file database schema and SQL migrations. The generated Prisma client lives in `src/generated/prisma` and is regenerated during builds.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth and Collaboration Model

- Every project has a single owner (`Project.ownerId`, a Clerk user ID; no local user table).
- Projects can include additional collaborators, uniquely identified by project and email; deleting a project cascades to its collaborator records.
- The root proxy redirects `/` by session state and requires a Clerk session by default. Only the configured sign-in and sign-up paths and their nested steps are public application routes. For `/api/projects` and its nested routes, the proxy initializes Clerk and delegates session enforcement to the handlers so signed-out requests return JSON 401 responses.
- Protected resources verify the session where they read or mutate data.
- Only the owner or a collaborator can mutate project resources. Project rename and delete are restricted to the owner.
- Liveblocks room tokens are issued only after verifying project membership.

## Editor Project Data (07)

- The editor home loads owned and shared project lists on the server through `lib/projects.ts`. Shared projects match the signed-in user's Clerk primary email, case-insensitively, and exclude owned projects.
- `hooks/use-project-actions.ts` owns dialog state and API mutations. Initial project lists are server props; rename/delete refresh the route.
- New editor projects use a slug plus a random 12-character suffix as both the Project ID and future Liveblocks room ID. POST accepts an optional validated `roomId`; callers omitting it retain the schema's CUID default. Client-supplied `id` and `ownerId` remain ignored. Duplicate room IDs return 409.
- Create navigates to `/editor/[roomId]`.

## Editor Workspace Shell (08)

- `/editor/[roomId]` is a Server Component. `lib/project-access.ts` resolves the Clerk user ID and primary email and queries the requested project by owner or case-insensitive collaborator email.
- Signed-out requests redirect to sign-in. Missing and inaccessible projects render the same `AccessDenied` view before sidebar lists are loaded.
- The shared `EditorWorkspace` renders the home or current project shell from server props. Project workspaces highlight the current room and provide canvas and AI placeholders.

## Project Sharing (09)

- `/api/projects/[projectId]/collaborators` lists collaborators with GET and accepts `{ email }` for POST invitations and DELETE removals. Listing requires project membership; mutations require ownership and retain owner constraints in database writes.
- Invitations grant access immediately through `ProjectCollaborator`; no email delivery or local user table is introduced. New addresses are trimmed and lowercased, duplicates return 409, and removal matches email case-insensitively.
- The listing returns `{ isOwner, collaborators }`. Clerk Backend API lookups enrich stored emails with display names and avatars; unknown users or unavailable profile lookups fall back to email. Profiles are fetched only after project access is verified.
- The workspace Share dialog loads permissions from the server. Owners can invite, remove, and copy the project link; collaborators see the list only.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev.
- Output: structured node and edge updates written into the shared Liveblocks room.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to the filesystem and linked to the project in the database.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
