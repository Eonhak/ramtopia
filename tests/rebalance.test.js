import test from "node:test";
import assert from "node:assert/strict";
import {
  createMatch,
  applyCommand,
  advanceTurn,
  upgradeMatch,
} from "../server/game.js";
import { NATIONS, generateWorld } from "../src/world.js";
import {
  researchCost,
  kingdomIncome,
  assignTerritories,
} from "../src/rules.js";
const members = NATIONS.map((n, i) => ({ nation: n.id, nickname: "나라" + i }));
const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
test("all player starts preserve guaranteed separation for every supported size, player count and random seed", () => {
  for (const size of [12, 16, 20, 24])
    for (const players of [2, 4, 8])
      for (let seed = 1; seed <= 20; seed++) {
        let state = seed;
        const random = () =>
          (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
        const g = generateWorld(size, random, { players });
        assert.equal(g.starts.length, players);
        for (let i = 0; i < players; i++)
          for (let j = 0; j < i; j++)
            assert(distance(g.starts[i], g.starts[j]) >= Math.floor(size / 3));
      }
  for (const size of [12, 16, 20, 24])
    for (const players of [2, 4, 8]) {
      const g = createMatch(members.slice(0, players), 0, 0, { size });
      for (let i = 0; i < players; i++) {
        assert.equal(
          g.world[g.players[i].capital.y][g.players[i].capital.x].city.owner,
          i,
        );
        for (let j = 0; j < i; j++)
          assert(
            distance(g.players[i].capital, g.players[j].capital) >=
              g.minimumStartDistance,
          );
      }
    }
});
test("every seat starts equally with three stars and collects only at the start of subsequent own turns", () => {
  const g = createMatch(members.slice(0, 4), 300, 0);
  for (let i = 0; i < 4; i++) {
    assert.equal(g.activeSeat, i);
    assert.equal(g.players[i].gold, 3);
    advanceTurn(g, 1000 + i);
  }
  assert.equal(g.activeSeat, 0);
  assert.equal(g.players[0].gold, 6);
  assert.equal(g.players[1].gold, 3);
  const before = g.players[0].gold;
  advanceTurn(g);
  assert.equal(g.players[0].gold, before);
  assert.equal(g.players[1].gold, 6);
});
test("kingdom base replaces capital bonuses and research growth is softened", () => {
  assert.equal(kingdomIncome([{ level: 1 }], new Set()), 3);
  assert.equal(kingdomIncome([{ level: 2 }, { level: 3 }], new Set()), 7);
  assert.equal(
    kingdomIncome([{ level: 2 }, { level: 3 }], new Set(["trade"])),
    11,
  );
  assert.equal(researchCost({ cost: 5 }, [{ owner: 0, level: 1 }]), 4);
  assert.equal(
    researchCost({ cost: 5 }, [
      { owner: 0, level: 2 },
      { owner: 0, level: 3 },
    ]),
    6,
  );
  assert.equal(researchCost({ cost: 0 }, [{ owner: 0, level: 1 }]), 0);
});
test("capturing a starting city does not erase surviving armies; defeat requires no cities and no units", () => {
  const g = createMatch(members.slice(0, 2), 0);
  for (const t of g.world.flat()) {
    t.type = "grass";
    t.city = null;
  }
  g.world[3][3].city = { owner: 0, name: "내 도시", level: 1, population: 1 };
  g.world[3][4].city = {
    owner: 1,
    name: "옛 수도",
    level: 1,
    population: 1,
    isCapital: true,
  };
  assignTerritories(g.world);
  g.units = [
    {
      id: 1,
      x: 4,
      y: 3,
      team: 0,
      type: "warrior",
      hp: 10,
      claimSite: "4,3",
      claimRound: 1,
      acted: false,
    },
    { id: 2, x: 5, y: 3, team: 1, type: "warrior", hp: 1 },
  ];
  applyCommand(g, 0, { type: "claim", unitId: 1 });
  assert.equal(g.players[1].eliminated, false);
  assert.equal(g.units.length, 2);
  assert.equal(g.finished, false);
  advanceTurn(g);
  advanceTurn(g);
  applyCommand(g, 0, { type: "act", unitId: 1, x: 5, y: 3 });
  assert.equal(g.players[1].eliminated, true);
  assert.equal(g.finished, true);
  assert.equal(g.winner, 0);
});
test("old saves retain stars and starting positions but lose capital-specific rules", () => {
  const g = createMatch(members.slice(0, 2), 0);
  g.rulesVersion = 4;
  const before = structuredClone(g.players.map((p) => p.capital));
  g.players[0].gold = 17;
  for (const t of g.world.flat())
    if (t.city?.owner >= 0) t.city.isCapital = true;
  assert(upgradeMatch(g));
  assert.equal(g.players[0].gold, 17);
  assert.deepEqual(
    g.players.map((p) => p.capital),
    before,
  );
  assert(g.world.flat().every((t) => !t.city?.isCapital));
  assert.equal(upgradeMatch(g), false);
});

test("hard AI sends an economy-style army toward a visible enemy instead of always choosing the nearest neutral village", async () => {
  const { takeBotTurn } = await import("../server/ai.js");
  for (const difficulty of ["normal", "hard"]) {
    const g = createMatch(members.slice(0, 2), 0);
    for (const t of g.world.flat()) {
      t.type = "grass";
      t.city = null;
      t.resource = null;
    }
    g.world[1][1].city = { owner: 0, level: 1, population: 1, name: "나" };
    g.world[10][10].city = { owner: 1, level: 1, population: 1, name: "AI" };
    g.world[5][4].city = { owner: -1, level: 1, population: 1, name: "중립" };
    assignTerritories(g.world);
    g.players[1].bot = true;
    g.players[1].difficulty = difficulty;
    g.players[1].aiStyle = "economy";
    g.players[1].aiSeed = 42;
    g.players[1].gold = 0;
    g.players[1].capital = { x: 10, y: 10 };
    g.players[1].researched = [];
    g.activeSeat = 1;
    g.units = [
      { id: 1, x: 7, y: 5, team: 0, type: "archer", hp: 8 },
      { id: 2, x: 5, y: 5, team: 1, type: "warrior", hp: 10 },
      { id: 3, x: 6, y: 6, team: 1, type: "warrior", hp: 10, acted: true },
    ];
    g.knowledge = g.players.map(() => Array(144).fill(null));
    takeBotTurn(g);
    if (difficulty === "hard") {
      assert.equal(g.lastAttack?.unitId, 2);
      assert(g.units.find((u) => u.id === 1).hp < 8);
    } else {
      assert.equal(g.units.find((u) => u.id === 2).x, 4);
      assert.equal(g.world[5][4].city.owner, -1);
    }
  }
});
