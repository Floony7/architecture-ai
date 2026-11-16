import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function load(path, dependencies) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInContext(source, createContext({ exports, Request, Response, console: { error() {} }, require(name) {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } }));
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const context = { params: Promise.resolve({ projectId: "room" }) };
const request = (method, body = { email: " New@Example.com " }) => new Request("http://localhost/api/projects/room/collaborators", { method, ...(method !== "GET" ? { body: JSON.stringify(body) } : {}) });

function fixture(userId = "owner", email = "viewer@example.com") {
  const queries = [];
  const clerkQueries = [];
  const project = { ownerId: "owner", collaborators: [{ email: "viewer@example.com" }, { email: "unknown@example.com" }] };
  let exists = true;
  let duplicate = false;
  let removeCount = 1;
  let clerkError = false;
  let writeError;
  class KnownError extends Error { constructor(code) { super(code); this.code = code; } }
  const prisma = {
    project: { findUnique: async query => { queries.push(["project", plain(query)]); return exists ? project : null; } },
    projectCollaborator: {
      findFirst: async query => { queries.push(["duplicate", plain(query)]); return duplicate ? { email: "new@example.com" } : null; },
      create: async query => { queries.push(["create", plain(query)]); if (writeError) throw new KnownError(writeError); return {}; },
      deleteMany: async query => { queries.push(["delete", plain(query)]); return { count: removeCount }; },
    },
  };
  const dependencies = {
    "server-only": {},
    "@clerk/nextjs/server": {
      auth: async () => ({ userId }),
      currentUser: async () => ({ primaryEmailAddress: email ? { emailAddress: email } : null }),
      clerkClient: async () => ({ users: { getUserList: async query => {
        clerkQueries.push(plain(query));
        if (clerkError) throw new Error("Clerk unavailable");
        return { data: [{ firstName: "Test", lastName: "Viewer", username: null, imageUrl: "https://img.clerk.com/avatar", emailAddresses: [{ emailAddress: "VIEWER@example.com" }] }], totalCount: 1 };
      } } }),
    },
    "@/lib/prisma": { prisma },
    "@/generated/prisma/client": { Prisma: { PrismaClientKnownRequestError: KnownError } },
    "@/lib/project-room": { isProjectRoomId: () => true },
  };
  dependencies["@/lib/project-access"] = load("src/lib/project-access.ts", dependencies);
  dependencies["@/lib/project-api"] = load("src/lib/project-api.ts", dependencies);
  const helpers = load("src/lib/project-collaborators.ts", dependencies);
  dependencies["@/lib/project-collaborators"] = helpers;
  const api = load("app/api/projects/[projectId]/collaborators/route.ts", dependencies);
  return { api, helpers, queries, clerkQueries, project,
    missing: () => { exists = false; }, duplicate: () => { duplicate = true; },
    absentCollaborator: () => { removeCount = 0; }, failClerk: () => { clerkError = true; },
    failWrite: code => { writeError = code; },
  };
}

test("all sharing endpoints reject signed-out callers before database or Clerk profile lookup", async () => {
  const f = fixture(null);
  for (const method of ["GET", "POST", "DELETE"]) {
    assert.equal((await f.api[method](request(method), context)).status, 401);
  }
  assert.equal(f.queries.length, 0);
  assert.equal(f.clerkQueries.length, 0);
});

test("owner and primary-email collaborators can list profiles; missing users fall back to email", async () => {
  for (const [userId, email] of [["owner", null], ["viewer", "VIEWER@EXAMPLE.COM"]]) {
    const f = fixture(userId, email);
    const response = await f.api.GET(request("GET"), context);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { isOwner: userId === "owner", collaborators: [
      { email: "viewer@example.com", name: "Test Viewer", imageUrl: "https://img.clerk.com/avatar" },
      { email: "unknown@example.com", name: null, imageUrl: null },
    ] });
    assert.deepEqual(f.clerkQueries[0], { emailAddress: ["viewer@example.com", "unknown@example.com"], limit: 100, offset: 0 });
  }
});

test("outsiders and missing projects cannot list collaborator profiles", async () => {
  for (const missing of [false, true]) {
    const f = fixture("outsider", null);
    if (missing) f.missing();
    assert.equal((await f.api.GET(request("GET"), context)).status, missing ? 404 : 403);
    assert.equal(f.clerkQueries.length, 0);
  }
});

test("collaborators and outsiders cannot invite or remove even with forged owner data", async () => {
  for (const userId of ["viewer", "outsider"]) {
    const f = fixture(userId);
    for (const method of ["POST", "DELETE"]) {
      assert.equal((await f.api[method](request(method, { email: "new@example.com", ownerId: "owner" }), context)).status, 403);
    }
    assert.ok(f.queries.every(([operation]) => operation === "project"));
    assert.equal(f.clerkQueries.length, 0);
  }
});

test("owner invitations normalize email and scope the database write to the owner and project", async () => {
  const f = fixture();
  const response = await f.api.POST(request("POST"), context);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { collaborator: { email: "new@example.com", name: null, imageUrl: null } });
  assert.deepEqual(f.queries.find(([operation]) => operation === "create")[1], {
    data: { email: "new@example.com", project: { connect: { id: "room", ownerId: "owner" } } },
  });
});

test("invalid email and malformed JSON are rejected before database reads or writes", async () => {
  const f = fixture();
  for (const method of ["POST", "DELETE"]) {
    for (const body of [null, [], {}, { email: 12 }, { email: "bad" }, { email: "a@@example.com" }, { email: "a\n@example.com" }, { email: `${"a".repeat(255)}@example.com` }]) {
      assert.equal((await f.api[method](request(method, body), context)).status, 400);
    }
    assert.equal((await f.api[method](new Request("http://localhost", { method, body: "{" }), context)).status, 400);
  }
  assert.equal(f.queries.length, 0);
});

test("duplicate invitations and concurrent uniqueness conflicts return 409", async () => {
  for (const concurrent of [false, true]) {
    const f = fixture();
    if (concurrent) f.failWrite("P2002"); else f.duplicate();
    const response = await f.api.POST(request("POST"), context);
    assert.equal(response.status, 409);
    assert.equal(f.clerkQueries.length, 0);
  }
});

test("removal matches email case-insensitively and retains project and owner constraints", async () => {
  const f = fixture();
  assert.equal((await f.api.DELETE(request("DELETE"), context)).status, 204);
  assert.deepEqual(f.queries.find(([operation]) => operation === "delete")[1], {
    where: { projectId: "room", email: { equals: "new@example.com", mode: "insensitive" }, project: { ownerId: "owner" } },
  });
  f.absentCollaborator();
  assert.equal((await f.api.DELETE(request("DELETE"), context)).status, 404);
});

test("missing projects prevent invitations and removals", async () => {
  const f = fixture();
  f.missing();
  for (const method of ["POST", "DELETE"]) assert.equal((await f.api[method](request(method), context)).status, 404);
  assert.ok(f.queries.every(([operation]) => operation === "project"));
});

test("Clerk enrichment failures preserve the email list and successful invitations", async () => {
  const f = fixture();
  f.failClerk();
  const response = await f.api.GET(request("GET"), context);
  assert.equal(response.status, 200);
  assert.ok((await response.json()).collaborators.every(person => person.name === null && person.imageUrl === null));
  assert.equal((await f.api.POST(request("POST"), context)).status, 201);
});

test("empty collaborator lists skip Clerk lookups", async () => {
  const f = fixture();
  assert.deepEqual(plain(await f.helpers.enrichCollaborators([])), []);
  assert.equal(f.clerkQueries.length, 0);
});
