import { createRooms } from "./rooms.js";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync, createReadStream, statSync } from "node:fs";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const scrypt = promisify(scryptCallback);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const DAY = 86400000;
const sessionName = "ramtopia_session";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export function createApp({
  dbPath = process.env.DATABASE_PATH || "./data/ramtopia.sqlite",
  appOrigin = process.env.APP_ORIGIN || "",
  allowedOrigins = process.env.ALLOWED_ORIGINS || "",
  sessionLifetime = 7 * DAY,
} = {}) {
  if (dbPath !== ":memory:")
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, nickname TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);`);
  const rooms = createRooms(db);
  const allowed = new Set(
    allowedOrigins
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (appOrigin) allowed.add(new URL(appOrigin).origin);
  const secure = appOrigin.startsWith("https://");
  const crossSite = secure && allowed.size > 1;
  const rates = new Map();
  function limited(key, max, windowMs) {
    const now = Date.now();
    if (rates.size > 2000)
      for (const [k, v] of rates) if (v.until <= now) rates.delete(k);
    let entry = rates.get(key);
    if (!entry || entry.until <= now) {
      entry = { count: 0, until: now + windowMs };
      rates.set(key, entry);
    }
    return ++entry.count > max;
  }
  const cookie = (token, age) =>
    `${sessionName}=${token}; HttpOnly; Path=/; Max-Age=${age}; SameSite=${crossSite ? "None" : "Lax"}${secure ? "; Secure" : ""}`;
  const profile = (u) => ({ id: u.id, email: u.email, nickname: u.nickname });
  async function body(req) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw Object.assign(new Error("JSON 요청만 가능합니다."), {
        status: 415,
      });
    let size = 0,
      chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096)
        throw Object.assign(new Error("요청이 너무 큽니다."), { status: 413 });
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString());
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      return value;
    } catch {
      throw Object.assign(new Error("잘못된 요청입니다."), { status: 400 });
    }
  }
  function current(req) {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(sessionName + "="))
      ?.slice(sessionName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return db
      .prepare(
        "SELECT users.id, email, nickname, token_hash FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?",
      )
      .get(digest(token), Date.now());
  }
  function session(res, user, old) {
    if (old)
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(old.token_hash);
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      digest(token),
      user.id,
      Date.now() + sessionLifetime,
    );
    res.setHeader(
      "Set-Cookie",
      cookie(token, Math.floor(sessionLifetime / 1000)),
    );
  }
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    const send = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/api/")) {
        if (!["GET", "HEAD"].includes(req.method))
          return send(405, { error: "허용되지 않은 요청입니다." });
        const path = resolve(
          root,
          "." +
            decodeURIComponent(
              url.pathname === "/" ? "/index.html" : url.pathname,
            ),
        );
        if (!path.startsWith(root + sep))
          return send(404, { error: "페이지가 없습니다." });
        let stat;
        try {
          stat = statSync(path);
        } catch {
          return send(404, { error: "페이지가 없습니다." });
        }
        if (!stat.isFile()) return send(404, { error: "페이지가 없습니다." });
        res.writeHead(200, {
          "Content-Type": types[extname(path)] || "application/octet-stream",
          "Cache-Control": path.endsWith("index.html")
            ? "no-cache"
            : "public, max-age=3600",
        });
        if (req.method === "HEAD") return res.end();
        createReadStream(path)
          .on("error", () => res.destroy())
          .pipe(res);
        return;
      }
      const origin = req.headers.origin;
      const ownOrigin = appOrigin
        ? new URL(appOrigin).origin
        : `http://${req.headers.host}`;
      if (origin && origin !== ownOrigin && !allowed.has(origin))
        return send(403, { error: "허용되지 않은 접속 주소입니다." });
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        return res.end();
      }
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(200, { ok: true });
      if (req.method === "GET" && url.pathname === "/api/auth/me") {
        const user = current(req);
        return send(200, { user: user ? profile(user) : null });
      }
      if (
        url.pathname === "/api/rooms" ||
        url.pathname.startsWith("/api/rooms/")
      ) {
        const user = current(req);
        if (!user) return send(401, { error: "로그인이 필요합니다." });
        if (req.method === "GET") {
          if (url.pathname === "/api/rooms/current")
            return send(200, { room: rooms.current(user) });
          const match = url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{10})$/);
          if (match)
            return send(200, {
              room: rooms.get(user, match[1], url.searchParams.get("since")),
            });
        }
        if (req.method === "POST") {
          const data = await body(req);
          if (limited("room-action:" + user.id, 180, 60000))
            return send(429, { error: "잠시 후 다시 시도하세요." });
          if (url.pathname === "/api/rooms")
            return send(201, { room: rooms.create(user, data) });
          if (url.pathname === "/api/rooms/join")
            return send(200, { room: rooms.join(user, data) });
          const match = url.pathname.match(
            /^\/api\/rooms\/([A-Fa-f0-9]{10})\/action$/,
          );
          if (match)
            return send(200, { room: rooms.action(user, match[1], data) });
        }
        return send(404, { error: "방 API가 없습니다." });
      }
      if (req.method !== "POST") return send(404, { error: "API가 없습니다." });
      const data = await body(req);
      const ip =
        process.env.TRUST_PROXY === "1"
          ? String(req.headers["x-forwarded-for"] || req.socket.remoteAddress)
              .split(",")[0]
              .trim()
          : req.socket.remoteAddress;
      if (url.pathname === "/api/auth/logout") {
        const user = current(req);
        if (user)
          db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
            user.token_hash,
          );
        res.setHeader("Set-Cookie", cookie("", 0));
        return send(200, { user: null });
      }
      if (!["/api/auth/register", "/api/auth/login"].includes(url.pathname))
        return send(404, { error: "API가 없습니다." });
      const registration = url.pathname.endsWith("register");
      if (
        limited(
          `${registration ? "register" : "login"}:${ip}`,
          registration ? 8 : 30,
          15 * 60000,
        )
      )
        return send(429, {
          error: "시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
        });
      const email =
        typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
      const password = typeof data.password === "string" ? data.password : "";
      if (
        email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        password.length < 8 ||
        password.length > 128
      )
        return send(400, {
          error: "올바른 이메일과 8~128자의 비밀번호를 입력하세요.",
        });
      let user;
      if (registration) {
        const nickname =
          typeof data.nickname === "string" ? data.nickname.trim() : "";
        if (
          nickname.length < 2 ||
          nickname.length > 20 ||
          /[\u0000-\u001f<>]/.test(nickname)
        )
          return send(400, { error: "닉네임을 2~20자로 입력하세요." });
        if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
          return send(409, { error: "이미 가입된 이메일입니다." });
        const salt = randomBytes(16).toString("hex"),
          hash = (await scrypt(password, salt, 64)).toString("hex");
        try {
          const row = db
            .prepare(
              "INSERT INTO users(email,nickname,salt,password_hash,created_at) VALUES(?,?,?,?,?)",
            )
            .run(email, nickname, salt, hash, Date.now());
          user = { id: Number(row.lastInsertRowid), email, nickname };
        } catch (e) {
          if (
            String(e.code).includes("CONSTRAINT") ||
            /UNIQUE constraint failed/.test(e.message)
          )
            return send(409, { error: "이미 가입된 이메일입니다." });
          throw e;
        }
      } else {
        user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
        const candidate = await scrypt(
          password,
          user?.salt || "ramtopia-missing-user-salt",
          64,
        );
        const expected = user
          ? Buffer.from(user.password_hash, "hex")
          : Buffer.alloc(64);
        if (!timingSafeEqual(candidate, expected) || !user)
          return send(401, { error: "이메일 또는 비밀번호를 확인하세요." });
      }
      session(res, user, current(req));
      return send(registration ? 201 : 200, { user: profile(user) });
    } catch (e) {
      if (!e.status) console.error("Request failed:", e);
      if (!res.headersSent)
        send(e.status || 500, {
          error: e.status
            ? e.message
            : "서버 오류입니다. 잠시 후 다시 시도하세요.",
        });
      else res.destroy();
    }
  });
  server.on("close", () => db.close());
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.APP_ORIGIN?.startsWith("https://")
  )
    throw new Error("Set APP_ORIGIN to the public HTTPS server URL.");
  const server = createApp();
  server.listen(Number(process.env.PORT || 8080), "0.0.0.0", () =>
    console.log(`RAMTOPIA server listening on port ${server.address().port}`),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => server.close(() => process.exit(0)));
}
