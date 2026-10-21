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
test("riders move two empty tiles but cannot cross water, units or uncaptured villages", () => {
  const w = grid(),
    u = { x: 1, y: 1, type: "rider", team: 0 };
  assert.equal(movementPath(w, [u], u, w[1][3]).length, 2);
  w[1][2].city = { owner: -1, level: 1 };
  assert.equal(movementPath(w, [u], u, w[1][3]), null);
  w[1][2].city = null;
  w[1][2].type = "water";
  assert.equal(movementPath(w, [u], u, w[1][3]), null);
  w[1][2].type = "grass";
  assert.equal(movementPath(w, [u, { x: 2, y: 1 }], u, w[1][3]), null);
});
