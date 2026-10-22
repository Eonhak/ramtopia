import { assignTerritories } from "./rules.js";
export const NATIONS = [
  {
    id: "rome",
    name: "로마",
    capital: "로마",
    symbol: "♜",
    color: "#b65c64",
    tech: "gathering",
    trait: "채집 기술로 시작",
    description: "지중해를 잇는 길 위에 새로운 도시를 세우세요.",
  },
  {
    id: "goguryeo",
    name: "고구려",
    capital: "국내성",
    symbol: "☀",
    color: "#467caa",
    tech: "hunting",
    trait: "사냥 기술로 시작",
    description: "산과 숲을 누비며 동북아의 강국을 이끄세요.",
  },
  {
    id: "egypt",
    name: "고대 이집트",
    capital: "멤피스",
    symbol: "◈",
    color: "#c49d51",
    tech: "gathering",
    trait: "채집 기술로 시작",
    description: "비옥한 땅의 자원을 모아 문명을 일으키세요.",
  },
  {
    id: "persia",
    name: "아케메네스 페르시아",
    capital: "페르세폴리스",
    symbol: "✦",
    color: "#9574af",
    tech: "scouting",
    trait: "정찰 기술로 시작",
    description: "넓은 세계를 탐험하고 제국의 길을 개척하세요.",
  },
  {
    id: "han",
    name: "한나라",
    capital: "장안",
    symbol: "龍",
    color: "#b6754c",
    tech: "climbing",
    trait: "등산 기술로 시작",
    description: "산맥 너머의 땅으로 왕국의 경계를 넓히세요.",
  },
  {
    id: "greece",
    name: "고대 그리스",
    capital: "아테네",
    symbol: "Ω",
    color: "#53a7b1",
    tech: "fishing",
    trait: "낚시 기술로 시작",
    description: "바다와 연안을 탐험하며 도시를 번영시키세요.",
  },
  {
    id: "mongol",
    name: "몽골 제국",
    capital: "카라코룸",
    symbol: "♞",
    color: "#6b9174",
    tech: "hunting",
    trait: "사냥 기술로 시작",
    description: "초원과 숲을 넘어 대륙의 도시들을 연결하세요.",
  },
  {
    id: "maurya",
    name: "마우리아 왕조",
    capital: "파탈리푸트라",
    symbol: "☸",
    color: "#b78d59",
    tech: "gathering",
    trait: "채집 기술로 시작",
    description: "풍요로운 자원을 바탕으로 광대한 왕국을 세우세요.",
  },
];
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export function generateWorld(size = 12, random = Math.random, options = {}) {
  const players = options.players || 2;
  const terrain = options.terrain || "balanced";
  const water = terrain === "islands" ? .53 : terrain === "continents" ? .06 : terrain === "forest" ? .10 : .16;
  const mountain = terrain === "forest" ? .1 : .17;
  const woods = terrain === "forest" ? .64 : .33;
  const world = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => {
      const r = random(),
        edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      return {
        x,
        y,
        type:
          r < (edge ? Math.min(.85,water+.35) : water)
            ? "water"
            : r < water + mountain
              ? "mountain"
              : r < water + mountain + woods
                ? "forest"
                : "grass",
        seen: false,
        city: null,
      };
    }),
  );
  const shuffled = world
    .flat()
    .filter((t) => t.x > 0 && t.y > 0 && t.x < size - 1 && t.y < size - 1)
    .map((t) => ({ t, r: random() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.t);
  const home =
    shuffled.find(
      (t) => t.x <= 3 || t.x >= size - 4 || t.y <= 3 || t.y >= size - 4,
    ) || shuffled[0];
  const far = shuffled.filter((t) => cheb(t, home) >= Math.floor(size / 2));
  const enemy = far[0] || shuffled.at(-1),
    cities = [home, enemy];
  // Spread starting capitals first, then fill remaining neutral settlements.
  while (cities.length < players) {
    const next = shuffled.filter(t => !cities.includes(t)).sort((a,b) => Math.min(...cities.map(c=>cheb(c,b))) - Math.min(...cities.map(c=>cheb(c,a))))[0];
    if (!next) throw new Error("도시를 배치할 수 없습니다.");
    cities.push(next);
  }
  for (const t of shuffled)
    if (cities.length < Math.max(5,players*2) && cities.every((c) => cheb(c, t) >= (players > 4 ? 2 : 3))) cities.push(t);
  for (const [i, t] of cities.entries()) {
    t.type = "grass";
    t.city = {
      owner: i === 0 ? 0 : i === 1 ? 1 : -1,
      name:
        i === 0
          ? "수도"
          : i === 1
            ? "적의 수도"
            : ["이끼 마을", "바람 마을", "햇살 마을"][(i - 2)%3] + (i>4 ? " " + (i-1) : ""),
      level: 1,
      population: 1,
      experience: 0,
      expansions: 0,
      walls: false,
      pendingRewards: [],
      isCapital: i < 2,
    };
    const near = world
      .flat()
      .filter((v) => !v.city && cheb(v, t) === 1)
      .map((v) => ({ v, r: random() }))
      .sort((a, b) => a.r - b.r);
    for (const { v } of near.slice(0, 4))
      if (v.type === "water" || v.type === "mountain")
        v.type = random() < 0.5 ? "grass" : "forest";
  }
  // Make the rolled map playable: every city has a walkable route, without fixed corridors.
  for (const goal of cities.slice(1)) {
    let x = home.x,
      y = home.y;
    while (x !== goal.x || y !== goal.y) {
      const previousX = x,
        previousY = y,
        dx = Math.sign(goal.x - x),
        dy = Math.sign(goal.y - y);
      if (dx && dy) {
        if (random() < 0.4) x += dx;
        else if (random() < 0.5) y += dy;
        else {
          x += dx;
          y += dy;
        }
      } else {
        x += dx;
        y += dy;
      }
      const t = world[y][x];
      if (t.type === "water" || t.type === "mountain") t.type = "grass";
      if (x !== previousX && y !== previousY) {
        const side = random() < 0.5 ? world[previousY][x] : world[y][previousX];
        if (side.type === "water" || side.type === "mountain")
          side.type = "grass";
      }
    }
  }
  assignTerritories(world);
  return {
    world,
    home: { x: home.x, y: home.y },
    enemy: { x: enemy.x, y: enemy.y },
  };
}
