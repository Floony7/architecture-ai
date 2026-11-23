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
    await expect(page.locator(".react-flow__controls")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete selection" })).toBeDisabled();
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  }
  const desktopCanvas = await pages[0].locator(".react-flow").boundingBox();
  const desktopMap = await pages[0].locator(".react-flow__minimap").boundingBox();
  assert.ok(desktopCanvas.y + desktopCanvas.height - desktopMap.y - desktopMap.height >= 50);
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
  const preview = pages[0].locator(".canvas-shape-drag-preview");
  await pages[0].evaluate(() => {
    const setDragImage = DataTransfer.prototype.setDragImage;
    DataTransfer.prototype.setDragImage = function (element, x, y) {
      element.dataset.hotspot = JSON.stringify({ x, y });
      return setDragImage.call(this, element, x, y);
    };
  });
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
  await pages[0].locator(".react-flow__controls-zoomin").click();
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(beforeZoom);
  const beforeWheelZoom = await viewport.getAttribute("style");
  await pages[0].mouse.move(760, 290);
  await pages[0].mouse.wheel(0, 250);
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(beforeWheelZoom);
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
    await expect(preview).toHaveAttribute("data-shape", shape);
    await expect(preview).toHaveAttribute("data-hotspot", JSON.stringify({ x: size.width / 2, y: size.height / 2 }));
    await expect(preview).toHaveCSS("width", `${size.width}px`);
    await expect(preview).toHaveCSS("height", `${size.height}px`);
    const shapeMarkup = await preview.locator(".canvas-node-shape").evaluate(element => element.outerHTML);
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
    await expect(preview).toHaveCount(0);
    await transfer.dispose();
    index++;
    for (const page of pages) await expect(page.locator(".react-flow__node-canvasNode")).toHaveCount(index);
    const nodeShape = pages[0].locator(`.react-flow__node-canvasNode [data-shape="${shape}"] .canvas-node-shape`);
    assert.equal(await nodeShape.evaluate(element => element.outerHTML), shapeMarkup);
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
  for (const page of pages) {
    await expect(page.locator(".canvas-node svg")).toHaveCount(3);
    for (const shape of Object.keys(shapes)) {
      await expect(page.locator(`.canvas-node[data-shape="${shape}"] .canvas-node-shape`)).toBeVisible();
    }
    await expect(page.locator('.canvas-node[data-shape="circle"] .canvas-node-shape')).toHaveCSS("border-radius", "50%");
  }

  const [editor, collaborator] = pages;
  const canvasNode = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
  const circle = canvasNode(editor, createdIds[2]);
  const sharedCircle = canvasNode(collaborator, createdIds[2]);
  const nodeSize = (node) => node.evaluate(element => ({
    width: Number.parseFloat(element.style.width),
    height: Number.parseFloat(element.style.height),
  }));
  await expect(circle.locator(".canvas-resize-handle")).toHaveCount(0);
  await circle.click();
  await expect(circle.locator(".canvas-resize-handle")).toHaveCount(4);
  await expect(sharedCircle.locator(".canvas-resize-handle")).toHaveCount(0);
  const corner = await circle.locator(".canvas-resize-handle.bottom.right").boundingBox();
  assert.ok(corner);
  const cornerX = corner.x + corner.width / 2;
  const cornerY = corner.y + corner.height / 2;
  await editor.mouse.move(cornerX, cornerY);
  await editor.mouse.down();
  await editor.mouse.move(cornerX + 48, cornerY + 48, { steps: 10 });
  await editor.mouse.up();
  const size = await nodeSize(circle);
  assert.ok(size.width > shapes.circle.width);
  assert.equal(size.width, size.height);
  await expect.poll(() => nodeSize(sharedCircle)).toEqual(size);
  await expect.poll(async () => {
    let storedSize;
    await mutateFlow({ client, roomId }, flow => {
      const { width, height } = flow.nodes.find(node => node.id === createdIds[2]);
      storedSize = { width, height };
    });
    return storedSize;
  }).toEqual(size);

  const resizedBounds = await circle.boundingBox();
  const shrinkHandle = await circle.locator(".canvas-resize-handle.bottom.right").boundingBox();
  assert.ok(resizedBounds && shrinkHandle);
  await editor.mouse.move(shrinkHandle.x + shrinkHandle.width / 2, shrinkHandle.y + shrinkHandle.height / 2);
  await editor.mouse.down();
  await editor.mouse.move(resizedBounds.x + 10, resizedBounds.y + 10, { steps: 10 });
  await editor.mouse.up();
  await expect.poll(() => nodeSize(circle)).toEqual({ width: 56, height: 56 });
  await expect.poll(() => nodeSize(sharedCircle)).toEqual({ width: 56, height: 56 });

  const rectangle = canvasNode(editor, createdIds[0]);
  const label = rectangle.locator(".canvas-node-label");
  const sharedLabel = canvasNode(collaborator, createdIds[0]).locator(".canvas-node-label");
  const textarea = rectangle.getByRole("textbox", { name: "Node label" });
  const beforeEditing = await viewport.getAttribute("style");
  const rectanglePosition = await rectangle.evaluate(element => element.style.transform);
  await expect(label).toHaveText("Add label");
  await label.dblclick();
  await expect(textarea).toBeFocused();
  await expect(textarea).toHaveAttribute("placeholder", "Add label");
  await expect(viewport).toHaveAttribute("style", beforeEditing);
  await textarea.pressSequentially("API gateway");
  await textarea.press("Backspace");
  await expect(textarea).toHaveValue("API gatewa");
  await expect(sharedLabel).toHaveText("API gatewa");
  const textareaBounds = await textarea.boundingBox();
  assert.ok(textareaBounds);
  await editor.mouse.move(textareaBounds.x + 2, textareaBounds.y + textareaBounds.height / 2);
  await editor.mouse.down();
  await editor.mouse.move(textareaBounds.x + textareaBounds.width - 2, textareaBounds.y + textareaBounds.height / 2, { steps: 6 });
  await editor.mouse.up();
  await editor.mouse.wheel(0, 100);
  await expect(textarea).toBeFocused();
  await expect(viewport).toHaveAttribute("style", beforeEditing);
  assert.equal(await rectangle.evaluate(element => element.style.transform), rectanglePosition);
  assert.deepEqual(await nodeSize(rectangle), shapes.rectangle);
  await textarea.press("Escape");
  await expect(textarea).toHaveCount(0);
  await expect(label).toHaveText("API gatewa");
  await label.dblclick();
  await textarea.fill("");
  await editor.locator(".react-flow__pane").click({ position: { x: 30, y: 30 } });
  await expect(textarea).toHaveCount(0);
  await expect(label).toHaveText("Add label");
  await expect(sharedLabel).toHaveText("Add label");
  console.log("Node editing passed: resize limits, live label updates, blur and Escape, and isolated text input.");

  // Exercise a real native browser drag as well as the payload-boundary checks.
  await toolbar.getByRole("button", { name: "Rectangle", exact: true }).dragTo(pages[0].locator(".react-flow__pane"), { targetPosition: { x: 420, y: 350 } });
  await expect(preview).toHaveCount(0);
  for (const page of pages) await expect(page.locator(".react-flow__node-canvasNode")).toHaveCount(7);
  const cancelSource = toolbar.getByRole("button", { name: "Hexagon", exact: true });
  const cancelledTransfer = await pages[0].evaluateHandle(() => new DataTransfer());
  await cancelSource.dispatchEvent("dragstart", { dataTransfer: cancelledTransfer });
  await expect(preview).toHaveAttribute("data-shape", "hexagon");
  await cancelSource.dispatchEvent("dragend", { dataTransfer: cancelledTransfer });
  await expect(preview).toHaveCount(0);
  await cancelledTransfer.dispose();
  for (const page of pages) await expect(page.locator(".react-flow__node-canvasNode")).toHaveCount(7);
  await mutateFlow({ client, roomId }, flow => {
    for (const node of flow.nodes) if (!createdIds.includes(node.id)) createdIds.push(node.id);
    flow.updateNodeData(createdIds[0], { label: "Shared label" });
  });
  for (const page of pages) await expect(page.locator(".canvas-node").filter({ hasText: "Shared label" })).toHaveCount(1);
  const colors = editor.getByRole("group", { name: "Node colors" });
  await editor.locator(".react-flow__pane").click({ position: { x: 30, y: 30 } });
  await expect(colors).toHaveCount(0);
  await rectangle.click();
  await expect(colors.getByRole("button")).toHaveCount(8);
  await expect(colors.getByRole("button", { name: "Neutral" })).toHaveAttribute("aria-pressed", "true");
  await expect(collaborator.getByRole("group", { name: "Node colors" })).toHaveCount(0);
  const colorBounds = await colors.boundingBox();
  const rectangleBounds = await rectangle.boundingBox();
  assert.ok(colorBounds && rectangleBounds);
  assert.equal(Math.round(rectangleBounds.y - colorBounds.y - colorBounds.height), 12);
  const blue = colors.getByRole("button", { name: "Blue" });
  await blue.hover();
  await expect(blue).not.toHaveCSS("box-shadow", "none");
  const beforeColorSelection = await viewport.getAttribute("style");
  await editor.mouse.wheel(0, 120);
  await blue.click();
  await expect(blue).toHaveAttribute("aria-pressed", "true");
  await expect(blue).toHaveCSS("border-top-color", "rgb(82, 168, 255)");
  await expect(viewport).toHaveAttribute("style", beforeColorSelection);
  assert.equal(await rectangle.evaluate(element => element.style.transform), rectanglePosition);
  for (const page of pages) {
    const node = canvasNode(page, createdIds[0]);
    await expect(node.locator(".canvas-node-shape")).toHaveCSS("background-color", "rgb(16, 35, 61)");
    await expect(node.getByText("Shared label")).toHaveCSS("color", "rgb(82, 168, 255)");
  }
  await label.dblclick();
  await expect(textarea).toHaveCSS("color", "rgb(82, 168, 255)");
  await textarea.press("Escape");

  const diamond = canvasNode(editor, createdIds[1]);
  await diamond.click();
  await colors.getByRole("button", { name: "Teal" }).press("Enter");
  await expect(colors.getByRole("button", { name: "Teal" })).toHaveAttribute("aria-pressed", "true");
  for (const page of pages) {
    const node = canvasNode(page, createdIds[1]);
    await expect(node.locator(".canvas-node-shape path").first()).toHaveCSS("fill", "rgb(6, 40, 34)");
    await expect(node.getByText("Add label")).toHaveCSS("color", "rgb(10, 199, 180)");
  }
  await editor.locator(".react-flow__pane").click({ position: { x: 30, y: 30 } });
  await expect(colors).toHaveCount(0);
  console.log("Node colors passed: selection visibility, swatch states, viewport isolation, and shared CSS and SVG fills with paired text.");

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
  await circle.click();
  await pages[0].getByRole("button", { name: "Delete selection" }).click();
  for (const page of pages) await expect(canvasNode(page, createdIds[2])).toHaveCount(0);
  await mutateFlow({ client, roomId }, flow => flow.removeNodes(createdIds.filter(id => id !== createdIds[2])));
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
  await pages[0].keyboard.press("Delete");
  for (const page of pages) {
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
  }
  await pages[0].reload();
  await expect(pages[0].locator(".react-flow__node")).toHaveCount(1);
  await pages[0].locator('[data-id="test-b"].react-flow__node').click();
  await pages[0].keyboard.press("Backspace");
  for (const page of pages) await expect(page.locator(".react-flow__node")).toHaveCount(0);

  const denied = await browser.newPage();
  await denied.route("**/api/liveblocks-auth", route => route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"Forbidden"}' }));
  await denied.goto(`${baseURL}/?room=denied-room`);
  await expect(denied.locator("main").getByRole("alert")).toContainText("Unable to connect to the canvas", { timeout: 30000 });
  await expect.poll(() => denied.locator("main").getByRole("alert").evaluate(element => getComputedStyle(element).display)).toBe("grid");
  await denied.screenshot({ path: path.join(root, "test-results", "base-canvas-error.png") });
  console.log("Passed: loading, desktop/mobile layout, zoom controls, six shapes, shared movement and resizing, loose connections, keyboard and button deletion, reload continuity, and auth-error fallback.");
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
