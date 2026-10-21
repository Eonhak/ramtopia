export const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
export const gridDistance = (a, b) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const UNIT_TYPES = {
  assassin: {
    name: "암살자",
    icon: "☾",
    cost: 10,
    hp: 10,
    attack: 1,
    counter: 1,
    moves: 1,
    level: 2,
    range: 1,
    tech: "assassination",
  },
  archer: {
    name: "궁수",
    icon: "➶",
    cost: 7,
    hp: 8,
    attack: 5,
    counter: 2,
    moves: 1,
    level: 2,
    range: 2,
    tech: "archery",
  },
  warrior: {
    name: "전사",
    icon: "⚔",
    cost: 5,
    hp: 10,
    attack: 6,
    counter: 3,
    moves: 1,
    level: 1,
    range: 1,
  },
  rider: {
    name: "기병",
    icon: "♞",
    cost: 9,
    hp: 10,
    attack: 7,
    counter: 3,
    moves: 2,
    tech: "riding",
    level: 2,
    range: 1,
  },
  guard: {
    name: "방패병",
    icon: "⛨",
    cost: 8,
    hp: 15,
    attack: 5,
    counter: 4,
    moves: 1,
    tech: "fortification",
    level: 2,
    range: 1,
  },
  catapult: {
    name: "투석기",
    icon: "◉",
    cost: 12,
    hp: 8,
    attack: 9,
    counter: 1,
    moves: 1,
    tech: "siege",
    level: 3,
    range: 3,
  },
  knight: {
    name: "기사",
    icon: "♘",
    cost: 14,
    hp: 15,
    attack: 10,
    counter: 4,
    moves: 2,
    tech: "chivalry",
    level: 3,
    range: 1,
  },
};
export const TECH_BRANCHES = [
  {
    name: "그림자의 길",
    icon: "☾",
    nodes: ["scouting", "stealth", "assassination"],
  },
  {
    name: "함대와 해전",
    icon: "⚓",
    nodes: ["fishing", "navigation", "navalwarfare"],
  },
  {
    name: "활과 화살",
    icon: "➶",
    nodes: ["hunting", "archery", "marksmanship"],
  },
  { name: "사냥과 기동", icon: "♞", nodes: ["hunting", "roads", "riding"] },
  { name: "숲과 공성", icon: "♠", nodes: ["hunting", "lumber", "siege"] },
  { name: "산과 강철", icon: "◆", nodes: ["climbing", "smelting", "chivalry"] },
  {
    name: "농업과 방어",
    icon: "⛨",
    nodes: ["gathering", "farming", "fortification"],
  },
  {
    name: "바다와 의술",
    icon: "≈",
    nodes: ["fishing", "navigation", "medicine"],
  },
  {
    name: "탐험과 교역",
    icon: "⌖",
    nodes: ["scouting", "cartography", "trade"],
  },
];
export const TECHNOLOGIES = {
  stealth: {
    name: "은신",
    icon: "◐",
    cost: 6,
    requires: "scouting",
    description: "암살술의 선행 기술",
  },
  assassination: {
    name: "암살술",
    icon: "☾",
    cost: 10,
    requires: "stealth",
    description: "레벨 2 암살자 · 낮 이동1 공격1 / 밤 이동3 공격10",
  },
  navalwarfare: {
    name: "해전술",
    icon: "⚓",
    cost: 10,
    requires: "navigation",
    description: "수송선·정찰선을 공격력7 전투함으로 개조",
  },
  archery: {
    name: "궁술",
    icon: "➶",
    cost: 7,
    requires: "hunting",
    description: "레벨 2 도시에서 궁수 훈련 · 사거리 2",
  },
  marksmanship: {
    name: "정밀 사격",
    icon: "◎",
    cost: 10,
    requires: "archery",
    description: "모든 아군 궁수 공격력 +2",
  },
  hunting: {
    name: "사냥",
    icon: "♠",
    cost: 5,
    description: "주변 동물 사냥 · 인구 +2",
  },
  roads: {
    name: "도로",
    icon: "↝",
    cost: 6,
    requires: "hunting",
    description: "영토에 도로 건설 · 연결된 도로 이동 비용 절반",
  },
  riding: {
    name: "기병",
    icon: "♞",
    cost: 9,
    requires: "roads",
    description: "레벨 2 도시에서 기병 훈련 · 이동 2",
  },
  lumber: {
    name: "벌목",
    icon: "♣",
    cost: 6,
    requires: "hunting",
    description: "목재 수확 · 인구 +2",
  },
  siege: {
    name: "투석기",
    icon: "◉",
    cost: 10,
    requires: "lumber",
    description: "레벨 3 도시에서 투석기 훈련 · 사거리 3",
  },
  climbing: {
    name: "등산",
    icon: "▲",
    cost: 5,
    description: "산 타일 진입 및 이동 가능",
  },
  smelting: {
    name: "제련",
    icon: "◆",
    cost: 7,
    requires: "climbing",
    description: "광석 채굴 · 인구 +3",
  },
  chivalry: {
    name: "기사",
    icon: "♘",
    cost: 12,
    requires: "smelting",
    description: "레벨 3 도시에서 기사 훈련 · 체력 15, 공격 10",
  },
  gathering: {
    name: "채집",
    icon: "●",
    cost: 4,
    description: "열매 수확 · 인구 +1",
  },
  farming: {
    name: "농업",
    icon: "♧",
    cost: 6,
    requires: "gathering",
    description: "곡물 수확 · 인구 +2",
  },
  fortification: {
    name: "방어술",
    icon: "⛨",
    cost: 8,
    requires: "farming",
    description: "레벨 2 도시에서 방패병 훈련 · 체력 15",
  },
  fishing: {
    name: "낚시",
    icon: "≈",
    cost: 5,
    description: "물고기 수확 · 인구 +2",
  },
  navigation: {
    name: "항해",
    icon: "⚓",
    cost: 8,
    requires: "fishing",
    description: "바다 진입 시 수송선 승선 · 정찰선 개조 가능",
  },
  medicine: {
    name: "의술",
    icon: "✚",
    cost: 9,
    requires: "navigation",
    description: "휴식 회복량 3 → 5",
  },
  scouting: {
    name: "정찰",
    icon: "⌖",
    cost: 5,
    description: "낮의 육상 시야 1 → 2 · 밤에는 1",
  },
  cartography: {
    name: "지도 제작",
    icon: "▧",
    cost: 7,
    requires: "scouting",
    description: "대륙 지형 공개 · 적 유닛은 현재 시야에서만 확인",
  },
  trade: {
    name: "교역",
    icon: "✦",
    cost: 10,
    requires: "cartography",
    description: "내 도시마다 매 턴 수입 +2별",
  },
};
export const RESOURCES = {
  fruit: {
    name: "열매",
    verb: "열매 수확",
    icon: "●",
    cost: 2,
    population: 1,
    tech: "gathering",
  },
  game: {
    name: "야생동물",
    verb: "동물 사냥",
    icon: "♠",
    cost: 3,
    population: 2,
    tech: "hunting",
  },
  wood: {
    name: "목재",
    verb: "목재 수확",
    icon: "♣",
    cost: 4,
    population: 2,
    tech: "lumber",
  },
  grain: {
    name: "곡물",
    verb: "곡물 수확",
    icon: "♧",
    cost: 3,
    population: 2,
    tech: "farming",
  },
  fish: {
    name: "물고기",
    verb: "어장 개발",
    icon: "≈",
    cost: 3,
    population: 2,
    tech: "fishing",
  },
  ore: {
    name: "광석",
    verb: "광산 개발",
    icon: "◆",
    cost: 5,
    population: 3,
    tech: "smelting",
  },
};
export const unitSpec = (u) => UNIT_TYPES[u.type || "warrior"];
export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const growthRequired = (city) => city.level + 1;
export const cityIncome = (city, techs) =>
  city.level + 2 + (techs.has("trade") ? 2 : 0);
export function canRecruit(city, type, techs, gold, occupied = false) {
  const s = UNIT_TYPES[type];
  return (
    !!city &&
    city.owner === 0 &&
    !occupied &&
    city.level >= s.level &&
    gold >= s.cost &&
    (!s.tech || techs.has(s.tech))
  );
}
export function canEnter(t, u, techs = new Set()) {
  return (
    !!t &&
    (t.type !== "water" || techs.has("navigation")) &&
    (t.type !== "mountain" || techs.has("climbing"))
  );
}
export function cityForTile(world, t) {
  return (
    world
      .flat()
      .filter(
        (c) =>
          c.city &&
          Math.max(Math.abs(c.x - t.x), Math.abs(c.y - t.y)) <=
            Math.min(3, c.city.level),
      )
      .sort(
        (a, b) => manhattan(a, t) - manhattan(b, t) || a.y - b.y || a.x - b.x,
      )[0] || null
  );
}
export function addPopulation(city, amount) {
  city.population = (city.population || 0) + amount;
  let levels = 0;
  while (city.population >= growthRequired(city)) {
    city.population -= growthRequired(city);
    city.level++;
    levels++;
  }
  return levels;
}
const aroundTiles = (world, city) =>
  world.flat().filter((t) => !t.city && gridDistance(t, city) === 1);
export function seedResources(world, random = Math.random) {
  const cities = world.flat().filter((t) => t.city),
    shuffle = (a) =>
      a
        .map((v) => ({ v, key: random() }))
        .sort((a, b) => a.key - b.key)
        .map((o) => o.v);
  for (const t of world.flat()) {
    t.resource = null;
    t.developed = false;
    t.road = false;
  }
  for (const city of cities) {
    const around = shuffle(
      world
        .flat()
        .filter(
          (t) =>
            !t.city &&
            Math.max(Math.abs(t.x - city.x), Math.abs(t.y - city.y)) <= 2,
        ),
    );
    for (const t of around) {
      if (t.resource || random() > 0.32) continue;
      t.resource =
        t.type === "forest"
          ? random() < 0.6
            ? "game"
            : "wood"
          : t.type === "mountain"
            ? "ore"
            : t.type === "water"
              ? "fish"
              : random() < 0.6
                ? "fruit"
                : "grain";
    }
    // Every starting territory has a usable hunting/collection route, in random positions.
    const inner = shuffle(
      around.filter(
        (t) =>
          Math.max(Math.abs(t.x - city.x), Math.abs(t.y - city.y)) === 1 &&
          t.type !== "water" &&
          t.type !== "mountain" &&
          cityForTile(world, t) === city,
      ),
    );
    for (const [i, kind] of ["game", "fruit"].entries())
      if (inner[i]) {
        inner[i].resource = kind;
        inner[i].type = kind === "game" || kind === "wood" ? "forest" : "grass";
      }
  }
  for (const city of cities) {
    const inner = shuffle(
      aroundTiles(world, city).filter((t) => cityForTile(world, t) === city),
    );
    const protectedTiles = new Set([
      inner.find((t) => t.resource === "game"),
      inner.find((t) => t.resource === "fruit"),
    ]);
    const candidates = inner.filter((t) => !protectedTiles.has(t));
    for (const t of candidates.slice(0, 2)) t.resource = null;
  }
}
export function movementPath(
  world,
  units,
  u,
  target,
  maxSteps = unitSpec(u).moves,
  techs = new Set(),
  night = false,
) {
  if (
    !canEnter(target, u, techs) ||
    units.some((v) => v !== u && v.x === target.x && v.y === target.y)
  )
    return null;
  const queue = [{ x: u.x, y: u.y, path: [], cost: 0 }],
    best = new Map([[`${u.x},${u.y}`, 0]]);
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const n = queue.shift();
    if (n.x === target.x && n.y === target.y) return n.path;
    if (
      n.path.length &&
      world[n.y][n.x].city &&
      world[n.y][n.x].city.owner !== u.team
    )
      continue;
    for (const [dx, dy] of NEIGHBORS) {
      const t = world[n.y + dy]?.[n.x + dx];
      if (
        !canEnter(t, u, techs) ||
        units.some((v) => v !== u && v.x === t.x && v.y === t.y)
      )
        continue;
      if (dx && dy) {
        const sideA = world[n.y]?.[n.x + dx],
          sideB = world[n.y + dy]?.[n.x];
        const blocked = (v) =>
          !canEnter(v, u, techs) ||
          units.some((o) => o !== u && o.x === v.x && o.y === v.y);
        if (blocked(sideA) && blocked(sideB)) continue;
      }
      const cost =
          n.cost +
          (t.type === "forest" && combatStats(u, { night, techs }).moves > 1
            ? 2
            : techs.has("roads") && world[n.y][n.x].road && t.road
              ? 0.5
              : 1),
        key = `${t.x},${t.y}`;
      if (cost > maxSteps || (best.get(key) ?? Infinity) <= cost) continue;
      best.set(key, cost);
      queue.push({ x: t.x, y: t.y, path: [...n.path, t], cost });
    }
  }
  return null;
}

export const isNight = (turn) => turn % 2 === 0;
export const VESSELS = {
  transport: {
    name: "수송선",
    attack: 0,
    counter: 0,
    range: 0,
    moves: 2,
    sight: 1,
  },
  scout: {
    name: "정찰선",
    attack: 3,
    counter: 2,
    range: 2,
    moves: 3,
    sight: 3,
    cost: 5,
    tech: "navigation",
  },
  warship: {
    name: "전투함",
    attack: 7,
    counter: 4,
    range: 3,
    moves: 2,
    sight: 2,
    cost: 10,
    tech: "navalwarfare",
  },
};
export function combatStats(u, { night = false, techs = new Set() } = {}) {
  const base = unitSpec(u),
    s = { ...base, hp: base.hp + (u.veteran ? 5 : 0) };
  if (u.type === "assassin") {
    s.moves = night ? 3 : 1;
    s.attack = night ? 10 : 1;
  }
  if (u.type === "archer" && techs.has("marksmanship")) s.attack += 2;
  if (u.boat) Object.assign(s, VESSELS[u.boat]);
  return s;
}
export function visionRadius(u, night, techs) {
  const base = u.boat ? VESSELS[u.boat].sight : techs.has("scouting") ? 2 : 1;
  return Math.max(1, base - (night ? 1 : 0));
}
export function refreshVisibility(world, units, night, techs, team = 0) {
  for (const t of world.flat()) t.visible = false;
  const sources = units
    .filter((u) => u.team === team)
    .map((u) => ({ ...u, radius: visionRadius(u, night, techs) }));
  for (const t of world.flat())
    if (t.city?.owner === team) sources.push({ ...t, radius: night ? 0 : 1 });
  for (const t of world.flat()) {
    if (techs.has("cartography")) t.seen = true;
    t.visible = sources.some(
      (s) =>
        gridDistance(t, s) <= s.radius &&
        (!night || manhattan(t, s) <= s.radius),
    );
    if (t.visible) t.seen = true;
  }
}
export function canPromote(u) {
  return (u.kills || 0) >= 3 && !u.veteran;
}
export function promote(u) {
  if (!canPromote(u)) return false;
  u.veteran = true;
  u.hp = unitSpec(u).hp + 5;
  return true;
}
export function changeVessel(u, kind, techs, gold) {
  const target = VESSELS[kind];
  if (
    !u.boat ||
    !target?.cost ||
    u.boat === kind ||
    u.boat === "warship" ||
    (kind === "scout" && u.boat !== "transport") ||
    !techs.has(target.tech) ||
    gold < target.cost
  )
    return false;
  u.boat = kind;
  return target.cost;
}
