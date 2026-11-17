# Architecture AI

A workspace for turning system design ideas into something your team can build together.

The goal is simple: describe a system, shape its architecture on a shared canvas, and turn the result into a technical specification. We're building toward that one feature at a time. Today, the app gives you a place to create projects, share access, and bring your team into the same workspace.

## What works today

- **Your own workspace.** Sign up or sign in with Clerk, then browse projects you own and projects shared with you.
- **Project management.** Create a project, give it a name, open its workspace, and rename or delete projects you own. Project data is saved in PostgreSQL.
- **Sharing by email.** Owners can grant access, remove collaborators, and copy a project link. Collaborators can open shared projects and view the member list.
- **A dark editor shell.** Project navigation, account controls, a Share dialog, and a toggleable AI sidebar are in place.

Sharing grants access immediately to the matching signed-in email address; it doesn't send an invitation email. The architecture canvas and AI assistant currently show placeholders. Real-time diagram editing, starter designs, AI generation, and Markdown spec export are still ahead.

## Run it locally

You'll need Node.js, pnpm, a PostgreSQL database, and a Clerk application.

Install the dependencies:

```sh
pnpm install
```

Create `.env.local` in the project root with your own connection details and Clerk keys:

```dotenv
DATABASE_URL=your_postgresql_connection_string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Generate the Prisma client, apply the database migrations, and start the app:

```sh
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Open [localhost:3000](http://localhost:3000), sign in, and create your first project. The editor lives at `/editor`.

## Under the hood

The current app uses Next.js 16 and React 19 with TypeScript, Tailwind CSS, shadcn/ui, and Lucide icons. Clerk handles authentication, while Prisma 7 connects project and collaborator data to PostgreSQL.

Routes and API handlers live in `app/`. Editor components, hooks, and shared helpers live in `src/`. The database schema and migrations live in `prisma/`.

The planned canvas, background AI tasks, and artifact storage are described in `context/`; their integrations aren't implemented yet.

## Checking changes

```sh
pnpm lint
pnpm test:api
pnpm build
```

The Node regression suite covers project APIs, access checks, sharing, and client action behavior using boundary doubles. The production build also generates Prisma Client and checks TypeScript.

For browser tests:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright builds and serves the app on port 3100. Signed-in coverage needs `E2E_CLERK_USER_EMAIL` in `.env.local`, pointing to an existing Clerk development test user without MFA or pending session tasks. Use a `+clerk_test` address to suppress test email delivery.

## Working on the project

Start with `AGENTS.md` and the files in `context/`. They explain the product, architecture, UI conventions, and development workflow. `context/progress-tracker.md` records what's complete, and `context/feature-specs/` contains the individual feature specifications.

This is an early version. The project and sharing foundation is ready; the next pieces will bring the system design workspace to life.
