import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../server/app.js";
async function runServer(t, opts = {}) {
  const server = createApp({ dbPath: ":memory:", ...opts });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    call: async (path, data, cookie, origin) => {
      const res = await fetch(base + "/api/auth/" + path, {
        method: data ? "POST" : "GET",
        headers: {
          ...(data ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(origin ? { Origin: origin } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return {
        status: res.status,
        body: await res.json(),
        cookie: res.headers.get("set-cookie"),
      };
    },
  };
}
const credentials = {
  email: "king@example.com",
  password: "long-password-123",
  nickname: "로마왕",
};
test("registration, hashed storage, session restoration, logout and persistent accounts", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "ramtopia-auth-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const dbPath = join(dir, "test.sqlite");
  const { call } = await runServer(t, { dbPath });
  assert.equal((await call("me")).body.user, null);
  const signup = await call("register", credentials);
  assert.equal(signup.status, 201);
  assert.equal(signup.body.user.nickname, "로마왕");
  assert(!("password_hash" in signup.body.user));
  assert.match(signup.cookie, /HttpOnly/);
  assert.match(signup.cookie, /SameSite=Lax/);
  const cookie = signup.cookie.split(";")[0];
  assert.equal(
    (await call("me", null, cookie)).body.user.email,
    credentials.email,
  );
  assert.equal((await call("register", credentials)).status, 409);
  assert.equal(
    (await call("login", { ...credentials, password: "incorrect-password" }))
      .status,
    401,
  );
  assert.equal(
    (await call("login", { ...credentials, email: "absent@example.com" }))
      .status,
    401,
  );
  assert.equal((await call("logout", {}, cookie)).status, 200);
  assert.equal((await call("me", null, cookie)).body.user, null);
  const login = await call("login", {
    ...credentials,
    email: " KING@EXAMPLE.COM ",
  });
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie, cookie);
  const db = new DatabaseSync(dbPath);
  const row = db.prepare("SELECT * FROM users").get();
  assert.notEqual(row.password_hash, credentials.password);
  assert.equal(row.password_hash.length, 128);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM users").get().n, 1);
  db.close();
  const restarted = await runServer(t, { dbPath });
  assert.equal((await restarted.call("login", credentials)).status, 200);
});
test("validation, CSRF origin rejection, JSON-only requests and expired sessions", async (t) => {
  const { base, call } = await runServer(t, { sessionLifetime: 0 });
  assert.equal(
    (await call("register", { ...credentials, password: "short" })).status,
    400,
  );
  assert.equal(
    (await call("register", { ...credentials, nickname: "<script>" })).status,
    400,
  );
  assert.equal(
    (await call("register", credentials, null, "https://evil.example")).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(credentials),
      })
    ).status,
    415,
  );
  const signed = await call("register", credentials);
  assert.equal(signed.status, 201);
  assert.equal(
    (await call("me", null, signed.cookie.split(";")[0])).body.user,
    null,
  );
});
test("login rate limiting and secure cross-origin cookie configuration", async (t) => {
  const { call, base } = await runServer(t, {
    appOrigin: "https://api.example.com",
    allowedOrigins: "https://eonhak.github.io",
  });
  const signed = await call(
    "register",
    credentials,
    null,
    "https://eonhak.github.io",
  );
  assert.equal(signed.status, 201);
  assert.match(signed.cookie, /SameSite=None; Secure/);
  const preflight = await fetch(base + "/api/auth/login", {
    method: "OPTIONS",
    headers: { Origin: "https://eonhak.github.io" },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://eonhak.github.io",
  );
  for (let i = 0; i < 30; i++)
    assert.equal(
      (await call("login", { ...credentials, password: "bad-password" }))
        .status,
      401,
    );
  assert.equal((await call("login", credentials)).status, 429);
});
