import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(path, dependencies, globals = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInContext(source, createContext({ exports, console, ...globals, require(name) {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } }));
  return exports;
}

function fixture(isOwner = true) {
  const states = [], effects = [], calls = [], clipboard = [], timers = [];
  let stateCursor = 0, effectCursor = 0;
  let nextResponse = new Response(JSON.stringify({ isOwner, collaborators: [{ email: "first@example.com", name: null, imageUrl: null }] }));
  let clipboardError = false;
  const { useProjectSharing: runSharing } = load("src/hooks/use-project-sharing.ts", {
    react: {
      useState(initial) {
        const index = stateCursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
      },
      useRef(initial) {
        const index = stateCursor++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useEffect(callback, dependencies) {
        const index = effectCursor++;
        const previous = effects[index];
        if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
          previous?.cleanup?.();
          effects[index] = { dependencies, callback };
        }
      },
    },
  }, {
    AbortController,
    fetch: async (url, options) => { calls.push([url, options]); return await nextResponse; },
    window: { location: { origin: "https://architecture.example" } },
    navigator: { clipboard: { writeText: async text => { if (clipboardError) throw new Error("denied"); clipboard.push(text); } } },
    setTimeout: callback => { timers.push(callback); return timers.length; },
    clearTimeout: () => {},
  });
  return {
    calls, clipboard, timers,
    respond: value => { nextResponse = value; },
    failClipboard: () => { clipboardError = true; },
    render() {
      stateCursor = 0; effectCursor = 0;
      const result = runSharing("room");
      for (const effect of effects) {
        if (effect.callback) { const callback = effect.callback; effect.callback = null; effect.cleanup = callback(); }
      }
      return result;
    },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const collaborator = { email: "new@example.com", name: "New User", imageUrl: null };

test("sharing actions update the list after successful invite and removal", async () => {
  const f = fixture();
  f.render(); await flush();
  f.render().setEmail(" New@Example.com ");
  f.respond(new Response(JSON.stringify({ collaborator }), { status: 201 }));
  await f.render().invite();
  assert.deepEqual(JSON.parse(f.calls[1][1].body), { email: "new@example.com" });
  assert.equal(f.render().sharing.collaborators.length, 2);
  assert.equal(f.render().email, "");
  f.respond(new Response(null, { status: 204 }));
  await f.render().remove("new@example.com");
  assert.equal(f.calls[2][1].method, "DELETE");
  assert.equal(f.render().sharing.collaborators.length, 1);
  f.unmount();
});

test("collaborator clients cannot invoke management actions or copy", async () => {
  const f = fixture(false);
  f.render(); await flush();
  f.render().setEmail("new@example.com");
  await f.render().invite();
  await f.render().remove("first@example.com");
  await f.render().copyLink();
  assert.equal(f.calls.length, 1);
  assert.equal(f.clipboard.length, 0);
  f.unmount();
});

test("pending requests block duplicate mutations and failed invites retain input for retry", async () => {
  const f = fixture();
  f.render(); await flush();
  f.render().setEmail("new@example.com");
  let resolve;
  f.respond(new Promise(done => { resolve = done; }));
  const pending = f.render().invite();
  await f.render().invite();
  await f.render().remove("first@example.com");
  assert.equal(f.calls.length, 2);
  assert.equal(f.render().pending, "invite");
  resolve(new Response(JSON.stringify({ error: "This email already has access" }), { status: 409 }));
  await pending;
  assert.equal(f.render().email, "new@example.com");
  assert.equal(f.render().error, "This email already has access");
  assert.equal(f.render().pending, null);
  assert.equal(f.render().sharing.collaborators.length, 1);
  f.unmount();
});

test("copy uses the current origin and project path with temporary feedback and handles clipboard denial", async () => {
  const f = fixture();
  f.render(); await flush();
  await f.render().copyLink();
  assert.deepEqual(f.clipboard, ["https://architecture.example/editor/room"]);
  assert.equal(f.render().copied, true);
  f.timers[0]();
  assert.equal(f.render().copied, false);
  f.failClipboard();
  await f.render().copyLink();
  assert.match(f.render().error, /Unable to copy/);
  f.unmount();
});

test("list load failures can retry and unmounted loads are ignored", async () => {
  const f = fixture();
  f.respond(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }));
  f.render(); await flush();
  assert.equal(f.render().error, "Forbidden");
  f.respond(new Response(JSON.stringify({ isOwner: true, collaborators: [] })));
  f.render().retry(); f.render(); await flush();
  assert.equal(f.render().sharing.isOwner, true);
  assert.equal(f.render().error, null);
  f.unmount();
  const closed = fixture();
  let resolve;
  closed.respond(new Promise(done => { resolve = done; }));
  closed.render(); closed.unmount();
  resolve(new Response(JSON.stringify({ isOwner: true, collaborators: [] })));
  await flush();
  assert.equal(closed.render().sharing, null);
});

test("dialog markup exposes management controls only to owners and renders names, avatars and email fallback", () => {
  for (const isOwner of [true, false]) {
    const container = ({ children }) => React.createElement("div", null, children);
    const icon = () => null;
    const { ShareDialog } = load("src/components/editor/share-dialog.tsx", {
      "react/jsx-runtime": jsxRuntime,
      react: { ...React, useState: () => [true, () => {}] },
      "lucide-react": { Check: icon, Copy: icon, Share2: icon, UserRound: icon, X: icon },
      "next/image": { __esModule: true, default: props => React.createElement("img", { ...props, unoptimized: undefined }) },
      "@/components/ui/button": { Button: ({ children, ...props }) => React.createElement("button", { ...props, size: undefined, variant: undefined }, children) },
      "@/components/ui/dialog": { Dialog: container, DialogTrigger: container },
      "@/components/ui/input": { Input: props => React.createElement("input", props) },
      "./editor-dialog-content": { EditorDialogContent: ({ children, footer }) => React.createElement("section", null, children, footer) },
      "@/hooks/use-project-sharing": { useProjectSharing: () => ({ sharing: { isOwner, collaborators: [
        { email: "named@example.com", name: "Named Person", imageUrl: "https://img.clerk.com/avatar" },
        { email: "unknown@example.com", name: null, imageUrl: null },
      ] }, email: "", pending: null }) },
    });
    const markup = renderToStaticMarkup(React.createElement(ShareDialog, { project: { id: "room", name: "Architecture" } }));
    assert.match(markup, /Named Person/);
    assert.match(markup, /unknown@example.com/);
    assert.match(markup, /img.clerk.com\/avatar/);
    assert.equal(markup.includes("Invite by email"), isOwner);
    assert.equal(markup.includes("Remove named@example.com"), isOwner);
    assert.equal(markup.includes("Copy project link"), isOwner);
    assert.equal(markup.includes("Only the project owner can manage access"), !isOwner);
  }
});
