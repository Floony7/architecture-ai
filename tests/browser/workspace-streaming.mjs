// Exercise the real workspace page with delayed request-time profile data in
// Next.js. Auth/project dependencies are fixture doubles; no user data is read.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const root = process.cwd();
const fixture = path.join(root, "test-results", "workspace-streaming-fixture");
const baseline = process.argv.includes("--without-boundary");
const baseURL = "http://localhost:3112";
await mkdir(path.join(fixture, "app/editor/[roomId]"), { recursive: true });
await mkdir(path.join(fixture, "app/api/identity"), { recursive: true });
await mkdir(path.join(fixture, "stubs"), { recursive: true });
await writeFile(path.join(fixture, "package.json"), JSON.stringify({ private: true }));
await writeFile(path.join(fixture, "next.config.mjs"), `export default { cacheComponents: true, partialPrefetching: true, turbopack: { root: ${JSON.stringify(root)} }, devIndicators: false };`);
await writeFile(path.join(fixture, "tsconfig.json"), JSON.stringify({
  extends: "../../tsconfig.json", compilerOptions: { paths: {
    "@/lib/project-access": ["./stubs/project-access.ts"],
    "@/lib/projects": ["./stubs/projects.ts"],
    "@/components/editor/editor-workspace": ["./stubs/editor-workspace.tsx"],
    "@/*": ["../../src/*"],
  } }, include: ["app/**/*.tsx", "stubs/**/*.ts", "stubs/**/*.tsx", "next-env.d.ts", ".next/dev/types/**/*.ts"],
}));
await writeFile(path.join(fixture, "app/layout.tsx"), 'export default function Layout({children}: {children: React.ReactNode}) { return <html lang="en"><head><link rel="icon" href="data:," /></head><body>{children}</body></html>; }');
await writeFile(path.join(fixture, "app/editor/page.tsx"), 'import Link from "next/link"; export default function Home() { return <Link href="/editor/alpha" prefetch={false}>Open alpha</Link>; }');
await writeFile(path.join(fixture, "app/api/identity/route.ts"), 'export async function GET() { await new Promise(resolve => setTimeout(resolve, 1200)); return Response.json({userId: "fixture-user", email: "fixture@example.test"}); }');
await writeFile(path.join(fixture, "stubs/project-access.ts"), `export async function getCurrentIdentity() {
  const response = await fetch("${baseURL}/api/identity", { cache: "no-store" });
  return response.json();
}
export async function getAccessibleProject(id: string) { return { id, name: id }; }`);
await writeFile(path.join(fixture, "stubs/projects.ts"), 'export async function getOwnedProjects() {return [];} export async function getSharedProjects() {return [];}');
await writeFile(path.join(fixture, "stubs/editor-workspace.tsx"), `import Link from "next/link";
export function EditorWorkspace({project}: {project: {id: string; name: string}}) {
  return <main><h1>{project.name}</h1><Link href={project.id === "alpha" ? "/editor/beta" : "/editor/alpha"} prefetch={false}>Other room</Link></main>;
}`);
await writeFile(path.join(fixture, "app/editor/[roomId]/page.tsx"), await readFile(path.join(root, "app/editor/[roomId]/page.tsx")));
await writeFile(path.join(fixture, "app/editor/loading.tsx"), await readFile(path.join(root, "app/editor/loading.tsx")));
if (!baseline) await writeFile(path.join(fixture, "app/editor/[roomId]/loading.tsx"), await readFile(path.join(root, "app/editor/[roomId]/loading.tsx")));
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", fixture, "--port", "3112"], {
  cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` },
});
let output = "";
server.stdout.on("data", data => { output = (output + data).slice(-14000); });
server.stderr.on("data", data => { output = (output + data).slice(-14000); });
let browser;
try {
  await expect.poll(async () => {
    try { return (await fetch(`${baseURL}/editor`)).ok; } catch { return false; }
  }, { timeout: 90000 }).toBe(true);
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${baseURL}/editor`);
  await page.getByRole("link", { name: "Open alpha" }).click();
  if (!baseline) await expect(page.getByRole("status")).toHaveText("Loading editor…");
  await expect(page.getByRole("heading", { name: "alpha", exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole("link", { name: "Other room" }).click();
  if (!baseline) await expect(page.getByRole("status")).toHaveText("Loading editor…");
  await expect(page.getByRole("heading", { name: "beta", exact: true })).toBeVisible({ timeout: 30000 });
  const diagnostics = [...errors, output].join("\n");
  const blocked = /uncached data|blocking-prerender-dynamic|outside.{0,30}Suspense/i.test(diagnostics);
  if (baseline) {
    assert.ok(blocked, "Expected the parent-only boundary to reproduce the navigation diagnostic");
    console.log("Reproduced the uncached-data navigation diagnostic with only the parent loading boundary.");
  } else {
    assert.equal(blocked, false, "Unexpected uncached-data diagnostic during workspace navigation");
    assert.deepEqual(errors, []);
    console.log("Passed: editor-to-room and room-to-room navigation stream the local loading fallback and finish without uncached-data errors.");
  }
} catch (error) {
  console.error(output.slice(-3500));
  throw error;
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const exited = new Promise(resolve => server.once("exit", resolve));
    server.kill();
    await exited;
  }
  assert.equal(path.dirname(fixture), path.join(root, "test-results"));
  await rm(fixture, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
