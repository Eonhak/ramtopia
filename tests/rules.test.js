import test from "node:test";
import assert from "node:assert/strict";
import {
  addCityExperience,
  growthRequired,
  cityForTile,
  movementPath,
} from "../src/rules.js";
import { pickTile } from "../src/isometric.js";
const grid = () =>
  Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => ({ x, y, type: "grass", city: null })),
  );
test("overlapping unit sprites cannot steal actionable ground or another unit base", () => {
  const target = { x: 1, y: 1 },
    other = { x: 2, y: 1 };
  const view = {
    ox: 0,
    oy: 0,
    scale: 2.27,
    hit: [
      { t: target, x: 0, y: 0, unit: false, available: "move" },
      { t: other, x: 0, y: 30, unit: true },
    ],
  };
  assert.equal(pickTile(view, 0, 0), target);
  view.hit[0].available = null;
  view.hit[0].unit = true;
  assert.equal(pickTile(view, 0, 0), target);
  view.hit[0].unit = false;
  view.hit[0].available = "attack";
  assert.equal(pickTile(view, 0, 0), target);
});
test("harvest grants XP; population increases only on city level-up", () => {
  const c = { level: 1, population: 1, experience: 0 };
  assert.equal(addCityExperience(c, 1), 0);
  assert.equal(c.population, 1);
  assert.equal(c.experience, 1);
  assert.equal(addCityExperience(c, 1), 1);
  assert.equal(c.population, 2);
  assert.equal(c.experience, 0);
  assert.deepEqual(c.pendingRewards, [2]);
  assert.equal(growthRequired(c), 3);
  assert.equal(addCityExperience(c, 4), 1);
  assert.equal(c.population, 3);
  assert.equal(c.experience, 1);
  assert.deepEqual(c.pendingRewards, [2, 3]);
});
test("resource ownership follows nearest city and cannot borrow enemy territory", () => {
  const w = grid();
  w[1][1].city = { owner: 0, level: 1 };
  w[1][3].city = { owner: 1, level: 1 };
  assert.equal(cityForTile(w, w[1][2]), w[1][1]);
  assert.equal(cityForTile(w, w[2][3]).city.owner, 1);
  assert.equal(cityForTile(w, w[4][4]), null);
});
test("riders cannot cross water, units or uncaptured villages in a corridor", () => {
  const w = [
      Array.from({ length: 5 }, (_, x) => ({
        x,
        y: 0,
        type: "grass",
        city: null,
      })),
    ],
    u = { x: 1, y: 0, type: "rider", team: 0 };
  assert.equal(movementPath(w, [u], u, w[0][3]).length, 2);
  w[0][2].city = { owner: -1, level: 1 };
  assert.equal(movementPath(w, [u], u, w[0][3]), null);
  w[0][2].city = null;
  w[0][2].type = "water";
  assert.equal(movementPath(w, [u], u, w[0][3]), null);
  w[0][2].type = "grass";
  assert.equal(movementPath(w, [u, { x: 2, y: 0 }], u, w[0][3]), null);
});

import {
  seedResources,
  canEnter,
  canRecruit,
  cityIncome,
  TECHNOLOGIES,
  TECH_BRANCHES,
  UNIT_TYPES,
} from "../src/rules.js";
function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("resources are randomized near cities with guaranteed starting harvest routes", () => {
  const a = grid(),
    b = grid();
  a[2][2].city = { owner: 0, level: 1 };
  b[2][2].city = { owner: 0, level: 1 };
  seedResources(a, seeded(1));
  seedResources(b, seeded(29));
  assert.notDeepEqual(
    a.flat().map((t) => t.resource),
    b.flat().map((t) => t.resource),
  );
  const inner = a
    .flat()
    .filter((t) => Math.max(Math.abs(t.x - 2), Math.abs(t.y - 2)) === 1);
  for (const kind of ["game", "fruit"])
    assert(inner.some((t) => t.resource === kind));
  assert.equal(a[2][2].resource, null);
  assert(inner.filter((t) => !t.resource).length >= 2);
  assert(a.flat().some((t) => !t.city && !t.resource));
});
test("mountains and water require their actual traversal research", () => {
  const w = grid(),
    u = { x: 1, y: 1, team: 0 };
  w[1][2].type = "mountain";
  assert.equal(movementPath(w, [u], u, w[1][2]), null);
  assert(movementPath(w, [u], u, w[1][2], 1, new Set(["climbing"])));
  w[1][2].type = "water";
  assert.equal(canEnter(w[1][2], u), false);
  assert(movementPath(w, [u], u, w[1][2], 1, new Set(["navigation"])));
});
test("connected roads halve movement cost, without giving a bonus on unconnected land", () => {
  const w = grid(),
    u = { x: 1, y: 1, team: 0 };
  for (const x of [1, 2, 3]) w[1][x].road = true;
  assert.equal(movementPath(w, [u], u, w[1][3]), null);
  assert.equal(
    movementPath(w, [u], u, w[1][3], 1, new Set(["roads"])).length,
    2,
  );
  w[1][2].road = false;
  assert.equal(movementPath(w, [u], u, w[1][3], 1, new Set(["roads"])), null);
});
test("unit production needs both city level and research, plus stars and a vacant city", () => {
  const city = { owner: 0, level: 1 },
    techs = new Set(["riding", "siege", "chivalry"]);
  assert(!canRecruit(city, "rider", techs, 100));
  city.level = 2;
  assert(canRecruit(city, "rider", techs, 100));
  assert(!canRecruit(city, "catapult", techs, 100));
  city.level = 3;
  assert(canRecruit(city, "catapult", techs, 100));
  assert(canRecruit(city, "knight", techs, 100));
  assert(!canRecruit(city, "knight", new Set(), 100));
  assert(!canRecruit(city, "rider", techs, 1));
  assert(!canRecruit(city, "rider", techs, 100, true));
  assert.equal(cityIncome(city, new Set(["trade"])), 5);
});
test("all technology chains are three tiers with valid ordered prerequisites", () => {
  for (const branch of TECH_BRANCHES) {
    assert.equal(branch.nodes.length, 3);
    assert(!TECHNOLOGIES[branch.nodes[0]].requires);
    for (let i = 1; i < 3; i++)
      assert.equal(TECHNOLOGIES[branch.nodes[i]].requires, branch.nodes[i - 1]);
  }
  for (const s of Object.values(UNIT_TYPES))
    if (s.tech) assert(TECHNOLOGIES[s.tech]);
});

import { generateWorld, NATIONS } from "../src/world.js";
import { NEIGHBORS } from "../src/rules.js";
test("eight-direction movement includes diagonal destinations and avoids blocked corner cuts", () => {
  const w = grid(),
    u = { x: 1, y: 1, team: 0 };
  assert.equal(movementPath(w, [u], u, w[2][2]).length, 1);
  w[1][2].type = "water";
  w[2][1].type = "water";
  assert.equal(movementPath(w, [u], u, w[2][2]), null);
});
test("forests cost extra movement for mobile units, but one-move units are exempt", () => {
  const w = [Array.from({ length: 5 }, (_, x) => ({ x, y: 0, type: "grass" }))],
    r = { x: 0, y: 0, type: "rider", team: 0 },
    v = { ...r, type: "warrior" };
  w[0][1].type = "forest";
  assert.equal(movementPath(w, [r], r, w[0][1]).length, 1);
  assert.equal(movementPath(w, [r], r, w[0][2]), null);
  assert.equal(movementPath(w, [v], v, w[0][1]).length, 1);
  w[0][1].road = true;
  w[0][0].road = true;
  assert.equal(movementPath(w, [r], r, w[0][2], 2, new Set(["roads"])), null);
});
test("random maps change terrain and settlement positions while keeping cities connected", () => {
  const a = generateWorld(12, seeded(42)),
    b = generateWorld(12, seeded(99));
  assert.notDeepEqual(a.home, b.home);
  assert.notDeepEqual(
    a.world.flat().map((t) => t.type),
    b.world.flat().map((t) => t.type),
  );
  for (let seed = 1; seed <= 35; seed++) {
    const g = generateWorld(12, seeded(seed)),
      cities = g.world.flat().filter((t) => t.city);
    assert.equal(cities.length, 5);
    assert.equal(cities.filter((t) => t.city.owner === 0).length, 1);
    assert.equal(cities.filter((t) => t.city.owner === 1).length, 1);
    const queue = [g.home],
      seen = new Set([g.home.x + "," + g.home.y]);
    while (queue.length) {
      const n = queue.shift();
      for (const [dx, dy] of NEIGHBORS) {
        const t = g.world[n.y + dy]?.[n.x + dx];
        if (
          !t ||
          !["grass", "forest"].includes(t.type) ||
          seen.has(t.x + "," + t.y)
        )
          continue;
        if (dx && dy) {
          const walk = (v) => v && ["grass", "forest"].includes(v.type);
          if (
            !walk(g.world[n.y]?.[n.x + dx]) &&
            !walk(g.world[n.y + dy]?.[n.x])
          )
            continue;
        }
        seen.add(t.x + "," + t.y);
        queue.push(t);
      }
    }
    for (const c of cities) assert(seen.has(c.x + "," + c.y));
  }
});
test("archers require hunting then archery, a level-2 city and have range 2", () => {
  assert.equal(TECHNOLOGIES.archery.requires, "hunting");
  assert.equal(TECHNOLOGIES.marksmanship.requires, "archery");
  assert.equal(UNIT_TYPES.archer.range, 2);
  assert(
    !canRecruit({ owner: 0, level: 1 }, "archer", new Set(["archery"]), 100),
  );
  assert(
    canRecruit({ owner: 0, level: 2 }, "archer", new Set(["archery"]), 100),
  );
  assert(NATIONS.some((n) => n.id === "rome"));
  assert(NATIONS.some((n) => n.id === "goguryeo"));
  for (const n of NATIONS)
    assert(TECHNOLOGIES[n.tech] && !TECHNOLOGIES[n.tech].requires);
});

import {
  combatStats,
  refreshVisibility,
  isNight,
  promote,
  changeVessel,
} from "../src/rules.js";
test("assassins are weak by day and gain speed and damage at night", () => {
  const u = { type: "assassin" };
  assert.equal(combatStats(u).moves, 1);
  assert.equal(combatStats(u).attack, 1);
  assert.equal(combatStats(u, { night: true }).moves, 3);
  assert.equal(combatStats(u, { night: true }).attack, 10);
  assert(!isNight(1));
  assert(isNight(2));
});
test("transport ships cannot attack, upgrades cost stars and require research", () => {
  const u = { type: "warrior", boat: "transport", hp: 10 };
  assert.equal(combatStats(u).attack, 0);
  assert.equal(combatStats(u).counter, 0);
  assert.equal(combatStats(u).range, 0);
  assert.equal(changeVessel(u, "scout", new Set(), 100), false);
  assert.equal(changeVessel(u, "scout", new Set(["navigation"]), 2), false);
  assert.equal(changeVessel(u, "scout", new Set(["navigation"]), 3), 3);
  assert.equal(combatStats(u).attack, 3);
  assert.equal(changeVessel(u, "warship", new Set(["navigation"]), 100), false);
  assert.equal(changeVessel(u, "warship", new Set(["navalwarfare"]), 5), 5);
  assert.equal(combatStats(u).attack, 7);
  assert.equal(changeVessel(u, "scout", new Set(["navigation"]), 100), false);
});
test("three kills allow one veteran promotion with +5 max hp and full healing", () => {
  const u = { hp: 1, kills: 2 };
  assert.equal(promote(u), false);
  u.kills = 3;
  assert(promote(u));
  assert.equal(u.hp, 15);
  assert.equal(combatStats(u).hp, 15);
  u.hp = 2;
  assert.equal(promote(u), false);
  assert.equal(u.hp, 2);
});
test("basic fog exposes only nearby tiles; night hides unencountered diagonals and diplomacy never reveals the entire map", () => {
  const w = grid(),
    u = { x: 2, y: 2, team: 0 };
  refreshVisibility(w, [u], false, new Set());
  assert.equal(w.flat().filter((t) => t.visible).length, 9);
  assert.equal(w.flat().filter((t) => t.seen).length, 9);
  refreshVisibility(w, [u], true, new Set());
  assert.equal(w.flat().filter((t) => t.visible).length, 5);
  assert.equal(w.flat().filter((t) => t.seen).length, 9);
  refreshVisibility(w, [u], true, new Set(["diplomacy"]));
  assert.equal(w.flat().filter((t) => t.seen).length, 9);
  assert.equal(w.flat().filter((t) => t.visible).length, 5);
});

import { researchCost, healthDamage, canManageCity } from "../src/rules.js";
test("only owned cities allow management and growth increases research prices", () => {
  assert.equal(canManageCity({ owner: -1 }), false);
  assert.equal(canManageCity({ owner: 1 }), false);
  assert.equal(canManageCity({ owner: 0 }), true);
  assert.equal(
    researchCost({ cost: 5 }, [
      { owner: 0, level: 2 },
      { owner: 0, level: 3 },
      { owner: 1, level: 9 },
    ]),
    9,
  );
});
test("remaining health scales attack and counter damage", () => {
  assert.equal(healthDamage(6, 10, 10), 6);
  assert.equal(healthDamage(6, 5, 10), 3);
  assert.equal(healthDamage(6, 1, 10), 1);
  assert.equal(healthDamage(0, 10, 10), 0);
  assert.equal(healthDamage(6, 0, 10), 0);
});

test("city income starts at three stars and gains one per city level", () => {
  for (const level of [1, 2, 3, 7])
    assert.equal(cityIncome({ level, isCapital: true }, new Set()), level + 2);
});


test("scouting modestly extends daytime land vision to thirteen tiles, not a five-by-five square", () => {
  const w=grid(), u={x:2,y:2,team:0};
  refreshVisibility(w,[u],false,new Set(["scouting"]));
  assert.equal(w.flat().filter(t=>t.visible).length,13);
  assert.equal(w[2][4].visible,true);
  assert.equal(w[3][3].visible,true);
  assert.equal(w[4][4].visible,false);
  refreshVisibility(w,[u],true,new Set(["scouting"]));
  assert.equal(w.flat().filter(t=>t.visible).length,5);
  assert.equal(w[1][1].visible,false);
  assert.equal(w[0][2].visible,false);
});
