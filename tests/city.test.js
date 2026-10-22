import test from "node:test";
import assert from "node:assert/strict";
import {
  assignTerritories,
  cityForTile,
  addCityExperience,
  cityRewardOptions,
  claimCityReward,
  giantSpawnTile,
  battleDamage,
  hasWallDefence,
  canRecruit,
  UNIT_TYPES,
  cityIncome,
} from "../src/rules.js";
import { createMatch, applyCommand, upgradeMatch } from "../server/game.js";
function fixture() {
  const world = Array.from({ length: 9 }, (_, y) =>
    Array.from({ length: 9 }, (_, x) => ({
      x,
      y,
      type: "grass",
      city: null,
      resource: null,
    })),
  );
  world[4][3].city = {
    name: "도시",
    owner: 0,
    level: 1,
    population: 1,
    experience: 0,
  };
  world[4][6].city = {
    name: "이웃",
    owner: 1,
    level: 1,
    population: 1,
    experience: 0,
  };
  assignTerritories(world);
  return { world, t: world[4][3] };
}
test("city starts with nine tiles; XP levels do not expand territory automatically", () => {
  const { world, t } = fixture();
  assert.equal(
    world.flat().filter((p) => cityForTile(world, p) === t).length,
    9,
  );
  addCityExperience(t.city, 14);
  assert.equal(t.city.level, 5);
  assert.equal(t.city.population, 5);
  assert.equal(cityForTile(world, world[4][1]), null);
  assert.equal(
    world.flat().filter((p) => cityForTile(world, p) === t).length,
    9,
  );
  assert(cityRewardOptions(t.city).some((o) => o.key === "expand"));
});
test("expansion is capped twice and never takes existing neighbouring territory", () => {
  const { world, t } = fixture();
  t.city.pendingRewards = [2, 3, 4];
  claimCityReward(world, t, "expand", [], 0);
  assert.equal(cityForTile(world, world[4][1]), t);
  assert.equal(cityForTile(world, world[4][5]).city.owner, 1);
  claimCityReward(world, t, "expand", [], 0);
  assert.equal(t.city.expansions, 2);
  assert(!cityRewardOptions(t.city).some((o) => o.key === "expand"));
  assert.throws(() => claimCityReward(world, t, "expand", [], 0));
  assert.deepEqual(t.city.pendingRewards, [4]);
});
test("walls are chosen once and grant defence only to friendly units on the city", () => {
  const { world, t } = fixture();
  t.city.pendingRewards = [2, 3];
  claimCityReward(world, t, "walls", [], 0);
  assert(!cityRewardOptions(t.city).some((o) => o.key === "walls"));
  const defender = { x: t.x, y: t.y, team: 0 };
  assert(hasWallDefence(world, defender));
  assert.equal(battleDamage(6, 10, 10, world, defender), 4);
  assert.equal(battleDamage(6, 10, 10, world, { ...defender, team: 1 }), 6);
  assert.equal(battleDamage(6, 10, 10, world, { ...defender, x: 2 }), 6);
  assert.equal(battleDamage(0, 10, 10, world, defender), 0);
  assert.throws(() => claimCityReward(world, t, "walls", [], 0));
});
test("star reward is claimed once and level five unlocks a strong reward-only unit", () => {
  const { world, t } = fixture();
  t.city.pendingRewards = [4, 5];
  assert(!cityRewardOptions(t.city).some((o) => o.key === "giant"));
  assert.equal(claimCityReward(world, t, "stars", [], 0).gold, 5);
  assert(cityRewardOptions(t.city).some((o) => o.key === "giant"));
  const reward = claimCityReward(world, t, "giant", [], 0);
  assert.equal(reward.unit.type, "giant");
  assert.equal(reward.unit.hp, 30);
  assert.equal(reward.unit.acted, true);
  assert(!canRecruit({ ...t.city, level: 5 }, "giant", new Set(), 100));
  assert.throws(() => claimCityReward(world, t, "stars", [], 0));
});
test("a blocked giant reward preserves the choice and cannot displace a unit", () => {
  const { world, t } = fixture();
  t.city.pendingRewards = [5];
  const units = world
    .flat()
    .filter((p) => cityForTile(world, p) === t)
    .map((p) => ({ x: p.x, y: p.y, team: 0 }));
  assert.equal(giantSpawnTile(world, t, units), null);
  assert.throws(() => claimCityReward(world, t, "giant", units, 0), /빈 육지/);
  assert.deepEqual(t.city.pendingRewards, [5]);
});
test("new economy starts at three, infantry costs three and other prices scale from it", () => {
  assert.equal(UNIT_TYPES.warrior.cost, 3);
  assert.equal(UNIT_TYPES.archer.cost, 3);
  assert.equal(UNIT_TYPES.rider.cost, 3);
  assert.equal(UNIT_TYPES.guard.cost, 3);
  assert.equal(UNIT_TYPES.assassin.cost, 4);
  assert.equal(UNIT_TYPES.catapult.cost, 5);
  assert.equal(UNIT_TYPES.knight.cost, 6);
  assert.equal(cityIncome({ level: 1 }, new Set()), 1);
  assert.equal(cityIncome({ level: 2 }, new Set()), 2);
});
test("multiplayer rejects harvest outside owned borders and validates city reward ownership", () => {
  const g = createMatch(
    [
      { userId: 1, nickname: "나", nation: "rome" },
      { userId: 2, nickname: "상대", nation: "goguryeo" },
    ],
    0,
    1000,
  );
  for (const p of g.world.flat()) {
    p.type = "grass";
    p.city = null;
    delete p.territory;
  }
  g.world[4][3].city = {
    owner: 0,
    level: 1,
    population: 1,
    experience: 0,
    pendingRewards: [5],
  };
  g.world[4][9].city = { owner: 1, level: 1, population: 1, experience: 0 };
  assignTerritories(g.world);
  g.units = [
    { id: 1, team: 0, x: 1, y: 4, hp: 10, type: "warrior", acted: false },
  ];
  g.world[4][1].resource = "fruit";
  g.players[0].gold = 50;
  assert.throws(
    () => applyCommand(g, 0, { type: "develop", x: 1, y: 4 }),
    /영토/,
  );
  assert.throws(
    () =>
      applyCommand(g, 0, { type: "cityReward", x: 9, y: 4, choice: "stars" }),
    /내 도시/,
  );
  applyCommand(g, 0, { type: "cityReward", x: 3, y: 4, choice: "giant" });
  const giant = g.units.find((u) => u.type === "giant");
  assert.equal(giant.bornTurn, 1);
  assert(giant.id);
  assert.throws(
    () => applyCommand(g, 0, { type: "act", unitId: giant.id, x: 3, y: 3 }),
    /행동을 마친/,
  );
});
test("old saved games migrate partial progress to XP without resetting account stars", () => {
  const g = createMatch(
    [
      { userId: 1, nickname: "나", nation: "rome" },
      { userId: 2, nickname: "상대", nation: "goguryeo" },
    ],
    0,
    1000,
  );
  delete g.rulesVersion;
  const t = g.world.flat().find((p) => p.city?.owner === 0);
  t.city = { owner: 0, name: "이전 도시", level: 3, population: 1 };
  g.players[0].gold = 22;
  assert(upgradeMatch(g));
  assert.equal(t.city.experience, 1);
  assert.equal(t.city.population, 3);
  assert.equal(g.players[0].gold, 22);
  assert.equal(upgradeMatch(g), false);
});
