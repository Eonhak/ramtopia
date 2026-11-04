import test from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  applyCommand,
  advanceTurn,
  matchView,
} from "../server/game.js";
import { assignTerritories } from "../src/rules.js";
import { takeBotTurn } from "../server/ai.js";
function board() {
  const g = createMatch(
    [
      { nation: "rome", nickname: "파랑왕" },
      { nation: "goguryeo", nickname: "빨강왕", bot: true, difficulty: "hard" },
    ],
    0,
    0,
    { size: 12 },
  );
  for (const t of g.world.flat()) {
    t.type = "grass";
    t.city = null;
    t.resource = null;
    t.developed = false;
  }
  g.world[7][3].city = { owner: 0, name: "내 도시", level: 1, population: 1 };
  g.world[10][10].city = {
    owner: 1,
    name: "상대 도시",
    level: 1,
    population: 1,
  };
  assignTerritories(g.world);
  g.units = [
    { id: 1, x: 7, y: 7, team: 0, type: "warrior", hp: 1 },
    { id: 2, x: 8, y: 8, team: 1, type: "warrior", hp: 10 },
    { id: 3, x: 4, y: 7, team: 1, type: "warrior", hp: 10 },
  ];
  g.players[1].capital = { x: 10, y: 10 };
  g.players[1].gold = 0;
  g.players[1].researched = [];
  g.knowledge = g.players.map(() => Array(144).fill(null));
  g.nextUnit = 4;
  applyCommand(g, 0, { type: "endTurn" });
  return g;
}
test("visible AI steps and kills are retained in order even when the victim supplied the lost vision", () => {
  const g = board();
  applyCommand(g, 1, { type: "act", unitId: 2, x: 8, y: 7 });
  applyCommand(g, 1, { type: "act", unitId: 2, x: 7, y: 7 });
  applyCommand(g, 1, { type: "act", unitId: 3, x: 4, y: 6 });
  advanceTurn(g);
  const v = matchView(g, 0),
    events = v.visualEvents;
  assert.deepEqual(
    events.map((e) => e.kind),
    ["move", "attack", "move"],
  );
  assert.deepEqual(
    events.map((e) => e.id),
    [1, 2, 3],
  );
  assert.equal(events[1].defender.id, 1);
  assert.equal(events[1].defenderAfter, null);
  assert(events[1].visibleTiles.includes(7 * 12 + 7));
  assert.equal(v.world[7][7].visible, false);
  assert.equal(events[1].actorAfter.x, 7);
  assert.equal(events[1].actorAfter.y, 7);
  assert.equal(
    v.lastAttack,
    null,
    "current-vision-only lastAttack cannot represent this kill",
  );
});
test("hidden AI actions do not create a viewer event, reveal an endpoint, or increment that viewer sequence", () => {
  const g = board();
  g.units.push({ id: 4, x: 10, y: 9, team: 1, type: "warrior", hp: 10 });
  applyCommand(g, 1, { type: "act", unitId: 4, x: 10, y: 8 });
  const v = matchView(g, 0);
  assert.deepEqual(v.visualEvents, []);
  assert.equal(v.visualSequence, 0);
  assert(matchView(g, 1).visualEvents.length > 0);
});
test("a move leaving current vision publishes only its last visible point", () => {
  const g = board();
  applyCommand(g, 1, { type: "act", unitId: 3, x: 5, y: 7 });
  const events = matchView(g, 0).visualEvents;
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "leave");
  assert.deepEqual(events[0].from, { x: 4, y: 7 });
  assert(!("to" in events[0]));
  assert(!("actorAfter" in events[0]));
});
test("a hidden ranged attacker produces victim-only hit feedback without leaking the attacker location", () => {
  const g = board();
  g.units = g.units.filter((u) => u.id !== 2);
  g.units[0].x = 6;
  g.units[0].y = 7;
  g.units.push(
    { id: 4, x: 8, y: 7, team: 1, type: "archer", hp: 8 },
    { id: 9, x: 6, y: 8, team: 1, type: "warrior", hp: 10 },
  );
  applyCommand(g, 1, { type: "act", unitId: 4, x: 6, y: 7 });
  const e = matchView(g, 0).visualEvents.at(-1);
  assert.equal(e.kind, "hit");
  assert.equal(e.defender.id, 1);
  assert(!e.actor);
  assert(!e.from);
  assert(!("team" in e));
  assert.equal(e.defenderAfter, null);
});
test("visible resource changes are delivered as tile updates and invisible changes stay private", () => {
  const g = board();
  g.players[1].gold = 20;
  g.players[1].researched = ["hunting"];
  g.world[7][4].city = {
    owner: 1,
    name: "가까운 도시",
    level: 1,
    population: 1,
  };
  assignTerritories(g.world);
  g.world[7][5].type = "forest";
  g.world[7][5].resource = "game";
  // A human scout sees this resource before the harvest.
  g.units.push({ id: 8, x: 5, y: 6, team: 0, type: "warrior", hp: 10 });
  applyCommand(g, 1, { type: "develop", x: 5, y: 7 });
  let e = matchView(g, 0).visualEvents.at(-1);
  assert.equal(e.kind, "tile");
  assert.equal(e.tile.developed, true);
  assert.equal(e.tile.resource, "game");
  const previous = matchView(g, 0).visualSequence;
  g.world[10][9].type = "forest";
  g.world[10][9].resource = "game";
  applyCommand(g, 1, { type: "develop", x: 9, y: 10 });
  assert.equal(matchView(g, 0).visualSequence, previous);
});
test("AI turn execution uses the same visible event stream as human commands", () => {
  const g = board();
  takeBotTurn(g);
  const events = matchView(g, 0).visualEvents;
  assert(events.some((e) => e.kind === "attack" && e.defender.id === 1));
  assert(events.every((e, i) => !i || e.id > events[i - 1].id));
});
test("viewer queues stay bounded and retain their independent sequence across saved game restoration", () => {
  const g = board();
  for (let i = 0; i < 70; i++) {
    const u = g.units.find((u) => u.id === 3);
    u.moved = false;
    u.acted = false;
    u.attacked = false;
    applyCommand(g, 1, { type: "act", unitId: 3, x: u.x === 4 ? 3 : 4, y: 7 });
  }
  const v = matchView(g, 0);
  assert.equal(v.visualEvents.length, 64);
  assert.equal(v.visualSequence, 70);
  assert.equal(v.visualEvents[0].id, 7);
  assert.deepEqual(
    matchView(structuredClone(g), 0).visualEvents,
    v.visualEvents,
  );
});

test("movement presentation embarks and disembarks per path step instead of walking on water", () => {
  const g = board(),
    u = g.units.find((u) => u.id === 3);
  u.type = "rider";
  g.players[1].researched = ["navigation"];
  g.world[7][5].type = "water";
  g.world[6][5].type = "mountain";
  g.world[8][5].type = "mountain";
  applyCommand(g, 1, { type: "act", unitId: 3, x: 6, y: 7 });
  const events = matchView(g, 1).visualEvents.filter((e) => e.actor?.id === 3);
  assert.equal(events.length, 2);
  assert.equal(events[0].actor.boat, "transport");
  assert.equal(events[0].actorAfter.boat, "transport");
  assert.equal(events[1].actor.boat, "transport");
  assert.equal(events[1].actorAfter.boat, undefined);
  assert.equal(u.boat, undefined);
});

test("presentation units omit stale internal claim coordinates", () => {
  const g = board();
  g.units.find((u) => u.id === 3).claimSite = "10,10";
  applyCommand(g, 1, { type: "act", unitId: 3, x: 5, y: 7 });
  const e = matchView(g, 0).visualEvents[0];
  assert.equal(e.kind, "leave");
  assert(!("claimSite" in e.actor));
});
