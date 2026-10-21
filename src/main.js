import "./style.css";
import { NATIONS, generateWorld } from "./world.js";
import { drawCity, drawUnit } from "./visuals.js";
import {
  UNIT_TYPES,
  combatStats,
  isNight,
  refreshVisibility,
  canPromote,
  promote,
  changeVessel,
  VESSELS,
  NEIGHBORS,
  gridDistance,
  TECH_BRANCHES,
  canRecruit,
  canEnter,
  cityIncome,
  seedResources,
  TECHNOLOGIES,
  RESOURCES,
  unitSpec,
  cityForTile,
  addPopulation,
  growthRequired,
  movementPath,
} from "./rules.js";
import { project, renderMap, pickTile } from "./isometric.js";
const $ = (id) => document.getElementById(id),
  canvas = $("map"),
  ctx = canvas.getContext("2d");
const N = 12;
let world,
  units,
  gold,
  turn,
  selected,
  selectedUnit,
  logs,
  busy = false,
  over = false,
  zoom = 1,
  view,
  toastTimer;
let researched = new Set(),
  animating = false,
  animation = null,
  effects = [];
let actionMode = null,
  selectionKind = "unit",
  panelOpen = false;
let pan = { x: 0, y: 0 },
  pointerStart = null,
  dragged = false;
const activePointers = new Map();
let pinchStart = null,
  suppressTap = false;
const directions = NEIGHBORS;
let selectedNation = NATIONS[0],
  pendingNation = NATIONS[0],
  enemyNation = NATIONS[1],
  homeCapital,
  enemyCapital;
const at = (x, y) => world[y]?.[x];
const unitAt = (x, y) => units.find((u) => u.x === x && u.y === y);
const distance = gridDistance;
const stats = (u) =>
  combatStats(u, {
    night: isNight(turn),
    techs: u.team === 0 ? researched : new Set(["climbing"]),
  });
const inSight = (t) => t.visible ?? t.seen;
function init() {
  $("statusTitle").textContent = "당신의 이야기가 시작됩니다";
  $("status").textContent = "전사나 도시를 클릭해 가능한 행동을 확인하세요.";
  $("objectiveText").textContent = "수도 점령 0 / 1";
  activePointers.clear();
  pointerStart = null;
  pinchStart = null;
  researched = new Set([selectedNation.tech]);
  animating = false;
  animation = null;
  effects = [];
  actionMode = null;
  panelOpen = false;
  pan = { x: 0, y: 0 };
  zoom = 1;
  $("zoomLabel").textContent = "100%";
  gold = 10;
  turn = 1;
  const generated = generateWorld(N);
  world = generated.world;
  homeCapital = generated.home;
  enemyCapital = generated.enemy;
  enemyNation = NATIONS.filter((n) => n.id !== selectedNation.id)[
    Math.floor(Math.random() * (NATIONS.length - 1))
  ];
  at(homeCapital.x, homeCapital.y).city.name = selectedNation.capital;
  at(enemyCapital.x, enemyCapital.y).city.name = enemyNation.capital;
  $("kingdomName").textContent = selectedNation.name;
  $("objectiveTitle").textContent = enemyNation.name + "의 수도를 점령하세요";
  units = [
    { ...homeCapital, team: 0, hp: 10, acted: false },
    { ...enemyCapital, team: 1, hp: 10, acted: false },
  ];
  logs = [];
  busy = false;
  over = false;
  selected = { ...homeCapital };
  selectedUnit = null;
  seedResources(world);
  reveal();
  addLog(
    selectedNation.name +
      "의 깃발이 올랐습니다. " +
      TECHNOLOGIES[selectedNation.tech].name +
      " 기술 보유",
  );
  update();
  draw();
}
function reveal() {
  refreshVisibility(world, units, isNight(turn), researched);
}
function addLog(s) {
  logs.unshift({ turn, s });
  logs = logs.slice(0, 3);
}
function toast(s) {
  $("toast").textContent = s;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}
function ownCities() {
  return world.flat().filter((t) => t.city?.owner === 0);
}
function update() {
  document.body.classList.toggle("night", isNight(turn));
  $("phaseIcon").textContent = isNight(turn) ? "☾" : "☀";
  $("phaseBadge").textContent = isNight(turn)
    ? "밤 · 시야 축소"
    : "낮 · 탐험 시간";
  const cities = ownCities();
  $("gold").textContent = gold;
  $("cities").textContent = cities.length;
  $("army").textContent = units.filter((u) => u.team === 0).length;
  $("land").textContent = world
    .flat()
    .filter((t) => t.seen && t.type !== "water").length;
  $("income").textContent =
    "+" + cities.reduce((a, t) => a + cityIncome(t.city, researched), 0);
  $("turnLabel").innerHTML =
    `턴 ${String(turn).padStart(2, "0")} <span>${over ? "게임 종료" : animating ? "행동 중" : busy ? enemyNation.name + "의 차례" : "당신의 차례"}</span>`;
  $("logs").innerHTML = logs
    .map(
      (l) =>
        `<div class="log"><span>턴 ${String(l.turn).padStart(2, "0")}</span>${l.s}</div>`,
    )
    .join("");
  $("endTurn").disabled = busy || animating || over;
  $("progress").style.width =
    (over &&
    ownCities().some((t) => t.x === enemyCapital.x && t.y === enemyCapital.y)
      ? 100
      : Math.min(85, cities.length * 15)) + "%";
  $("actionPanel").hidden = !panelOpen;
  const t = at(selected.x, selected.y),
    u = inSight(t) ? unitAt(t.x, t.y) : null,
    city = t.seen ? t.city : null;
  const showUnit = !!u && (selectionKind === "unit" || !city);
  $("actionPanel").classList.toggle("unit-compact", showUnit);
  const types = {
    grass: "초원",
    water: "바다",
    forest: "숲",
    mountain: "산맥",
  };
  $("terrainTag").textContent = t.seen
    ? `${types[t.type]} · ${t.x + 1}, ${t.y + 1}`
    : "미탐험";
  $("tileTitle").textContent = !t.seen
    ? "안개 너머의 땅"
    : showUnit
      ? `${u.team === 0 ? selectedNation.name : enemyNation.name} ${stats(u).name}`
      : city
        ? city.name
        : types[t.type];
  $("tileIcon").textContent = !t.seen
    ? "☁"
    : showUnit
      ? "♟"
      : city
        ? "♜"
        : t.type === "forest"
          ? "♠"
          : t.type === "mountain"
            ? "▲"
            : t.type === "water"
              ? "≈"
              : "✿";
  $("tileDescription").textContent = !t.seen
    ? "전사를 보내 새로운 땅을 발견하세요."
    : showUnit
      ? `체력 ${u.hp} / ${stats(u).hp} · ${u.bornTurn === turn ? "훈련 중 · 다음 턴 행동" : u.acted ? "이번 턴 행동 완료" : "행동 가능"}`
      : city
        ? `레벨 ${city.level} · ${city.owner === 0 ? "내 도시" : city.owner === 1 ? "적의 도시" : "중립 마을"} · 인구 ${city.population || 0}/${growthRequired(city)} · 수입 +${cityIncome(city, researched)} ✦`
        : "왕국의 지도를 넓혀 보세요.";
  if (showUnit)
    $("tileDescription").textContent +=
      ` · ${u.kills || 0}킬${u.veteran ? " ★ 정예" : ""} · 이동${stats(u).moves} 공격${stats(u).attack}`;
  $("healthBar").hidden = !showUnit;
  $("healthBar").firstElementChild.style.width =
    (u ? (u.hp / stats(u).hp) * 100 : 0) + "%";
  $("actionPanel").classList.toggle(
    "enemy",
    showUnit ? u.team === 1 : city?.owner === 1,
  );
  const ownUnit = showUnit && u.team === 0,
    ready = ownUnit && !u.acted && !busy && !animating && !over;
  const ownCity = !showUnit && city?.owner === 0;
  const buttons = {
    restUnit: ownUnit,
    recruit: ownCity,
    develop: !showUnit && t.seen && !!t.resource && !t.developed,
    recruitRider: ownCity,
    recruitGuard: ownCity,
    recruitCatapult: ownCity,
    recruitKnight: ownCity,
    recruitArcher: ownCity,
    recruitAssassin: ownCity,
    promoteUnit: ownUnit && canPromote(u),
    upgradeScout: ownUnit && u.boat === "transport",
    upgradeWarship: ownUnit && !!u.boat && u.boat !== "warship",
    buildRoad:
      !showUnit &&
      t.seen &&
      researched.has("roads") &&
      !t.road &&
      t.type !== "water" &&
      cityForTile(world, t)?.city.owner === 0,
    inspectCity: showUnit && !!city,
    inspectUnit: !showUnit && !!u,
  };
  for (const [id, visible] of Object.entries(buttons)) $(id).hidden = !visible;
  $("promoteUnit").disabled =
    !ownUnit || busy || animating || over || !canPromote(u);
  for (const [id, kind] of [
    ["upgradeScout", "scout"],
    ["upgradeWarship", "warship"],
  ])
    $(id).disabled =
      !ownUnit ||
      busy ||
      animating ||
      over ||
      !u?.boat ||
      !researched.has(VESSELS[kind].tech) ||
      gold < VESSELS[kind].cost;
  $("restUnit").disabled = !ready || u.hp >= stats(u).hp;
  for (const [id, type] of [
    ["recruit", "warrior"],
    ["recruitRider", "rider"],
    ["recruitGuard", "guard"],
    ["recruitCatapult", "catapult"],
    ["recruitKnight", "knight"],
    ["recruitArcher", "archer"],
    ["recruitAssassin", "assassin"],
  ]) {
    const spec = UNIT_TYPES[type],
      missing = spec.tech && !researched.has(spec.tech);
    $(id).disabled =
      busy ||
      animating ||
      over ||
      !canRecruit(city, type, researched, gold, !!u);
    $(id).innerHTML =
      `<span>${spec.icon}</span><b>${spec.name} 훈련</b><small>${missing ? TECHNOLOGIES[spec.tech].name + " 연구 필요" : city && city.level < spec.level ? "도시 레벨 " + spec.level + " 필요" : spec.cost + " ✦ · 레벨 " + spec.level}</small>`;
  }
  $("buildRoad").disabled =
    busy ||
    animating ||
    over ||
    gold < 2 ||
    !researched.has("roads") ||
    t.road ||
    cityForTile(world, t)?.city.owner !== 0;
  const resource = t.resource && RESOURCES[t.resource],
    owner = cityForTile(world, t);
  $("develop").disabled =
    busy ||
    animating ||
    over ||
    !resource ||
    t.developed ||
    owner?.city.owner !== 0 ||
    gold < resource.cost ||
    (!!resource.tech && !researched.has(resource.tech));
  if (resource) {
    $("develop").innerHTML =
      `<span>${resource.icon}</span><b>${resource.verb}</b><small>${resource.cost} ✦ · 인구 +${resource.population}</small>`;
  }
  $("cityGrowth").hidden = !ownCity;
  if (ownCity) {
    $("cityGrowthText").textContent =
      `인구 ${city.population || 0} / ${growthRequired(city)} · 다음 레벨 수입 +${cityIncome(city, researched) + 1} ✦`;
    $("cityGrowthFill").style.width =
      ((city.population || 0) / growthRequired(city)) * 100 + "%";
  }
  $("resourceOptions").hidden = !ownCity;
  if (ownCity) renderCityResources(t);
  if (!showUnit && !city && resource && t.seen)
    $("tileDescription").textContent =
      `${resource.name} · ${t.developed ? "개발 완료" : `개발 ${resource.cost} ✦ / 인구 +${resource.population}`} · ${owner ? owner.city.name + " 영토" : "소유 도시 없음"}`;
  $("actionHint").textContent = over
    ? "게임이 끝났습니다. 새 왕국을 시작해 보세요."
    : busy
      ? enemyNation.name + "이 행동하고 있습니다."
      : actionMode === "move"
        ? "빛나는 인접 타일을 클릭하면 이동합니다."
        : actionMode === "attack"
          ? "붉게 빛나는 적을 클릭하면 공격합니다."
          : ownUnit
            ? u.acted
              ? "턴을 마치면 다시 행동할 수 있습니다."
              : "흰 테두리는 이동, 붉은 타일은 공격입니다."
            : ownCity
              ? u
                ? "훈련한 유닛은 다음 턴부터 행동합니다. 주변 자원을 개발해 도시를 성장시키세요."
                : "주변 자원을 개발해 인구를 채우면 도시 레벨과 매 턴 수입이 증가합니다."
              : city
                ? "전사로 이 도시에 진입하면 점령할 수 있습니다."
                : !t.seen
                  ? "탐험하지 않은 땅의 정보는 아직 보이지 않습니다."
                  : t.type === "water"
                    ? "전사는 바다를 건널 수 없습니다."
                    : t.type === "forest"
                      ? "숲 진입 비용 +1 · 이동력 1 유닛은 페널티 없음"
                      : t.type === "mountain" && !researched.has("climbing")
                        ? "등산 연구 후 진입할 수 있습니다."
                        : "전사를 이동시켜 이 땅을 탐험하세요.";
  if (!showUnit && !city && resource && t.seen)
    $("actionHint").textContent =
      resource.tech && !researched.has(resource.tech)
        ? `${TECHNOLOGIES[resource.tech].name} 연구가 필요합니다.`
        : owner?.city.owner !== 0
          ? "내 도시 영토 안의 자원만 개발할 수 있습니다."
          : "개발하면 소속 도시의 인구가 증가합니다.";
}
function available(t) {
  if (
    !selectedUnit ||
    selectedUnit.acted ||
    selectedUnit.bornTurn === turn ||
    busy ||
    animating ||
    over ||
    actionMode !== "unit" ||
    selectionKind !== "unit" ||
    !canEnter(t, selectedUnit, researched)
  )
    return null;
  const occupant = unitAt(t.x, t.y);
  if (
    occupant?.team === 1 &&
    inSight(t) &&
    distance(t, selectedUnit) <= stats(selectedUnit).range
  )
    return "attack";
  if (
    !occupant &&
    movementPath(
      world,
      units,
      selectedUnit,
      t,
      stats(selectedUnit).moves,
      researched,
      isNight(turn),
    )?.length
  )
    return "move";
  return null;
}
function draw() {
  if (world)
    view = renderMap(canvas, {
      world,
      units,
      selected: panelOpen ? selected : null,
      zoom,
      pan,
      available,
      animation,
      effects,
      night: isNight(turn),
      nation: selectedNation,
      enemyNation,
      panelHeight:
        panelOpen && selectionKind !== "unit" && canvas.clientWidth < 541
          ? $("actionPanel").offsetHeight + 65
          : 0,
    });
}
function selectTile(t) {
  selected = { x: t.x, y: t.y };
  const u = inSight(t) ? unitAt(t.x, t.y) : null;
  selectedUnit = u?.team === 0 ? u : null;
  selectionKind = u ? "unit" : "city";
  actionMode = selectedUnit && !selectedUnit.acted ? "unit" : null;
  panelOpen = true;
  update();
  draw();
}
function cancelSelection() {
  if (!world) return;
  actionMode = null;
  panelOpen = false;
  selectedUnit = null;
  update();
  draw();
}
function finish(win) {
  over = true;
  $("statusTitle").textContent = win
    ? selectedNation.name + "의 새로운 왕이 탄생했습니다!"
    : selectedNation.name + "의 깃발이 내려갔습니다";
  $("status").textContent = win
    ? enemyNation.name + "의 수도를 정복했습니다. 당신의 왕국에 영광을!"
    : "새로운 왕국에서 다시 도전해 보세요.";
  $("objectiveText").textContent = win ? "수도 점령 1 / 1" : "왕국 함락";
  addLog(
    win
      ? selectedNation.name + "이 상대 수도를 정복해 승리했습니다."
      : "수도가 함락되었습니다.",
  );
  toast(win ? "✦ 승리! 에버그린은 당신의 것입니다." : "수도가 함락되었습니다.");
}
function capture(u) {
  let t = at(u.x, u.y);
  if (t.city && t.city.owner !== u.team) {
    t.city.owner = u.team;
    u.acted = true;
    addLog(
      `${u.team === 0 ? selectedNation.name : enemyNation.name}이 ${t.city.name} 점령`,
    );
    if (u.team === 0 && t.x === enemyCapital.x && t.y === enemyCapital.y)
      finish(true);
    if (u.team === 1 && t.x === homeCapital.x && t.y === homeCapital.y)
      finish(false);
  }
}
function tween(duration, step) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now) {
      const p = reduced ? 1 : Math.min(1, (now - start) / duration);
      step(p);
      draw();
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
async function walk(u, path) {
  for (const t of path) {
    if (t.type === "water") u.boat = u.boat || "transport";
    const from = project(u.x, u.y),
      to = project(t.x, t.y);
    animation = { unit: u, position: from };
    await tween(220, (p) => {
      const k = (1 - Math.cos(Math.PI * p)) / 2;
      animation.position = {
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k - Math.sin(Math.PI * p) * 4,
      };
    });
    u.x = t.x;
    u.y = t.y;
    if (t.type !== "water") delete u.boat;
    animation = null;
  }
}
async function act(u, t) {
  if (animating || over || !units.includes(u) || u.acted || u.bornTurn === turn)
    return false;
  const enemy = unitAt(t.x, t.y);
  const techs = u.team === 0 ? researched : new Set(["climbing"]);
  if (enemy?.team === u.team || !canEnter(t, u, techs)) return false;
  const path = enemy
    ? null
    : movementPath(world, units, u, t, stats(u).moves, techs, isNight(turn));
  if (
    enemy
      ? stats(u).attack === 0 ||
        distance(u, t) > stats(u).range ||
        (u.team === 0 && !inSight(t))
      : !path?.length
  )
    return false;
  animating = true;
  u.acted = true;
  actionMode = null;
  update();
  try {
    if (enemy) {
      const from = project(u.x, u.y),
        to = project(t.x, t.y);
      animation = { unit: u, position: from };
      await tween(300, (p) => {
        if (stats(u).range > 1) {
          animation.projectile = {
            from,
            to,
            progress: p,
            arrow: u.type === "archer",
          };
        } else {
          const k = Math.sin(Math.PI * p) * 0.38;
          animation.position = {
            x: from.x + (to.x - from.x) * k,
            y: from.y + (to.y - from.y) * k,
          };
        }
      });
      animation = null;
      const damage = stats(u).attack,
        counter =
          distance(u, t) <= stats(enemy).range ? stats(enemy).counter : 0;
      enemy.hp -= damage;
      u.hp -= counter;
      effects = [
        { x: t.x, y: t.y, text: "−" + damage, progress: 0 },
        { x: u.x, y: u.y, text: "−" + counter, progress: 0 },
      ];
      await tween(300, (p) => effects.forEach((e) => (e.progress = p)));
      effects = [];
      const killed = enemy.hp <= 0;
      if (killed) {
        u.kills = (u.kills || 0) + 1;
        units = units.filter((v) => v !== enemy);
      }
      if (u.hp <= 0) units = units.filter((v) => v !== u);
      if (
        killed &&
        units.includes(u) &&
        stats(u).range === 1 &&
        distance(u, t) === 1
      )
        await walk(u, [t]);
      addLog(`${stats(u).name} 교전${killed ? " · 적 처치" : ""}`);
    } else await walk(u, path);
    if (units.includes(u)) capture(u);
    reveal();
    return true;
  } finally {
    animation = null;
    effects = [];
    animating = false;
    update();
    draw();
  }
}
function pointerPair() {
  const [a, b] = [...activePointers.values()];
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}
function beginPinch() {
  const pair = pointerPair(),
    rect = canvas.getBoundingClientRect();
  pinchStart = {
    distance: Math.max(1, pair.distance),
    zoom,
    worldX: (pair.x - rect.left - view.ox) / view.scale,
    worldY: (pair.y - rect.top - view.oy) / view.scale,
  };
  suppressTap = true;
  dragged = true;
  pointerStart = null;
}
function rebaseDrag() {
  const p = activePointers.values().next().value;
  pointerStart = p ? { x: p.x, y: p.y, panX: pan.x, panY: pan.y } : null;
}
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  if (activePointers.size === 1) {
    suppressTap = false;
    dragged = false;
    rebaseDrag();
  } else beginPinch();
});
canvas.addEventListener("pointermove", (e) => {
  if (!activePointers.has(e.pointerId)) return;
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size >= 2) {
    if (!pinchStart) beginPinch();
    const pair = pointerPair(),
      rect = canvas.getBoundingClientRect();
    setZoom((pinchStart.zoom * pair.distance) / pinchStart.distance);
    pan.x += pair.x - rect.left - (view.ox + pinchStart.worldX * view.scale);
    pan.y += pair.y - rect.top - (view.oy + pinchStart.worldY * view.scale);
    draw();
    return;
  }
  if (!pointerStart) return;
  const dx = e.clientX - pointerStart.x,
    dy = e.clientY - pointerStart.y;
  if (Math.hypot(dx, dy) > 5) dragged = true;
  if (dragged) {
    pan = { x: pointerStart.panX + dx, y: pointerStart.panY + dy };
    draw();
  }
});
canvas.addEventListener("pointerup", async (e) => {
  if (!activePointers.has(e.pointerId)) return;
  const wasGesture = suppressTap || dragged;
  activePointers.delete(e.pointerId);
  pinchStart = null;
  if (activePointers.size) {
    suppressTap = true;
    dragged = true;
    if (activePointers.size >= 2) beginPinch();
    else rebaseDrag();
    return;
  }
  pointerStart = null;
  if (wasGesture || busy || animating || over) return;
  const rect = canvas.getBoundingClientRect(),
    t = pickTile(view, e.clientX - rect.left, e.clientY - rect.top);
  if (!t) {
    cancelSelection();
    return;
  }
  if (available(t)) {
    const actor = selectedUnit;
    if (await act(actor, t)) {
      selectTile(at(actor.x, actor.y));
      return;
    }
  }
  selectTile(t);
});
function cancelPointer(e) {
  if (!activePointers.delete(e.pointerId)) return;
  pinchStart = null;
  suppressTap = true;
  dragged = true;
  rebaseDrag();
  if (activePointers.size >= 2) beginPinch();
}
canvas.addEventListener("pointercancel", cancelPointer);
canvas.addEventListener("lostpointercapture", cancelPointer);
window.addEventListener("blur", () => {
  activePointers.clear();
  pinchStart = null;
  pointerStart = null;
  suppressTap = true;
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    setZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1));
  },
  { passive: false },
);
function setZoom(value) {
  zoom = Math.min(2.3, Math.max(0.65, value));
  $("zoomLabel").textContent = Math.round(zoom * 100) + "%";
  draw();
}
$("restUnit").onclick = () => {
  if ($("restUnit").disabled || !selectedUnit) return;
  selectedUnit.hp = Math.min(
    stats(selectedUnit).hp,
    selectedUnit.hp + (researched.has("medicine") ? 5 : 3),
  );
  selectedUnit.acted = true;
  actionMode = null;
  addLog("전사가 휴식하며 체력을 회복했습니다.");
  update();
  draw();
};
$("inspectCity").onclick = () => {
  selectionKind = "city";
  actionMode = null;
  update();
  draw();
};
$("inspectUnit").onclick = () => {
  selectionKind = "unit";
  actionMode = selectedUnit && !selectedUnit.acted ? "unit" : null;
  update();
  draw();
};
$("closePanel").onclick = () => {
  actionMode = null;
  panelOpen = false;
  selectedUnit = null;
  update();
  draw();
};
window.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    world &&
    !$("helpDialog").open &&
    !$("nationDialog").open &&
    !$("researchDialog").open
  )
    cancelSelection();
});
$("resetView").onclick = () => {
  pan = { x: 0, y: 0 };
  setZoom(1);
};
function recruit(type) {
  const t = at(selected.x, selected.y),
    spec = UNIT_TYPES[type];
  if (
    busy ||
    animating ||
    over ||
    !canRecruit(t.city, type, researched, gold, !!unitAt(t.x, t.y))
  )
    return;
  gold -= spec.cost;
  units.push({
    x: t.x,
    y: t.y,
    team: 0,
    type,
    hp: spec.hp,
    acted: true,
    bornTurn: turn,
  });
  addLog(`${spec.name} 훈련 · 다음 턴부터 행동`);
  selectTile(t);
}
$("recruit").onclick = () => recruit("warrior");
$("recruitRider").onclick = () => recruit("rider");
$("recruitGuard").onclick = () => recruit("guard");
$("recruitCatapult").onclick = () => recruit("catapult");
$("recruitKnight").onclick = () => recruit("knight");
$("recruitArcher").onclick = () => recruit("archer");
$("recruitAssassin").onclick = () => recruit("assassin");
$("promoteUnit").onclick = () => {
  if (busy || animating || over || !selectedUnit || !promote(selectedUnit))
    return;
  addLog("3킬 진급 · 최대 체력 +5, 체력 완전 회복");
  update();
  draw();
};
for (const [id, kind] of [
  ["upgradeScout", "scout"],
  ["upgradeWarship", "warship"],
])
  $(id).onclick = () => {
    if (busy || animating || over || !selectedUnit) return;
    const spent = changeVessel(selectedUnit, kind, researched, gold);
    if (!spent) return;
    gold -= spent;
    addLog(VESSELS[kind].name + " 개조 완료");
    reveal();
    update();
    draw();
  };
$("buildRoad").onclick = () => {
  const t = at(selected.x, selected.y);
  if (
    busy ||
    animating ||
    over ||
    gold < 2 ||
    !researched.has("roads") ||
    t.road ||
    t.type === "water" ||
    cityForTile(world, t)?.city.owner !== 0
  )
    return;
  gold -= 2;
  t.road = true;
  addLog("도로 건설 · 연결된 도로의 이동 비용 절반");
  update();
  draw();
};
function canDevelop(t) {
  const r = t?.resource && RESOURCES[t.resource];
  return (
    !!r &&
    t.seen &&
    !t.developed &&
    cityForTile(world, t)?.city.owner === 0 &&
    gold >= r.cost &&
    (!r.tech || researched.has(r.tech)) &&
    !busy &&
    !animating &&
    !over
  );
}
function develop(t) {
  if (!canDevelop(t)) return;
  const r = RESOURCES[t.resource],
    city = cityForTile(world, t);
  gold -= r.cost;
  t.developed = true;
  const levels = addPopulation(city.city, r.population);
  addLog(
    `${r.name} 개발 · ${city.city.name} 인구 +${r.population}${levels ? " · 레벨 " + city.city.level + " 성장" : ""}`,
  );
  if (levels) {
    toast(
      `${city.city.name} 성장! 다음 턴부터 +${cityIncome(city.city, researched)} ✦`,
    );
    reveal();
  }
  update();
  draw();
}
$("develop").onclick = () => develop(at(selected.x, selected.y));
function renderCityResources(city) {
  const tiles = world
    .flat()
    .filter(
      (t) =>
        t.seen && t.resource && !t.developed && cityForTile(world, t) === city,
    );
  $("resourceOptions").replaceChildren();
  for (const t of tiles) {
    const r = RESOURCES[t.resource],
      button = document.createElement("button");
    button.className = "resource-option";
    button.disabled = !canDevelop(t);
    button.innerHTML = `<span>${r.icon} ${r.verb} <small>(${t.x + 1}, ${t.y + 1})</small></span><b>${r.cost} ✦ <small>인구 +${r.population}</small></b>${r.tech && !researched.has(r.tech) ? `<em>${TECHNOLOGIES[r.tech].name} 연구 필요</em>` : ""}`;
    button.onclick = () => develop(t);
    $("resourceOptions").append(button);
  }
  if (!tiles.length)
    $("resourceOptions").textContent = "현재 영토의 자원을 모두 개발했습니다.";
}
function renderResearch() {
  $("researchGold").textContent = gold + " ✦";
  $("techGrid").replaceChildren();
  for (const branch of TECH_BRANCHES) {
    const row = document.createElement("section");
    row.className = "tech-branch";
    const heading = document.createElement("h3");
    heading.textContent = branch.icon + " " + branch.name;
    row.append(heading);
    const nodes = document.createElement("div");
    nodes.className = "tech-chain";
    for (const [index, key] of branch.nodes.entries()) {
      const tech = TECHNOLOGIES[key],
        learned = researched.has(key),
        locked = tech.requires && !researched.has(tech.requires);
      if (index) {
        const arrow = document.createElement("span");
        arrow.className = "tech-arrow";
        arrow.textContent = "→";
        nodes.append(arrow);
      }
      const button = document.createElement("button");
      button.dataset.tech = key;
      button.className = "tech-card" + (learned ? " learned" : "");
      button.disabled =
        learned || locked || gold < tech.cost || busy || animating || over;
      button.innerHTML = `<span>${tech.icon}</span><div><b>${tech.name}</b><p>${tech.description}</p><small>${learned ? "연구 완료" : locked ? TECHNOLOGIES[tech.requires].name + " 선행 필요" : tech.cost + " ✦"}</small></div>`;
      button.onclick = () => {
        if (
          researched.has(key) ||
          gold < tech.cost ||
          (tech.requires && !researched.has(tech.requires)) ||
          busy ||
          animating ||
          over
        )
          return;
        gold -= tech.cost;
        researched.add(key);
        addLog(`${tech.name} 연구 완료`);
        reveal();
        update();
        draw();
        renderResearch();
      };
      nodes.append(button);
    }
    row.append(nodes);
    $("techGrid").append(row);
  }
}
$("research").onclick = () => {
  renderResearch();
  $("researchDialog").showModal();
};
$("closeResearch").onclick = () => $("researchDialog").close();
function pathStep(u, goal) {
  let queue = [{ x: u.x, y: u.y, first: null }],
    seen = new Set([u.x + "," + u.y]);
  while (queue.length) {
    let p = queue.shift();
    if (p.x === goal.x && p.y === goal.y) return p.first;
    for (let [dx, dy] of directions) {
      let x = p.x + dx,
        y = p.y + dy,
        t = at(x, y),
        key = x + "," + y;
      if (
        !canEnter(t, u, u.team === 0 ? researched : new Set(["climbing"])) ||
        seen.has(key)
      )
        continue;
      if (dx && dy) {
        const techs = u.team === 0 ? researched : new Set(["climbing"]);
        const blocked = (v) => !canEnter(v, u, techs) || !!unitAt(v.x, v.y);
        if (blocked(at(p.x + dx, p.y)) && blocked(at(p.x, p.y + dy))) continue;
      }
      let other = unitAt(x, y);
      if (other?.team === u.team) continue;
      seen.add(key);
      queue.push({ x, y, first: p.first || t });
    }
  }
  return null;
}
$("endTurn").onclick = async () => {
  if (busy || animating || over) return;
  busy = true;
  actionMode = null;
  selectedUnit = null;
  update();
  for (let u of [...units.filter((u) => u.team === 1)]) {
    await new Promise((r) => setTimeout(r, 250));
    if (over) break;
    let targets = units.filter((v) => v.team === 0);
    let adjacent = targets.find((v) => distance(u, v) === 1);
    let goal = adjacent || homeCapital;
    let step = pathStep(u, goal);
    if (step) await act(u, step);
    draw();
  }
  if (!over) {
    turn++;
    gold += ownCities().reduce((a, t) => a + cityIncome(t.city, researched), 0);
    for (let u of units) {
      u.acted = false;
      delete u.bornTurn;
      if (at(u.x, u.y).city?.owner === u.team)
        u.hp = Math.min(stats(u).hp, u.hp + 2);
    }
    if (
      turn % 3 === 0 &&
      !unitAt(enemyCapital.x, enemyCapital.y) &&
      at(enemyCapital.x, enemyCapital.y).city.owner === 1
    ) {
      units.push({
        ...enemyCapital,
        team: 1,
        hp: 10,
        acted: true,
        bornTurn: turn,
      });
      addLog(enemyNation.name + " 수도에 지원군이 도착했습니다.");
    }
    addLog("새로운 아침. 도시에서 별을 거두었습니다.");
    $("statusTitle").textContent = `턴 ${turn}, 왕국의 다음 걸음`;
    $("status").textContent =
      "전사를 움직이거나, 도시를 선택해 병력을 훈련하세요.";
  }
  reveal();
  busy = false;
  selectedUnit = unitAt(selected.x, selected.y);
  if (selectedUnit?.team !== 0) selectedUnit = null;
  actionMode =
    panelOpen && selectionKind === "unit" && selectedUnit && !over
      ? "unit"
      : null;
  update();
  draw();
};
function openNationChoice() {
  pendingNation = selectedNation;
  $("nationGrid").replaceChildren();
  for (const nation of NATIONS) {
    const button = document.createElement("button");
    button.className =
      "nation-card" + (nation.id === pendingNation.id ? " selected" : "");
    button.dataset.nation = nation.id;
    button.setAttribute("aria-pressed", String(nation.id === pendingNation.id));
    button.style.setProperty("--nation-color", nation.color);
    button.innerHTML = `<canvas class="nation-preview" width="180" height="100" aria-label="${nation.name}의 도시와 전사"></canvas><b>${nation.name}</b><small>${nation.trait}</small>`;
    button.onclick = () => {
      pendingNation = nation;
      for (const card of $("nationGrid").children) {
        card.classList.toggle("selected", card.dataset.nation === nation.id);
        card.setAttribute(
          "aria-pressed",
          String(card.dataset.nation === nation.id),
        );
      }
      $("nationDescription").textContent = nation.description;
    };
    $("nationGrid").append(button);
    const preview = button.querySelector("canvas"),
      context = preview.getContext("2d");
    context.translate(48, 79);
    context.scale(1.3, 1.3);
    drawCity(context, 0, 0, { owner: 0, level: 1 }, nation);
    drawUnit(
      context,
      40,
      -2,
      { team: 0, hp: 10, type: "warrior", acted: true },
      nation,
      false,
    );
  }
  $("nationDescription").textContent = pendingNation.description;
  $("cancelNation").hidden = !world;
  $("nationDialog").showModal();
}
$("startNation").onclick = () => {
  selectedNation = pendingNation;
  init();
  $("nationDialog").close();
};
$("cancelNation").onclick = () => $("nationDialog").close();
$("nationDialog").addEventListener("cancel", (e) => {
  if (!world) e.preventDefault();
});
$("newGame").onclick = () => {
  if (busy || animating) return;
  if (confirm("새로운 나라와 지도로 시작할까요?")) openNationChoice();
};
$("help").onclick = () => $("helpDialog").showModal();
$("closeHelp").onclick = $("startPlay").onclick = () => $("helpDialog").close();
$("zoomIn").onclick = () => setZoom(zoom + 0.15);
$("zoomOut").onclick = () => setZoom(zoom - 0.15);
new ResizeObserver(draw).observe(canvas);
openNationChoice();
