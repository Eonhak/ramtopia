import test from "node:test";
import assert from "node:assert/strict";
import {
  addPopulation,
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
test("population grows cities at thresholds and retains overflow", () => {
  const c = { level: 1, population: 0 };
  assert.equal(addPopulation(c, 1), 0);
  assert.equal(addPopulation(c, 1), 1);
  assert.deepEqual(c, { level: 2, population: 0 });
  assert.equal(growthRequired(c), 3);
  assert.equal(addPopulation(c, 4), 1);
  assert.deepEqual(c, { level: 3, population: 1 });
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
  for (const kind of ["game", "fruit", "wood", "grain"])
    assert(inner.some((t) => t.resource === kind));
  assert.equal(a[2][2].resource, null);
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
  assert.equal(cityIncome(city, new Set(["trade"])), 7);
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
