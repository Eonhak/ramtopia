import { NATIONS, generateWorld } from "../src/world.js";
import {
  UNIT_TYPES,
  TECHNOLOGIES,
  RESOURCES,
  combatStats,
  isNight,
  refreshVisibility,
  movementPath,
  gridDistance,
  canEnter,
  canRecruit,
  cityForTile,
  addPopulation,
  cityIncome,
  researchCost,
  seedResources,
  healthDamage,
  promote,
  changeVessel,
} from "../src/rules.js";
export const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const copy = (value) => structuredClone(value);
const nation = (id) => NATIONS.find((n) => n.id === id);
const techs = (g, s) => new Set(g.players[s].researched);
const cities = (g, s) => g.world.flat().filter((t) => t.city?.owner === s);
const stats = (g, u) =>
  combatStats(u, { night: isNight(g.round), techs: techs(g, u.team) });
const tile = (g, x, y) =>
  Number.isInteger(x) && Number.isInteger(y) ? g.world[y]?.[x] : null;
const occupant = (g, t) => g.units.find((u) => u.x === t.x && u.y === t.y);
function log(g, text) {
  g.logs.unshift({ turn: g.round, s: text });
  g.logs = g.logs.slice(0, 8);
}
export function createMatch(members, timeLimit, now = Date.now()) {
  const { world } = generateWorld(16),
    settlements = world.flat().filter((t) => t.city);
  const g = {
    world,
    players: members.map((p, seat) => ({
      ...p,
      seat,
      gold: 10,
      researched: [nation(p.nation).tech],
      eliminated: false,
    })),
    units: [],
    activeSeat: 0,
    round: 1,
    timeLimit,
    deadline: timeLimit ? now + timeLimit * 1000 : null,
    winner: null,
    finished: false,
    logs: [],
    knowledge: members.map(() => Array(256).fill(null)),
    nextUnit: 1,
  };
  settlements.forEach((t, i) => {
    t.city.owner = i < members.length ? i : -1;
    t.city.isCapital = i < members.length;
    t.city.capitalTeam = i < members.length ? i : null;
    if (i < members.length) {
      t.city.name = nation(members[i].nation).capital;
      g.units.push({
        id: g.nextUnit++,
        x: t.x,
        y: t.y,
        team: i,
        type: "warrior",
        hp: 10,
        acted: false,
      });
      g.players[i].capital = { x: t.x, y: t.y };
    }
  });
  seedResources(world);
  remember(g);
  log(g, "왕국들의 대결이 시작되었습니다.");
  return g;
}
function visibility(g, s) {
  const w = copy(g.world);
  for (const t of w.flat()) t.seen = !!g.knowledge[s][t.y * w.length + t.x];
  refreshVisibility(w, g.units, isNight(g.round), techs(g, s), s);
  return w;
}
function remember(g) {
  for (const p of g.players) {
    if (p.eliminated) continue;
    const w = visibility(g, p.seat);
    for (const t of w.flat())
      if (t.visible || (!g.knowledge[p.seat][t.y * w.length + t.x] && t.seen))
        g.knowledge[p.seat][t.y * w.length + t.x] = copy(t);
  }
}
function eliminate(g, s) {
  g.players[s].eliminated = true;
  g.units = g.units.filter((u) => u.team !== s);
  for (const t of cities(g, s)) {
    t.city.owner = -1;
    t.city.isCapital = false;
  }
  log(g, `${nation(g.players[s].nation).name} 왕국이 탈락했습니다.`);
  const alive = g.players.filter((p) => !p.eliminated);
  if (alive.length === 1) {
    g.finished = true;
    g.winner = alive[0].seat;
    g.deadline = null;
  }
}
function capture(g, u) {
  const t = tile(g, u.x, u.y);
  if (!t.city || t.city.owner === u.team) return;
  const old = t.city.owner,
    capital = t.city.isCapital;
  t.city.owner = u.team;
  u.acted = true;
  log(g, `${nation(g.players[u.team].nation).name}: ${t.city.name} 점령`);
  if (capital && old >= 0) {
    eliminate(g, old);
    t.city.isCapital = false;
  }
}
export function advanceTurn(g, now = Date.now(), timeout = false) {
  if (g.finished) return;
  const outgoing = g.players[g.activeSeat];
  if (!outgoing.eliminated) {
    const income = cities(g, g.activeSeat).reduce(
      (n, t) => n + cityIncome(t.city, techs(g, g.activeSeat)),
      0,
    );
    outgoing.gold += income;
    log(
      g,
      `${nation(outgoing.nation).name} 수입 +${income} ✦${timeout ? " · 시간 초과" : ""}`,
    );
  }
  let next = g.activeSeat;
  do {
    next = (next + 1) % g.players.length;
    if (next === 0) g.round++;
  } while (g.players[next].eliminated);
  g.activeSeat = next;
  for (const u of g.units.filter((u) => u.team === next)) {
    u.acted = false;
    delete u.moved;
    delete u.attacked;
    delete u.bornTurn;
    if (tile(g, u.x, u.y).city?.owner === next)
      u.hp = Math.min(stats(g, u).hp, u.hp + 2);
  }
  g.deadline = g.timeLimit ? now + g.timeLimit * 1000 : null;
  remember(g);
}
export function expireTurn(g, now = Date.now()) {
  if (!g.finished && g.deadline !== null && now >= g.deadline) {
    advanceTurn(g, now, true);
    return true;
  }
  return false;
}
export function applyCommand(g, s, c, now = Date.now()) {
  if (g.finished) fail("종료된 게임입니다.", 409);
  if (g.players[s]?.eliminated) fail("이미 탈락한 플레이어입니다.", 403);
  if (c.type === "resign") {
    eliminate(g, s);
    if (!g.finished && g.activeSeat === s) advanceTurn(g, now);
    remember(g);
    return;
  }
  if (g.activeSeat !== s) fail("자신의 차례에만 행동할 수 있습니다.", 403);
  const p = g.players[s],
    ts = techs(g, s),
    own = cities(g, s),
    target = tile(g, c.x, c.y);
  if (c.type === "endTurn") {
    advanceTurn(g, now);
    return;
  }
  if (c.type === "research") {
    const t = Object.hasOwn(TECHNOLOGIES, c.tech) ? TECHNOLOGIES[c.tech] : null;
    if (!t || ts.has(c.tech) || (t.requires && !ts.has(t.requires)))
      fail("연구 조건이 맞지 않습니다.");
    const price = researchCost(
      t,
      own.map((t) => ({ ...t.city, owner: 0 })),
    );
    if (p.gold < price) fail("별이 부족합니다.");
    p.gold -= price;
    p.researched.push(c.tech);
    log(g, `${nation(p.nation).name}: ${t.name} 연구`);
  } else if (c.type === "recruit") {
    if (
      !target ||
      target.city?.owner !== s ||
      !Object.hasOwn(UNIT_TYPES, c.unitType) ||
      !canRecruit(
        { ...target.city, owner: 0 },
        c.unitType,
        ts,
        p.gold,
        !!occupant(g, target),
      )
    )
      fail("이 도시에서 생산할 수 없습니다.");
    const spec = UNIT_TYPES[c.unitType];
    p.gold -= spec.cost;
    g.units.push({
      id: g.nextUnit++,
      x: c.x,
      y: c.y,
      type: c.unitType,
      team: s,
      hp: spec.hp,
      acted: true,
      bornTurn: g.round,
    });
  } else if (c.type === "develop" || c.type === "road") {
    const visible = target && visibility(g, s)[c.y]?.[c.x]?.seen;
    if (!visible || cityForTile(g.world, target)?.city.owner !== s)
      fail("내 도시 영토를 선택하세요.");
    if (c.type === "road") {
      if (
        !ts.has("roads") ||
        target.road ||
        target.type === "water" ||
        p.gold < 2
      )
        fail("도로를 건설할 수 없습니다.");
      p.gold -= 2;
      target.road = true;
    } else {
      const r = RESOURCES[target.resource];
      if (
        !r ||
        target.developed ||
        (r.tech && !ts.has(r.tech)) ||
        p.gold < r.cost
      )
        fail("수확 조건이 맞지 않습니다.");
      p.gold -= r.cost;
      target.developed = true;
      addPopulation(cityForTile(g.world, target).city, r.population);
    }
  } else {
    const u = g.units.find((u) => u.id === c.unitId && u.team === s);
    if (!u) fail("내 유닛을 선택하세요.", 403);
    if (c.type === "promote") {
      if (!promote(u)) fail("3킬 이후 한 번 진급할 수 있습니다.");
    } else if (c.type === "vessel") {
      const price = changeVessel(u, c.kind, ts, p.gold);
      if (!price) fail("함선 개조 조건이 맞지 않습니다.");
      p.gold -= price;
    } else {
      if (u.acted || u.bornTurn === g.round)
        fail("이번 턴 행동을 마친 유닛입니다.");
      if (c.type === "rest") {
        if (u.hp >= stats(g, u).hp) fail("이미 최대 체력입니다.");
        u.hp = Math.min(stats(g, u).hp, u.hp + (ts.has("medicine") ? 5 : 3));
        u.acted = true;
      } else if (c.type === "act") {
        if (!target || !canEnter(target, u, ts))
          fail("진입할 수 없는 타일입니다.");
        const enemy = occupant(g, target);
        if (enemy) {
          if (
            enemy.team === s ||
            u.attacked ||
            !visibility(g, s)[c.y][c.x].visible ||
            stats(g, u).attack <= 0 ||
            gridDistance(u, target) > stats(g, u).range
          )
            fail("공격할 수 없습니다.");
          const damage = healthDamage(stats(g, u).attack, u.hp, stats(g, u).hp),
            counter =
              gridDistance(u, target) <= stats(g, enemy).range
                ? healthDamage(
                    stats(g, enemy).counter,
                    enemy.hp,
                    stats(g, enemy).hp,
                  )
                : 0;
          enemy.hp -= damage;
          u.hp -= counter;
          u.acted = true;
          u.attacked = true;
          if (enemy.hp <= 0) {
            u.kills = (u.kills || 0) + 1;
            g.units = g.units.filter((v) => v !== enemy);
            if (
              u.hp > 0 &&
              stats(g, u).range === 1 &&
              gridDistance(u, target) === 1
            ) {
              u.x = c.x;
              u.y = c.y;
              if (target.type === "water") u.boat = u.boat || "transport";
              else delete u.boat;
            }
          }
          if (u.hp <= 0) g.units = g.units.filter((v) => v !== u);
        } else {
          if (u.moved || u.attacked) fail("이번 턴 이미 이동했습니다.");
          const path = movementPath(
            g.world,
            g.units,
            u,
            target,
            stats(g, u).moves,
            ts,
            isNight(g.round),
          );
          if (!path?.length) fail("이동할 수 없습니다.");
          for (const t of path) {
            if (t.type === "water") u.boat = u.boat || "transport";
            else delete u.boat;
            u.x = t.x;
            u.y = t.y;
          }
          u.moved = true;
        }
        if (g.units.includes(u)) capture(g, u);
      } else fail("알 수 없는 행동입니다.");
    }
  }
  remember(g);
}
export function matchView(g, s) {
  const visible = visibility(g, s),
    mapTeam = (t) => (t === s ? 0 : t === 0 ? s : t);
  const world = visible.map((row) =>
    row.map((t) => {
      const known = t.visible ? t : g.knowledge[s][t.y * g.world.length + t.x];
      if (!known)
        return {
          x: t.x,
          y: t.y,
          type: "grass",
          seen: false,
          visible: false,
          city: null,
        };
      const value = copy(known);
      value.seen = true;
      value.visible = t.visible;
      if (value.city) value.city.owner = mapTeam(value.city.owner);
      return value;
    }),
  );
  return {
    world,
    units: g.units
      .filter((u) => u.team === s || visible[u.y][u.x].visible)
      .map((u) => ({ ...u, team: mapTeam(u.team) })),
    gold: g.players[s].gold,
    researched: g.players[s].researched,
    round: g.round,
    activeSeat: g.activeSeat,
    selfSeat: s,
    deadline: g.deadline,
    timeLimit: g.timeLimit,
    finished: g.finished,
    winner: g.winner,
    eliminated: g.players[s].eliminated,
    homeCapital: g.players[s].capital,
    logs: g.logs,
    players: g.players.map((p) => ({
      seat: p.seat,
      team: mapTeam(p.seat),
      userId: p.userId,
      nickname: p.nickname,
      nation: p.nation,
      eliminated: p.eliminated,
    })),
  };
}
