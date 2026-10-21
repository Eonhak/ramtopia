export const UNIT_TYPES = {
  warrior: {
    name: "전사",
    icon: "⚔",
    cost: 5,
    hp: 10,
    attack: 6,
    counter: 3,
    moves: 1,
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
  },
};
export const TECHNOLOGIES = {
  hunting: {
    name: "사냥",
    icon: "♠",
    cost: 5,
    description: "숲의 동물을 사냥해 인구 +2",
  },
  fishing: {
    name: "낚시",
    icon: "≈",
    cost: 5,
    description: "연안의 물고기를 잡아 인구 +2",
  },
  mining: {
    name: "채광",
    icon: "◆",
    cost: 7,
    description: "산의 광석을 개발해 인구 +3",
  },
  riding: {
    name: "기마술",
    icon: "♞",
    cost: 8,
    requires: "hunting",
    description: "기병 해금 · 빈 땅을 최대 2칸 이동",
  },
  fortification: {
    name: "방어술",
    icon: "⛨",
    cost: 7,
    description: "방패병 해금 · 체력 15, 반격 피해 4",
  },
  medicine: {
    name: "의술",
    icon: "✚",
    cost: 8,
    description: "아군의 휴식 회복량 3 → 5",
  },
  scouting: {
    name: "정찰술",
    icon: "⌖",
    cost: 6,
    description: "아군 유닛의 탐험 시야 3 → 5",
  },
};
export const RESOURCES = {
  fruit: { name: "열매", verb: "열매 수확", icon: "●", cost: 2, population: 1 },
  game: {
    name: "야생동물",
    verb: "동물 사냥",
    icon: "♠",
    cost: 3,
    population: 2,
    tech: "hunting",
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
    tech: "mining",
  },
};
export const unitSpec = (u) => UNIT_TYPES[u.type || "warrior"];
export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const growthRequired = (city) => city.level + 1;
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
export function movementPath(
  world,
  units,
  u,
  target,
  maxSteps = unitSpec(u).moves,
) {
  if (
    !target ||
    target.type === "water" ||
    units.some((v) => v !== u && v.x === target.x && v.y === target.y)
  )
    return null;
  const queue = [{ x: u.x, y: u.y, path: [] }],
    seen = new Set([`${u.x},${u.y}`]);
  while (queue.length) {
    const n = queue.shift();
    if (n.x === target.x && n.y === target.y) return n.path;
    if (n.path.length >= maxSteps) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const t = world[n.y + dy]?.[n.x + dx],
        key = t && `${t.x},${t.y}`;
      if (
        !t ||
        t.type === "water" ||
        seen.has(key) ||
        units.some((v) => v !== u && v.x === t.x && v.y === t.y)
      )
        continue;
      // A village stops movement on entry; riders cannot pass through and capture for free.
      if (
        n.path.length &&
        world[n.y][n.x].city?.owner !== undefined &&
        world[n.y][n.x].city.owner !== u.team
      )
        continue;
      seen.add(key);
      queue.push({ x: t.x, y: t.y, path: [...n.path, t] });
    }
  }
  return null;
}
