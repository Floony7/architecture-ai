import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

function load(path, dependencies, globals = {}) {
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInContext(source, createContext({ exports, Request, Response, console: { error() {} }, ...globals,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }));
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const colors = load("src/lib/user-color.ts", {});
const request = (body = { room: "project-id" }) => new Request("http://localhost/api/liveblocks-auth", {
  method: "POST", body: JSON.stringify(body),
});

function fixture(options = {}) {
  const calls = [];
  const user = options.user === undefined ? {
    fullName: "Test Member", username: "member", imageUrl: "https://img.clerk.com/member",
    primaryEmailAddress: { emailAddress: "Member@Example.com" },
  } : options.user;
  const session = {
    FULL_ACCESS: ["*:write"],
    allow: (...args) => calls.push(["allow", ...plain(args)]),
    authorize: async () => {
      calls.push(["authorize"]);
      return options.result ?? { body: '{"token":"test-token"}', status: 200 };
    },
  };
  const api = load("app/api/liveblocks-auth/route.ts", {
    "@clerk/nextjs/server": {
      auth: async () => ({ userId: options.signedOut ? null : "user-id" }),
      currentUser: async () => { calls.push(["profile"]); return user; },
    },
    "@/lib/project-access": {
      getAccessibleProject: async (...args) => {
        calls.push(["access", ...plain(args)]);
        return options.denied ? null : { id: args[0], name: "Project" };
      },
    },
    "@/lib/user-color": colors,
    "@/lib/liveblocks": {
      getLiveblocks: () => {
        calls.push(["client"]);
        return {
          getOrCreateRoom: async (...args) => {
            calls.push(["room", ...plain(args)]);
            if (options.roomFailure) throw new Error("private upstream detail");
          },
          prepareSession: (...args) => { calls.push(["session", ...plain(args)]); return session; },
        };
      },
    },
  });
  return { ...api, calls };
}

test("signed-out callers cannot read profiles, check projects, or initialize Liveblocks", async () => {
  const f = fixture({ signedOut: true });
  const response = await f.POST(request());
  assert.equal(response.status, 401);
  assert.deepEqual(f.calls, []);
});

test("malformed room requests never reach profiles, project access, or Liveblocks", async () => {
  for (const body of [null, [], {}, { room: 5 }, { room: "" }, { room: " " }, { room: "*" }, { room: "project-*" }, { room: "a".repeat(129) }]) {
    const f = fixture();
    assert.equal((await f.POST(request(body))).status, 400);
    assert.deepEqual(f.calls, []);
  }
  const f = fixture();
  assert.equal((await f.POST(new Request("http://localhost", { method: "POST", body: "{" }))).status, 400);
  assert.deepEqual(f.calls, []);
});

test("missing or inaccessible projects return 403 before any Liveblocks call", async () => {
  const f = fixture({ denied: true });
  assert.equal((await f.POST(request())).status, 403);
  assert.deepEqual(f.calls, [
    ["profile"], ["access", "project-id", { userId: "user-id", email: "Member@Example.com" }],
  ]);
});

test("authorized sessions use private rooms, exact room permissions, and trusted Clerk metadata", async () => {
  const f = fixture();
  const response = await f.POST(request({ room: "project-id", userId: "forged", userInfo: { name: "Forged", color: "red" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { token: "test-token" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(f.calls, [
    ["profile"], ["access", "project-id", { userId: "user-id", email: "Member@Example.com" }],
    ["client"], ["room", "project-id", { defaultAccesses: [] }],
    ["session", "user-id", { userInfo: { name: "Test Member", avatar: "https://img.clerk.com/member", color: colors.getUserColor("user-id") } }],
    ["allow", "project-id", ["*:write"]], ["authorize"],
  ]);
});

test("missing Clerk users are rejected and missing display names have stable fallbacks", async () => {
  const absent = fixture({ user: null });
  assert.equal((await absent.POST(request())).status, 401);
  assert.deepEqual(absent.calls, [["profile"]]);
  for (const [user, name] of [
    [{ username: "handle" }, "handle"],
    [{ primaryEmailAddress: { emailAddress: "member@example.com" } }, "member@example.com"],
    [{}, "User"],
  ]) {
    const f = fixture({ user: { imageUrl: "avatar-url", ...user } });
    assert.equal((await f.POST(request())).status, 200);
    assert.equal(f.calls.find(call => call[0] === "session")[2].userInfo.name, name);
  }
});

test("room failures issue no token and upstream authorization failures retain their status", async () => {
  const failure = fixture({ roomFailure: true });
  const response = await failure.POST(request());
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
  assert.ok(!failure.calls.some(call => ["session", "authorize"].includes(call[0])));
  const denied = fixture({ result: { body: '{"error":"denied"}', status: 403 } });
  assert.equal((await denied.POST(request())).status, 403);
});

test("server client is lazy, requires a secret, and is shared across module reloads", () => {
  let constructions = 0;
  const globals = { process: { env: {} }, globalThis: {} };
  const deps = { "server-only": {}, "@liveblocks/node": { Liveblocks: class {
    constructor(options) { constructions++; assert.equal(options.secret, "sk_test_example"); }
  } } };
  const first = load("src/lib/liveblocks.ts", deps, globals);
  assert.equal(constructions, 0);
  assert.throws(() => first.getLiveblocks(), /LIVEBLOCKS_SECRET_KEY/);
  globals.process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_example";
  const client = first.getLiveblocks();
  assert.equal(first.getLiveblocks(), client);
  assert.equal(load("src/lib/liveblocks.ts", deps, globals).getLiveblocks(), client);
  assert.equal(constructions, 1);
});

test("cursor colors stay deterministic and belong to the same bounded palette", () => {
  const reloaded = load("src/lib/user-color.ts", {});
  const palette = new Set();
  for (let index = 0; index < 200; index++) {
    const id = `user-${index}`;
    const color = colors.getUserColor(id);
    assert.equal(reloaded.getUserColor(id), color);
    assert.match(color, /^#[0-9a-f]{6}$/i);
    palette.add(color);
  }
  assert.equal(palette.size, 8);
});
