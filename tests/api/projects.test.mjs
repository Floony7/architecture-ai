import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, mock } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

// Exercise the actual handlers and helpers with Clerk/Prisma boundary doubles.
function loadModule(path, dependencies) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInContext(source, createContext({
    exports, Request, Response, console,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }));
  return exports;
}

function fixture(userId = "owner") {
  const project = { id: "cuid-project", ownerId: "owner", name: "Original" };
  const database = {
    findMany: mock.fn(async () => [project]),
    findUnique: mock.fn(async () => ({ ownerId: project.ownerId })),
    create: mock.fn(async ({ data }) => ({ ...project, ...data })),
    update: mock.fn(async ({ data }) => ({ ...project, ...data })),
    delete: mock.fn(async () => project),
  };
  const dependencies = {
    "@clerk/nextjs/server": { auth: async () => ({ userId, isAuthenticated: !!userId }) },
    "@/lib/prisma": { prisma: { project: database } },
    "@/generated/prisma/client": { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
  };
  dependencies["@/lib/project-room"] = loadModule("src/lib/project-room.ts", {});
  dependencies["@/lib/project-api"] = loadModule("src/lib/project-api.ts", dependencies);
  return {
    database,
    KnownRequestError: dependencies["@/generated/prisma/client"].Prisma.PrismaClientKnownRequestError,
    ...loadModule("app/api/projects/route.ts", dependencies),
    ...loadModule("app/api/projects/[projectId]/route.ts", dependencies),
  };
}

const context = { params: Promise.resolve({ projectId: "cuid-project" }) };
function request(method, body) {
  return new Request("http://localhost/api/projects/cuid-project", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// Normalize objects produced in a separate VM realm before deep comparisons.
const plain = (value) => JSON.parse(JSON.stringify(value));

test("all four handlers return 401 before reading the database or body", async () => {
  const api = fixture(null);
  for (const response of [
    await api.GET(), await api.POST(request("POST")),
    await api.PATCH(request("PATCH"), context), await api.DELETE(request("DELETE"), context),
  ]) {
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
  }
  for (const operation of Object.values(api.database)) assert.equal(operation.mock.callCount(), 0);
});

test("list is scoped to the current Clerk user", async () => {
  const api = fixture("another-user");
  const response = await api.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(plain(api.database.findMany.mock.calls[0].arguments[0].where), { ownerId: "another-user" });
  assert.ok(Array.isArray((await response.json()).projects));
});

test("create defaults the name and ignores forged owner and ID fields", async () => {
  const api = fixture();
  const response = await api.POST(request("POST", { ownerId: "attacker", id: "123" }));
  assert.equal(response.status, 201);
  assert.deepEqual(plain(api.database.create.mock.calls[0].arguments[0]), {
    data: { name: "Untitled Project", ownerId: "owner" },
  });
  assert.equal((await response.json()).project.name, "Untitled Project");
});

test("create and rename validate JSON and names before database access", async () => {
  for (const method of ["POST", "PATCH"]) {
    for (const body of [null, [], "name", { name: null }, { name: 12 }, { name: "  " }, ...(method === "PATCH" ? [{}] : [])]) {
      const api = fixture();
      assert.equal((await api[method](request(method, body), context)).status, 400);
      for (const operation of Object.values(api.database)) assert.equal(operation.mock.callCount(), 0);
    }
    const api = fixture();
    const malformed = new Request("http://localhost/api/projects", { method, body: "{" });
    assert.equal((await api[method](malformed, context)).status, 400);
  }
});

test("create accepts a provided name", async () => {
  const api = fixture();
  const response = await api.POST(request("POST", { name: "  Payments  " }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).project.name, "Payments");
});

test("non-owners cannot rename or delete an existing project", async () => {
  const api = fixture("collaborator");
  for (const method of ["PATCH", "DELETE"]) {
    const response = await api[method](request(method, { name: "Hijacked" }), context);
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
  }
  assert.equal(api.database.update.mock.callCount(), 0);
  assert.equal(api.database.delete.mock.callCount(), 0);
});

test("missing projects return 404 without mutations", async () => {
  const api = fixture();
  api.database.findUnique.mock.mockImplementation(async () => null);
  for (const method of ["PATCH", "DELETE"]) {
    assert.equal((await api[method](request(method, { name: "Missing" }), context)).status, 404);
  }
  assert.equal(api.database.update.mock.callCount(), 0);
  assert.equal(api.database.delete.mock.callCount(), 0);
});

test("owner can rename and delete; writes retain the owner predicate", async () => {
  const api = fixture();
  const renamed = await api.PATCH(request("PATCH", { name: "Renamed", ownerId: "attacker" }), context);
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).project.name, "Renamed");
  assert.deepEqual(plain(api.database.update.mock.calls[0].arguments[0]), {
    where: { id: "cuid-project", ownerId: "owner" }, data: { name: "Renamed" },
  });
  const deleted = await api.DELETE(request("DELETE"), context);
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), "");
  assert.deepEqual(plain(api.database.delete.mock.calls[0].arguments[0]), {
    where: { id: "cuid-project", ownerId: "owner" },
  });
});


test("create persists a validated room ID while ignoring forged ID and owner", async () => {
  const api = fixture();
  const response = await api.POST(request("POST", { name: "Payments", roomId: "payments-123456abcdef", id: "forged", ownerId: "forged" }));
  assert.equal(response.status, 201);
  assert.deepEqual(plain(api.database.create.mock.calls[0].arguments[0]), {
    data: { id: "payments-123456abcdef", name: "Payments", ownerId: "owner" },
  });
});

test("create rejects malformed room IDs before database access", async () => {
  for (const roomId of [null, 42, "../escape", "no-suffix", "a".repeat(200)]) {
    const api = fixture();
    const response = await api.POST(request("POST", { name: "Payments", roomId }));
    assert.equal(response.status, 400);
    assert.equal(api.database.create.mock.callCount(), 0);
  }
});


test("duplicate room IDs return 409 without overwriting the existing project", async () => {
  const api = fixture();
  api.database.create.mock.mockImplementation(async () => {
    throw Object.assign(new api.KnownRequestError("Duplicate"), { code: "P2002" });
  });
  const response = await api.POST(request("POST", { name: "Payments", roomId: "payments-123456abcdef" }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Room ID already exists/);
  assert.equal(api.database.update.mock.callCount(), 0);
});
