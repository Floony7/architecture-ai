import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function loadModule(path, dependencies, globals = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInContext(source, createContext({ exports, console, ...globals, require(name) {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } }));
  return exports;
}
const room = loadModule("src/lib/project-room.ts", {});
const plain = value => JSON.parse(JSON.stringify(value));

function fixture(pathname = "/editor") {
  const states = [];
  const calls = [];
  let cursor = 0;
  let response = new Response(JSON.stringify({ project: { id: "architecture-events-123456abcdef" } }), { status: 201 });
  const { useProjectActions: runActions } = loadModule("src/hooks/use-project-actions.ts", {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
    },
    "next/navigation": {
      useRouter: () => ({ push: url => calls.push(["push", url]), replace: url => calls.push(["replace", url]), refresh: () => calls.push(["refresh"]) }),
      usePathname: () => pathname,
    },
    "@/lib/project-room": room,
  }, {
    crypto: { randomUUID: () => "123456ab-cdef-4321-8888-123456789012" },
    fetch: async (url, options) => { calls.push(["fetch", url, plain(options)]); return await response; },
  });
  return {
    calls,
    render() { cursor = 0; return runActions(); },
    respond(value) { response = value; },
  };
}

test("room IDs slugify names, use a suffix and validate safe identifiers", () => {
  assert.equal(room.projectRoomId(" Architecture & Events ", "123456abcdef"), "architecture-events-123456abcdef");
  assert.equal(room.projectRoomId("!!!", "123456abcdef"), "project-123456abcdef");
  for (const name of ["Architecture", "日本語", "a".repeat(200), "!!!"]) {
    assert.equal(room.isProjectRoomId(room.projectRoomId(name, "123456abcdef")), true);
  }
  for (const id of [null, 12, "../escape", "javascript:alert(1)", "name", "name-123"]) {
    assert.equal(room.isProjectRoomId(id), false);
  }
});

test("create submits the previewed room ID and navigates to the returned project", async () => {
  const f = fixture();
  f.render().openDialog({ type: "create" }, {});
  f.render().setName("Architecture & Events");
  const actions = f.render();
  assert.equal(actions.roomId, "architecture-events-123456abcdef");
  await actions.submitDialog();
  const request = f.calls[0];
  assert.equal(request[1], "/api/projects");
  assert.equal(request[2].method, "POST");
  assert.deepEqual(JSON.parse(request[2].body), { name: "Architecture & Events", roomId: actions.roomId });
  assert.deepEqual(f.calls[1], ["push", "/editor/architecture-events-123456abcdef"]);
  assert.equal(f.render().dialog, null);
});

test("rename pre-fills the current name, PATCHes and refreshes", async () => {
  const f = fixture();
  f.respond(new Response(JSON.stringify({ project: { id: "existing" } })));
  f.render().openDialog({ type: "rename", project: { id: "existing", name: "Original" } }, {});
  assert.equal(f.render().name, "Original");
  f.render().setName(" Renamed ");
  await f.render().submitDialog();
  assert.equal(f.calls[0][1], "/api/projects/existing");
  assert.equal(f.calls[0][2].method, "PATCH");
  assert.deepEqual(JSON.parse(f.calls[0][2].body), { name: "Renamed" });
  assert.deepEqual(f.calls[1], ["refresh"]);
});

test("delete refreshes home and redirects when deleting the active room", async () => {
  for (const active of [false, true]) {
    const f = fixture(active ? "/editor/existing" : "/editor");
    f.respond(new Response(null, { status: 204 }));
    f.render().openDialog({ type: "delete", project: { id: "existing", name: "Original" } }, {});
    await f.render().submitDialog();
    assert.equal(f.calls[0][2].method, "DELETE");
    assert.deepEqual(f.calls.slice(1), active ? [["replace", "/editor"], ["refresh"]] : [["refresh"]]);
  }
});

test("failed mutations retain the dialog and input for retry", async () => {
  const f = fixture();
  f.respond(new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }));
  f.render().openDialog({ type: "rename", project: { id: "existing", name: "Original" } }, {});
  f.render().setName("Edited");
  await f.render().submitDialog();
  assert.equal(f.render().name, "Edited");
  assert.equal(f.render().dialog.type, "rename");
  assert.equal(f.render().error, "Forbidden");
  assert.equal(f.render().isPending, false);
  assert.equal(f.calls.length, 1);
});

test("pending mutations block duplicate submissions and dismissal", async () => {
  const f = fixture();
  let resolve;
  f.respond(new Promise(done => { resolve = done; }));
  f.render().openDialog({ type: "delete", project: { id: "existing", name: "Original" } }, {});
  const pending = f.render().submitDialog();
  await f.render().submitDialog();
  f.render().closeDialog();
  assert.equal(f.render().isPending, true);
  assert.equal(f.render().dialog.type, "delete");
  assert.equal(f.calls.length, 1);
  resolve(new Response(null, { status: 204 }));
  await pending;
  assert.equal(f.render().dialog, null);
});

test("server data helpers scope ownership and shared primary-email membership", async () => {
  const queries = [];
  const projects = loadModule("src/lib/projects.ts", {
    "server-only": {},
    "@/lib/prisma": { prisma: { project: { findMany: async query => { queries.push(plain(query)); return []; } } } },
  });
  await projects.getOwnedProjects("owner");
  await projects.getSharedProjects("owner", "User@example.com");
  await projects.getSharedProjects("owner", null);
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[0].where, { ownerId: "owner" });
  assert.deepEqual(queries[1].where, {
    ownerId: { not: "owner" }, collaborators: { some: { email: { equals: "User@example.com", mode: "insensitive" } } },
  });
  assert.deepEqual(queries[1].select, { id: true, name: true });
});
