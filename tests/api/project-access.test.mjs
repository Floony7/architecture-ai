import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function loadModule(path, dependencies) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  runInContext(source, createContext({ exports, require(name) {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } }));
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));

test("identity uses only the signed-in Clerk user's primary email", async () => {
  for (const signedIn of [false, true]) {
    let reads = 0;
    const helpers = loadModule("src/lib/project-access.ts", {
      "server-only": {},
      "@clerk/nextjs/server": {
        auth: async () => ({ userId: signedIn ? "user" : null }),
        currentUser: async () => { reads++; return { primaryEmailAddress: { emailAddress: "Primary@example.com" } }; },
      },
      "@/lib/prisma": {},
    });
    assert.deepEqual(plain(await helpers.getCurrentIdentity()), signedIn ? { userId: "user", email: "Primary@example.com" } : null);
    assert.equal(reads, signedIn ? 1 : 0);
  }
});

test("project lookup constrains the requested ID by owner or case-insensitive collaborator email", async () => {
  const queries = [];
  const helpers = loadModule("src/lib/project-access.ts", {
    "server-only": {},
    "@clerk/nextjs/server": {},
    "@/lib/prisma": { prisma: { project: { findFirst: async query => { queries.push(plain(query)); return null; } } } },
  });
  assert.equal(await helpers.getAccessibleProject("room", { userId: "user", email: "Primary@example.com" }), null);
  await helpers.getAccessibleProject("room", { userId: "user", email: null });
  assert.deepEqual(queries[0], {
    where: { id: "room", OR: [
      { ownerId: "user" },
      { collaborators: { some: { email: { equals: "Primary@example.com", mode: "insensitive" } } } },
    ] },
    select: { id: true, name: true },
  });
  assert.deepEqual(queries[1].where, { id: "room", OR: [{ ownerId: "user" }] });
});

test("workspace redirects before lookups and denies inaccessible rooms before loading lists", async () => {
  for (const scenario of ["signed-out", "denied", "allowed"]) {
    const calls = [];
    const identity = { userId: "user", email: "primary@example.com" };
    const project = { id: "room", name: "Architecture" };
    const AccessDenied = () => {};
    const EditorWorkspace = () => {};
    const { default: Page } = loadModule("app/editor/[roomId]/page.tsx", {
      "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
      "next/navigation": { redirect: url => { throw new Error(`redirect:${url}`); } },
      "@/components/editor/access-denied": { AccessDenied },
      "@/components/editor/editor-workspace": { EditorWorkspace },
      "@/lib/project-access": {
        getCurrentIdentity: async () => scenario === "signed-out" ? null : identity,
        getAccessibleProject: async (id, user) => {
          calls.push(["access", id, user]);
          return scenario === "allowed" ? project : null;
        },
      },
      "@/lib/projects": {
        getOwnedProjects: async id => { calls.push(["owned", id]); return [project]; },
        getSharedProjects: async (id, email) => { calls.push(["shared", id, email]); return []; },
      },
    });
    const props = { params: Promise.resolve({ roomId: "room" }) };
    if (scenario === "signed-out") {
      await assert.rejects(Page(props), /redirect:\/sign-in/);
      assert.equal(calls.length, 0);
    } else {
      const result = await Page(props);
      assert.equal(result.type, scenario === "allowed" ? EditorWorkspace : AccessDenied);
      assert.equal(calls.length, scenario === "allowed" ? 3 : 1);
      if (scenario === "allowed") {
        assert.deepEqual(plain(result.props), { project, ownedProjects: [project], sharedProjects: [] });
      }
    }
  }
});
