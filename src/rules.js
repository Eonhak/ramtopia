export const UNIT_TYPES = {
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
    description: "모든 아군 유닛이 바다 타일 이동 가능",
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
    description: "유닛 탐험 시야 3 → 5",
  },
  cartography: {
    name: "지도 제작",
    icon: "▧",
    cost: 7,
    requires: "scouting",
    description: "미탐험 타일을 포함한 대륙 전체 공개",
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
      if (t.resource || random() > 0.7) continue;
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
    for (const [i, kind] of ["game", "fruit", "wood", "grain"].entries())
      if (inner[i]) {
        inner[i].resource = kind;
        inner[i].type = kind === "game" || kind === "wood" ? "forest" : "grass";
      }
  }
}
export function movementPath(
  world,
  units,
  u,
  target,
  maxSteps = unitSpec(u).moves,
  techs = new Set(),
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
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const t = world[n.y + dy]?.[n.x + dx];
      if (
        !canEnter(t, u, techs) ||
        units.some((v) => v !== u && v.x === t.x && v.y === t.y)
      )
        continue;
      const cost =
          n.cost +
          (techs.has("roads") && world[n.y][n.x].road && t.road ? 0.5 : 1),
        key = `${t.x},${t.y}`;
      if (cost > maxSteps || (best.get(key) ?? Infinity) <= cost) continue;
      best.set(key, cost);
      queue.push({ x: t.x, y: t.y, path: [...n.path, t], cost });
    }
  }
  return null;
}
