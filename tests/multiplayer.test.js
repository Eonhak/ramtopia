import { assignTerritories } from "../src/rules.js";
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createRooms } from "../server/rooms.js";
import {
  createMatch,
  applyCommand,
  advanceTurn,
  expireTurn,
  matchView,
} from "../server/game.js";
import { createApp } from "../server/app.js";
const people = [
  { userId: 1, nickname: "왕1", nation: "rome" },
  { userId: 2, nickname: "왕2", nation: "goguryeo" },
  { userId: 3, nickname: "왕3", nation: "egypt" },
  { userId: 4, nickname: "왕4", nation: "han" },
];
const users = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  nickname: "왕" + (i + 1),
}));
function service() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2),(3),(4),(5)",
  );
  let now = 1000;
  return { db, rooms: createRooms(db, () => now), tick: (ms) => (now += ms) };
}
function fixture() {
  const g = createMatch(people.slice(0, 2), 0, 1000);
  for (const t of g.world.flat()) {
    t.type = "grass";
    t.city = null;
    t.resource = null;
    t.developed = false;
  }
  g.world[7][3].city = {
    owner: 0,
    level: 1,
    population: 0,
    name: "우리 수도",
    isCapital: true,
  };
  g.world[7][9].city = {
    owner: 1,
    level: 1,
    population: 0,
    name: "상대 수도",
    isCapital: true,
  };
  g.players[0].capital = { x: 3, y: 7 };
  g.players[1].capital = { x: 9, y: 7 };
  g.units = [
    { id: 1, x: 3, y: 7, team: 0, hp: 10, type: "warrior", acted: false },
    { id: 2, x: 5, y: 7, team: 1, hp: 10, type: "warrior", acted: false },
  ];
  for (const t of g.world.flat()) delete t.territory;
  assignTerritories(g.world);
  g.nextUnit = 3;
  g.knowledge = g.players.map(() => Array(256).fill(null));
  return g;
}
test("four players get distinct capitals, fog and starting nation technology", () => {
  const g = createMatch(people, 300, 1000);
  assert.equal(g.players.length, 4);
  assert.equal(g.deadline, 301000);
  assert.equal(
    new Set(g.players.map((p) => JSON.stringify(p.capital))).size,
    4,
  );
  for (let s = 0; s < 4; s++) {
    const v = matchView(g, s);
    assert.equal(v.units.filter((u) => u.team === 0).length, 1);
    assert(v.world.flat().filter((t) => t.seen).length < 30);
    assert.equal(v.players[s].team, 0);
    assert.equal(v.gold, 3);
    assert(!Object.hasOwn(v.players[(s + 1) % 4], "gold"));
  }
});
test("server validates movement, ownership, turn order and health-weighted combat", () => {
  const g = fixture();
  assert.throws(() => applyCommand(g, 1, { type: "endTurn" }), /자신의 차례/);
  assert.throws(
    () => applyCommand(g, 0, { type: "act", unitId: 2, x: 4, y: 7 }),
    /내 유닛/,
  );
  applyCommand(g, 0, { type: "act", unitId: 1, x: 4, y: 7 });
  assert.equal(g.units[0].moved, true);
  assert.throws(
    () => applyCommand(g, 0, { type: "act", unitId: 1, x: 4, y: 8 }),
    /이미 이동/,
  );
  applyCommand(g, 0, { type: "act", unitId: 1, x: 5, y: 7 });
  assert.equal(g.units[1].hp, 4);
  assert.equal(g.units[0].hp, 7);
  assert.throws(
    () => applyCommand(g, 0, { type: "act", unitId: 1, x: 5, y: 7 }),
    /행동을 마친/,
  );
});
test("research, harvest and recruitment use server stars and next-turn activation", () => {
  const g = fixture();
  g.units[0].x = 3;
  g.units[0].y = 6;
  g.players[0].gold = 100;
  g.world[7][4].resource = "fruit";
  applyCommand(g, 0, { type: "develop", x: 4, y: 7 });
  assert.equal(g.players[0].gold, 98);
  assert.equal(g.world[7][3].city.population, 1);
  applyCommand(g, 0, { type: "recruit", x: 3, y: 7, unitType: "warrior" });
  assert.equal(g.players[0].gold, 95);
  const recruit = g.units.at(-1);
  assert.equal(recruit.acted, true);
  assert.throws(
    () => applyCommand(g, 0, { type: "act", unitId: recruit.id, x: 2, y: 7 }),
    /행동을 마친/,
  );
  assert.throws(
    () =>
      applyCommand(g, 0, { type: "recruit", x: 9, y: 7, unitType: "warrior" }),
    /생산할 수/,
  );
  assert.throws(
    () => applyCommand(g, 0, { type: "research", tech: "constructor" }),
    /연구 조건/,
  );
  assert.throws(
    () =>
      applyCommand(g, 0, {
        type: "recruit",
        x: 2,
        y: 7,
        unitType: "constructor",
      }),
    /생산할 수/,
  );
  advanceTurn(g, 2000);
  advanceTurn(g, 3000);
  assert.equal(recruit.acted, false);
});
test("hidden enemy positions never appear in player snapshots", () => {
  const g = fixture();
  let v = matchView(g, 0);
  assert.equal(
    v.units.some((u) => u.team !== 0),
    false,
  );
  assert.equal(v.world[7][9].city, null);
  applyCommand(g, 0, { type: "act", unitId: 1, x: 4, y: 7 });
  v = matchView(g, 0);
  assert(v.units.some((u) => u.id === 2));
});
test("server timers, unlimited turns, income, rounds and resignations", () => {
  const g = createMatch(people, 300, 1000);
  assert.equal(expireTurn(g, 300999), false);
  assert.equal(expireTurn(g, 301000), true);
  assert.equal(g.activeSeat, 1);
  assert.equal(g.players[0].gold, 6);
  assert.equal(g.deadline, 601000);
  for (let i = 0; i < 3; i++) advanceTurn(g, 400000 + i);
  assert.equal(g.activeSeat, 0);
  assert.equal(g.round, 2);
  const unlimited = createMatch(people.slice(0, 2), 0, 0);
  assert.equal(expireTurn(unlimited, 10 ** 12), false);
  applyCommand(unlimited, 1, { type: "resign" });
  assert.equal(unlimited.finished, true);
  assert.equal(unlimited.winner, 0);
});
test("invite-only rooms enforce capacity, host settings, ready checks and server revisions", (t) => {
  const { db, rooms } = service();
  t.after(() => db.close());
  let r = rooms.create(users[0], { timeLimit: 600 });
  assert.equal(r.timeLimit, 600);
  assert.throws(() => rooms.get(users[4], r.code), /참가한 방/);
  assert.throws(
    () => rooms.action(users[0], r.code, { type: "start", version: r.version }),
    /2명 이상/,
  );
  for (const u of users.slice(1, 4)) rooms.join(u, { code: r.code });
  assert.throws(() => rooms.join(users[4], { code: r.code }), /최대 4명/);
  assert.throws(
    () => rooms.action(users[1], r.code, { type: "settings", timeLimit: 0 }),
    /방장/,
  );
  assert.throws(
    () => rooms.action(users[1], r.code, { type: "start" }),
    /방장/,
  );
  assert.throws(
    () => rooms.action(users[1], r.code, { type: "nation", nation: "rome" }),
    /다른 나라/,
  );
  for (const u of users.slice(0, 4))
    rooms.action(u, r.code, { type: "ready", ready: true });
  r = rooms.action(users[0], r.code, { type: "start" });
  assert.equal(r.phase, "playing");
  assert.equal(r.game.players.length, 4);
  assert.throws(
    () =>
      rooms.action(users[0], r.code, {
        type: "endTurn",
        version: r.version - 1,
      }),
    /상태가 바뀌/,
  );
  const after = rooms.action(users[0], r.code, {
    type: "endTurn",
    version: r.version,
  });
  assert.equal(after.game.activeSeat, 1);
  assert.throws(
    () =>
      rooms.action(users[0], r.code, {
        type: "endTurn",
        version: after.version,
      }),
    /자신의 차례/,
  );
  const restored = createRooms(db, () => 1000).get(users[1], r.code);
  assert.equal(restored.game.activeSeat, 1);
  assert.equal(restored.selfSeat, 1);
});
test("room timeout persists and departed players cannot read or mutate old rooms", (t) => {
  const { db, rooms, tick } = service();
  t.after(() => db.close());
  let r = rooms.create(users[0], { timeLimit: 300 });
  rooms.join(users[1], { code: r.code });
  for (const u of users.slice(0, 2))
    rooms.action(u, r.code, { type: "ready", ready: true });
  r = rooms.action(users[0], r.code, { type: "start" });
  tick(300000);
  r = rooms.get(users[0], r.code);
  assert.equal(r.game.activeSeat, 1);
  rooms.action(users[1], r.code, { type: "leave", version: r.version });
  assert.throws(() => rooms.get(users[1], r.code), /참加|참가/);
  assert.equal(rooms.current(users[1]), null);
  assert.equal(rooms.get(users[0], r.code).phase, "finished");
});
test("HTTP rooms require authentication and share state between cookie sessions", async (t) => {
  const server = createApp({ dbPath: ":memory:" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(path, body, cookie) {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      value: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  assert.equal((await api("/api/rooms/current")).status, 401);
  const cookies = [];
  for (let i = 0; i < 2; i++)
    cookies.push(
      (
        await api("/api/auth/register", {
          email: `player${i}@example.com`,
          password: "long-password",
          nickname: `플레이어${i}`,
        })
      ).cookie,
    );
  const created = await api("/api/rooms", { timeLimit: 0 }, cookies[0]);
  assert.equal(created.status, 201);
  const code = created.value.room.code;
  assert.equal(
    (await api("/api/rooms/join", { code }, cookies[1])).status,
    200,
  );
  for (const cookie of cookies)
    assert.equal(
      (
        await api(
          `/api/rooms/${code}/action`,
          { type: "ready", ready: true },
          cookie,
        )
      ).status,
      200,
    );
  const started = await api(
    `/api/rooms/${code}/action`,
    { type: "start" },
    cookies[0],
  );
  assert.equal(started.value.room.phase, "playing");
  const other = await api(`/api/rooms/${code}`, null, cookies[1]);
  assert.equal(other.value.room.game.selfSeat, 1);
  assert.equal(other.value.room.game.activeSeat, 0);
  assert.equal(
    (
      await api(
        `/api/rooms/${code}?since=${other.value.room.version}`,
        null,
        cookies[1],
      )
    ).value.room.unchanged,
    true,
  );
});

test("capital capture eliminates that kingdom and the last survivor wins", () => {
  const g = fixture();
  g.units[0].x = 8;
  g.units[0].y = 7;
  g.units[1].x = 9;
  g.units[1].y = 7;
  g.units[1].hp = 1;
  applyCommand(g, 0, { type: "act", unitId: 1, x: 9, y: 7 });
  assert.equal(g.players[1].eliminated, false);
  assert.equal(g.world[7][9].city.owner, 1);
  assert.throws(() => applyCommand(g,0,{type:"claim",unitId:1}));
  advanceTurn(g); advanceTurn(g);
  applyCommand(g,0,{type:"claim",unitId:1});
  assert.equal(g.players[1].eliminated, true);
  assert.equal(g.winner, 0);
  assert.equal(g.finished, true);
  assert.equal(g.world[7][9].city.owner, 0);
  assert.equal(g.units[0].acted, true);
});
test("lobby host transfers and changing turn limit resets every ready flag", (t) => {
  const { db, rooms } = service();
  t.after(() => db.close());
  let r = rooms.create(users[0], { timeLimit: 300 });
  rooms.join(users[1], { code: r.code });
  rooms.join(users[2], { code: r.code });
  for (const u of users.slice(0, 3))
    rooms.action(u, r.code, { type: "ready", ready: true });
  r = rooms.action(users[0], r.code, { type: "settings", timeLimit: 0 });
  assert(r.members.every((p) => !p.ready));
  rooms.action(users[0], r.code, { type: "leave" });
  r = rooms.get(users[1], r.code);
  assert.equal(r.hostId, users[1].id);
  assert.equal(r.selfSeat, 0);
  assert.equal(r.members.length, 2);
  assert.throws(() => rooms.get(users[0], r.code), /참가/);
});

test("neutral villages require an explicit claim on the next own turn and pay their level", () => {
  const g = fixture();
  g.units = g.units.filter(u => u.team === 0);
  const u = g.units[0];
  g.world[6][3].city = {owner:-1, level:2, population:2, experience:0, name:"중립"};
  applyCommand(g, 0, {type:"act", unitId:u.id, x:3, y:6});
  assert.equal(g.world[6][3].city.owner, -1);
  assert.throws(() => applyCommand(g, 0, {type:"claim", unitId:u.id}));
  advanceTurn(g); advanceTurn(g);
  applyCommand(g, 0, {type:"claim", unitId:u.id});
  assert.equal(g.world[6][3].city.owner, 0);
  assert.equal(u.acted, true);
  const before = g.players[0].gold;
  advanceTurn(g);
  assert.equal(g.players[0].gold - before, 5); // capital 3 + level-two village 2
});

test("attack events include projectile source and target only when visible", () => {
  const g = fixture();
  g.units[0].x = 4; g.units[0].type = "archer";
  applyCommand(g,0,{type:"act",unitId:1,x:5,y:7});
  const shot = matchView(g,0).lastAttack;
  assert.equal(shot.unit.type,"archer");
  assert.deepEqual(shot.from,{x:4,y:7});
  assert.deepEqual(shot.to,{x:5,y:7});
  g.units[0].x = 0; g.units[0].y = 0;
  g.world[7][3].city = null;
  assert.equal(matchView(g,0).lastAttack,null);
});

test("server shields reflect melee damage and publish feedback, while archers cannot trigger reflection", () => {
  for (const type of ["warrior","archer"]) {
    const g=fixture(); g.units[0].x=4; g.units[0].type=type;
    g.units[0].hp=type==="archer"?8:10;
    g.units[1].type="guard"; g.units[1].hp=15;
    applyCommand(g,0,{type:"act",unitId:1,x:5,y:7});
    assert.equal(g.units[1].hp,type==="archer"?10:9);
    assert.equal(g.units[0].hp,type==="archer"?8:4);
    assert.equal(g.lastAttack.reflected,type==="warrior");
  }
});
