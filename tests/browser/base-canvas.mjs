// Runs the real canvas in an isolated Next.js fixture against a temporary
// Liveblocks room. Clerk authentication is replaced only in this browser fixture.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import nextEnv from "@next/env";
import { Liveblocks } from "@liveblocks/node";
import { mutateFlow } from "@liveblocks/react-flow/node";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const root = process.cwd();
nextEnv.loadEnvConfig(root);
assert.ok(process.env.LIVEBLOCKS_SECRET_KEY, "LIVEBLOCKS_SECRET_KEY is required");
const client = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
const roomId = `base-canvas-check-${randomUUID()}`;
const fixture = path.join(root, "test-results", "base-canvas-fixture");
const baseURL = "http://localhost:3111";
await mkdir(path.join(fixture, "app"), { recursive: true });
await writeFile(path.join(fixture, "package.json"), JSON.stringify({ private: true }));
await writeFile(path.join(fixture, "tsconfig.json"), JSON.stringify({
  extends: "../../tsconfig.json",
  compilerOptions: { paths: { "@/*": ["../../src/*"] } },
  include: ["app/**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
}));
await writeFile(path.join(fixture, "next.config.mjs"), `export default { turbopack: { root: ${JSON.stringify(root)}, rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } }, devIndicators: false };`);
await writeFile(path.join(fixture, "app", "fixture.css"), '@import "../../../app/globals.css";\n@source "../../../src";');
await writeFile(path.join(fixture, "app", "layout.tsx"), `import "./fixture.css";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}`);
await writeFile(path.join(fixture, "app", "page.tsx"), `import { EditorCanvas } from "../../../src/components/editor/editor-canvas";
export default async function Page({ searchParams }: { searchParams: Promise<{ room: string }> }) {
  const { room } = await searchParams;
  return <main style={{height: "100dvh"}}><EditorCanvas roomId={room} /></main>;
}`);
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", fixture, "--port", "3111"], {
  cwd: root, windowsHide: true, env: { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", data => { serverOutput = (serverOutput + data).slice(-8000); });
server.stderr.on("data", data => { serverOutput = (serverOutput + data).slice(-8000); });
let browser;
let createdRoom = false;
try {
  await expect.poll(async () => {
    try { return (await fetch(`${baseURL}/?room=${roomId}`)).ok; } catch { return false; }
  }, { timeout: 90000 }).toBe(true);
  await client.createRoom(roomId, { defaultAccesses: [] });
  createdRoom = true;
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  let releaseAuth;
  const authGate = new Promise(resolve => { releaseAuth = resolve; });
  await Promise.all(pages.map(async (page, index) => {
    await page.route("**/api/liveblocks-auth", async route => {
      await authGate;
      assert.equal(route.request().postDataJSON().room, roomId);
      const session = client.prepareSession(`canvas-test-${index}`, {
        userInfo: { name: "Canvas verifier", avatar: "", color: "#52A8FF" },
      });
      session.allow(roomId, ["*:write"]);
      const { status, body } = await session.authorize();
      await route.fulfill({ status, body, contentType: "application/json" });
    });
    await page.goto(`${baseURL}/?room=${roomId}`);
    await expect(page.getByRole("status")).toHaveText("Loading canvas…");
    await expect.poll(() => page.getByRole("status").evaluate(element => getComputedStyle(element).display)).toBe("grid");
  }));
  console.log("Loading states passed; connecting two Liveblocks clients.");
  releaseAuth();
  for (const page of pages) {
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 30000 });
    await expect(page.locator(".react-flow__minimap")).toBeVisible();
    await expect(page.locator(".react-flow__background-pattern.dots")).toHaveCount(1);
    await expect(page.locator(".react-flow__controls")).toHaveCount(0);
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  }
  await pages[0].screenshot({ path: path.join(root, "test-results", "base-canvas-desktop.png") });
  await pages[0].setViewportSize({ width: 320, height: 640 });
  assert.equal(await pages[0].evaluate(() => document.documentElement.scrollWidth), 320);
  await expect(pages[0].locator(".react-flow__minimap")).toBeInViewport();
  await pages[0].screenshot({ path: path.join(root, "test-results", "base-canvas-mobile.png") });
  await pages[0].setViewportSize({ width: 1280, height: 720 });

  // Check actual toolbar payloads and shared custom-node creation after panning,
  // zooming, and moving the canvas below a simulated header.
  const shapes = {
    rectangle: { width: 160, height: 96 }, diamond: { width: 180, height: 140 },
    circle: { width: 120, height: 120 }, pill: { width: 160, height: 80 },
    cylinder: { width: 140, height: 120 }, hexagon: { width: 160, height: 120 },
  };
  const toolbar = pages[0].getByRole("toolbar", { name: "Shapes" });
  await expect(toolbar.getByRole("button")).toHaveCount(6);
  await pages[0].locator("main").evaluate(element => {
    element.style.marginTop = "64px";
    element.style.height = "calc(100dvh - 64px)";
  });
  await pages[0].mouse.move(700, 250);
  await pages[0].mouse.down();
  await pages[0].mouse.move(760, 290, { steps: 8 });
  await pages[0].mouse.up();
  const viewport = pages[0].locator(".react-flow__viewport");
  const beforeZoom = await viewport.getAttribute("style");
  await pages[0].mouse.wheel(0, 250);
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(beforeZoom);
  // Wheel zoom animates; wait for it to settle before checking coordinates.
  await pages[0].waitForTimeout(350);
  const createdIds = [];
  let index = 0;
  for (const [shape, size] of Object.entries(shapes)) {
    // Button labels use title case.
    const source = toolbar.getByRole("button", { name: shape[0].toUpperCase() + shape.slice(1), exact: true });
    await expect(source).toHaveAttribute("draggable", "true");
    const transfer = await pages[0].evaluateHandle(() => new DataTransfer());
    await source.dispatchEvent("dragstart", { dataTransfer: transfer });
    assert.deepEqual(await transfer.evaluate(data => JSON.parse(data.getData("application/architecture-ai-shape"))), { shape, ...size });
    const x = 180 + (index % 3) * 280;
    const y = 180 + Math.floor(index / 3) * 200;
    const expected = await pages[0].locator(".react-flow").evaluate((element, point) => {
      const rect = element.getBoundingClientRect();
      const matrix = new DOMMatrix(getComputedStyle(element.querySelector(".react-flow__viewport")).transform);
      return { x: (point.x - rect.left - matrix.e) / matrix.a, y: (point.y - rect.top - matrix.f) / matrix.d };
    }, { x, y });
    const pane = pages[0].locator(".react-flow__pane");
    await pane.dispatchEvent("dragover", { dataTransfer: transfer, clientX: x, clientY: y });
    await pane.dispatchEvent("drop", { dataTransfer: transfer, clientX: x, clientY: y });
    await source.dispatchEvent("dragend", { dataTransfer: transfer });
    await transfer.dispose();
    index++;
    for (const page of pages) await expect(page.locator(".react-flow__node-canvasNode")).toHaveCount(index);
    let node;
    await mutateFlow({ client, roomId }, flow => { node = flow.nodes.find(item => item.data.shape === shape); });
    assert.ok(node);
    assert.match(node.id, new RegExp("^" + shape + "-[0-9]+-[0-9]+$"));
    assert.equal(node.type, "canvasNode");
    assert.deepEqual(node.data, { label: "", color: "#1F1F1F", shape });
    assert.equal(node.width, size.width);
    assert.equal(node.height, size.height);
    assert.ok(Math.abs(node.position.x - expected.x) < 0.01);
    assert.ok(Math.abs(node.position.y - expected.y) < 0.01);
    createdIds.push(node.id);
  }
  assert.equal(new Set(createdIds).size, 6);
  await expect(pages[0].locator(".canvas-node")).toHaveCount(6);
  await expect(pages[0].locator(".canvas-node svg")).toHaveCount(0);
  // Exercise a real native browser drag as well as the payload-boundary checks.
  await toolbar.getByRole("button", { name: "Rectangle", exact: true }).dragTo(pages[0].locator(".react-flow__pane"), { targetPosition: { x: 420, y: 350 } });
  for (const page of pages) await expect(page.locator(".react-flow__node-canvasNode")).toHaveCount(7);
  await mutateFlow({ client, roomId }, flow => {
    for (const node of flow.nodes) if (!createdIds.includes(node.id)) createdIds.push(node.id);
    flow.updateNodeData(createdIds[0], { label: "Shared label" });
  });
  for (const page of pages) await expect(page.locator(".canvas-node").filter({ hasText: "Shared label" })).toHaveCount(1);
  const invalid = await pages[0].evaluateHandle(() => new DataTransfer());
  for (const value of ['{', '{"shape":"triangle","width":100,"height":100}', '{"shape":"circle","width":0,"height":100}', '{"shape":"circle","width":100}', '{"shape":"circle","width":"100","height":100}']) {
    await invalid.evaluate((data, value) => data.setData("application/architecture-ai-shape", value), value);
    await pages[0].locator(".react-flow__pane").dispatchEvent("drop", { dataTransfer: invalid, clientX: 400, clientY: 300 });
  }
  await invalid.dispose();
  for (const page of pages) await expect(page.locator(".react-flow__node-canvasNode")).toHaveCount(7);
  await pages[0].screenshot({ path: path.join(root, "test-results", "shape-panel-desktop.png") });
  await pages[0].setViewportSize({ width: 320, height: 640 });
  await expect(toolbar).toBeInViewport();
  for (const button of await toolbar.getByRole("button").all()) {
    await expect(button).toBeInViewport();
    const bounds = await button.boundingBox();
    const hit = await pages[0].evaluate(point => document.elementFromPoint(point.x, point.y)?.closest("button")?.getAttribute("aria-label"), { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
    assert.equal(hit, await button.getAttribute("aria-label"));
  }
  const panelBounds = await toolbar.boundingBox();
  const mapBounds = await pages[0].locator(".react-flow__minimap").boundingBox();
  assert.ok(mapBounds.y + mapBounds.height <= panelBounds.y);
  assert.equal(await pages[0].evaluate(() => document.documentElement.scrollWidth), 320);
  await pages[0].screenshot({ path: path.join(root, "test-results", "shape-panel-mobile.png") });
  await pages[0].setViewportSize({ width: 1280, height: 720 });
  // Sidebars can narrow the canvas even in a desktop-sized window.
  await pages[0].locator("main").evaluate(element => { element.style.width = "400px"; });
  for (const button of await toolbar.getByRole("button").all()) {
    const bounds = await button.boundingBox();
    const hit = await pages[0].evaluate(point => document.elementFromPoint(point.x, point.y)?.closest("button")?.getAttribute("aria-label"), { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
    assert.equal(hit, await button.getAttribute("aria-label"));
  }
  await pages[0].locator("main").evaluate(element => { element.style.width = ""; });
  await mutateFlow({ client, roomId }, flow => flow.removeNodes(createdIds));
  for (const page of pages) await expect(page.locator(".react-flow__node")).toHaveCount(0);
  console.log("Shape panel passed: six payloads, custom node types/data/sizes, transformed coordinates, unique IDs, native drag, invalid payloads, synchronized labels, and responsive layout.");

  // Keep checking built-in node movement, loose connections, and deletion.
  console.log("Empty canvas and desktop/mobile layout passed; checking shared mutations.");
  await mutateFlow({ client, roomId }, flow => {
    flow.addNodes([
      { id: "test-a", position: { x: 200, y: 150 }, data: { label: "Sync A" } },
      { id: "test-b", position: { x: 500, y: 150 }, data: { label: "Sync B" } },
    ]);
  });
  await pages[0].reload();
  for (const page of pages) await expect(page.locator(".react-flow__node")).toHaveCount(2);
  const a = pages[0].locator('[data-id="test-a"].react-flow__node');
  const b = pages[1].locator('[data-id="test-a"].react-flow__node');
  const before = await b.evaluate(element => element.style.transform);
  const bounds = await a.boundingBox();
  assert.ok(bounds);
  await pages[0].mouse.move(bounds.x + 45, bounds.y + 20);
  await pages[0].mouse.down();
  await pages[0].mouse.move(bounds.x + 125, bounds.y + 80, { steps: 12 });
  await pages[0].mouse.up();
  await expect.poll(() => b.evaluate(element => element.style.transform)).not.toBe(before);
  await expect.poll(() => b.evaluate(element => element.style.transform)).toBe(await a.evaluate(element => element.style.transform));

  // Loose mode must allow source-to-source connections.
  const source = await a.locator(".react-flow__handle-bottom").boundingBox();
  const target = await pages[0].locator('[data-id="test-b"] .react-flow__handle-bottom').boundingBox();
  assert.ok(source && target);
  await pages[0].mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await pages[0].mouse.down();
  await pages[0].mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 15 });
  await pages[0].mouse.up();
  for (const page of pages) await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  await a.click();
  await pages[0].keyboard.press("Backspace");
  for (const page of pages) {
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  }
  await pages[0].reload();
  await expect(pages[0].locator(".react-flow__node")).toHaveCount(1);

  const denied = await browser.newPage();
  await denied.route("**/api/liveblocks-auth", route => route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"Forbidden"}' }));
  await denied.goto(`${baseURL}/?room=denied-room`);
  await expect(denied.locator("main").getByRole("alert")).toContainText("Unable to connect to the canvas", { timeout: 30000 });
  await expect.poll(() => denied.locator("main").getByRole("alert").evaluate(element => getComputedStyle(element).display)).toBe("grid");
  await denied.screenshot({ path: path.join(root, "test-results", "base-canvas-error.png") });
  console.log("Passed: loading, empty canvas, dark desktop/mobile layout, minimap/dots, no controls, two-client node movement, loose connections, node/edge deletion, reload continuity, and auth-error fallback.");
} catch (error) {
  console.error(serverOutput.slice(-2500));
  throw error;
} finally {
  await browser?.close();
  try {
    if (createdRoom) await client.deleteRoom(roomId);
  } finally {
    server.kill();
    await new Promise(resolve => server.once("exit", resolve));
    assert.equal(path.dirname(fixture), path.join(root, "test-results"));
    await rm(fixture, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}
