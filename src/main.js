import "./style.css";
import { lobby } from "./lobby.js";
import { requireAccount } from "./auth.js";
import { NATIONS, generateWorld } from "./world.js";
import { drawCity, drawUnit } from "./visuals.js";
import {
  UNIT_TYPES,
  canClaimVillage,
  waitAtVillage,
  researchCost,
  healthDamage,
  canManageCity,
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
  addCityExperience,
  normalizeCity,
  assignTerritories,
  cityRewardOptions,
  claimCityReward,
  giantSpawnTile,
  hasWallDefence,
  battleDamage,
  retaliationDamage,
  reflectsAttack,
  growthRequired,
  movementPath,
} from "./rules.js";
import { project, renderMap, pickTile } from "./isometric.js";
const $ = (id) => document.getElementById(id),
  canvas = $("map"),
  ctx = canvas.getContext("2d");
for (const id of [
  "recruit",
  "recruitArcher",
  "recruitRider",
  "recruitGuard",
  "recruitAssassin",
  "recruitCatapult",
  "recruitKnight",
  "inspectUnit",
]) {
  const button = $(id);
  if (id === "inspectUnit") { $("productionUnits").append(button); continue; }
  const choice = document.createElement("div"); choice.className = "production-choice";
  const info = document.createElement("button"); info.className = "production-info";
  info.type = "button"; info.textContent = "i";
  info.dataset.unit = {recruit:"warrior",recruitArcher:"archer",recruitRider:"rider",recruitGuard:"guard",recruitAssassin:"assassin",recruitCatapult:"catapult",recruitKnight:"knight"}[id];
  info.setAttribute("aria-label", UNIT_TYPES[info.dataset.unit].name + " 정보");
  info.onclick = () => showUnitInfo(info.dataset.unit);
  choice.append(button,info); $("productionUnits").append(choice);
}

let gameMode = "single",
  multiGame = null,
  multiRoom = null,
  mpSending = false,
  singleTimeLimit = 0,
  turnDeadline = null;
let accountGameId = 0;
let teamNations = null,
  mpAnimation = 0;
$("productionDock").prepend($("cityGrowth"));
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
  gold = 3;
  turn = 1;
  turnDeadline = singleTimeLimit ? Date.now() + singleTimeLimit * 1000 : null;
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
  showTurnBanner("내 턴입니다");
}
function reveal() {
  refreshVisibility(world, units, isNight(turn), researched);
}
function addLog(s) {
  logs.unshift({ turn, s });
  logs = logs.slice(0, 3);
}
let turnBannerTimer;
function showTurnBanner(text) {
  clearTimeout(turnBannerTimer);
  const banner = $("turnBanner");
  banner.textContent = text; banner.hidden = false;
  banner.classList.remove("show"); void banner.offsetWidth; banner.classList.add("show");
  turnBannerTimer = setTimeout(() => { banner.hidden = true; }, 1600);
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
  for (const t of ownCities()) normalizeCity(t.city);
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
  $("logs").hidden = true;
  $("logs").replaceChildren();
  $("endTurn").disabled = busy || animating || over;
  if (multiGame) {
    const active = multiGame.players[multiGame.activeSeat];
    $("turnLabel").replaceChildren(
      document.createTextNode(`라운드 ${turn} · ${active.nickname}의 차례`),
    );
    $("statusTitle").textContent = over
      ? multiGame.winner === multiGame.selfSeat
        ? "승리했습니다!"
        : "왕국이 함락되었습니다."
      : busy
        ? `${active.nickname}의 차례입니다`
        : "당신의 차례입니다";
    $("status").textContent = over
      ? "방 메뉴에서 나가 새 게임을 시작할 수 있습니다."
      : "서버에서 차례와 행동을 동기화하고 있습니다.";
  }
  updateTurnClock();
  $("actionPanel").hidden = !panelOpen;
  $("productionDock").hidden = true;
  const t = at(selected.x, selected.y),
    u = inSight(t) ? unitAt(t.x, t.y) : null,
    city = t.seen ? t.city : null;
  const showUnit = !!u && selectionKind === "unit";
  $("actionPanel").classList.toggle(
    "city-dock",
    !showUnit && canManageCity(city),
  );
  $("actionPanel").classList.toggle("unit-compact", showUnit);
  if (city && !canManageCity(city) && !showUnit) $("actionPanel").hidden = true;
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
      ? `${(u.team === 0 ? selectedNation : teamNations?.[u.team] || enemyNation).name} ${stats(u).name}`
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
      ? `체력 ${u.hp} / ${stats(u).hp} · ${u.bornTurn === turn ? "훈련 중 · 다음 턴 행동" : u.acted ? "이번 턴 행동 완료" : u.moved ? "이동 완료 · 공격 가능" : "이동·공격 가능"}`
      : city
        ? `레벨 ${city.level} · ${city.owner === 0 ? "내 도시" : city.owner > 0 ? "적의 도시" : "중립 마을"} · 인구 ${city.population} · 경험치 ${city.experience}/${growthRequired(city)} · 수입 +${cityIncome(city, researched)} ✦`
        : "왕국의 지도를 넓혀 보세요.";
  if (showUnit)
    $("tileDescription").textContent +=
      ` · ${hasWallDefence(world, u) ? "성곽 방어 +50% · " : ""}${u.kills || 0}킬${u.veteran ? " ★ 정예" : ""} · 이동${stats(u).moves} 공격${healthDamage(stats(u).attack, u.hp, stats(u).hp)}`;
  $("healthBar").hidden = true;
  $("healthBar").firstElementChild.style.width =
    (u ? (u.hp / stats(u).hp) * 100 : 0) + "%";
  $("actionPanel").classList.toggle(
    "enemy",
    showUnit ? u.team > 0 : city?.owner > 0,
  );
  const ownUnit = showUnit && u.team === 0,
    ready = ownUnit && !u.acted && !busy && !animating && !over;
  const ownCity = !showUnit && city?.owner === 0;
  if (ownCity) $("actionPanel").hidden = true;
  $("productionDock").hidden = !panelOpen || !ownCity;
  const buttons = {
    restUnit: ownUnit,
    claimVillage: ownUnit && !!city && city.owner !== 0,
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
    inspectCity: showUnit && ownUnit && canManageCity(city),
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
  $("claimVillage").disabled = busy || animating || over || !canClaimVillage(u, t, turn);
  $("claimVillage").textContent = canClaimVillage(u, t, turn) ? "⚑ 도시 점령" : "⚑ 다음 턴에 점령 가능";
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
    $(id).title =
      `${spec.name} · ${spec.cost}별${missing ? " · " + TECHNOLOGIES[spec.tech].name + " 연구 필요" : ""}${city && city.level < spec.level ? " · 도시 레벨 " + spec.level + " 필요" : ""}${u ? " · 도시의 유닛을 먼저 이동하세요" : ""}`;
    $(id).innerHTML =
      `<canvas class="production-icon" width="70" height="64" aria-hidden="true"></canvas><b>${spec.name}</b><small>${spec.cost} ✦</small>`;
  }
  for (const [id, type] of [
    ["recruit", "warrior"],
    ["recruitRider", "rider"],
    ["recruitGuard", "guard"],
    ["recruitCatapult", "catapult"],
    ["recruitKnight", "knight"],
    ["recruitArcher", "archer"],
    ["recruitAssassin", "assassin"],
  ]) {
    const icon = $(id).querySelector("canvas");
    if (icon) {
      const c = icon.getContext("2d");
      c.translate(35, 49);
      c.scale(2.2, 2.2);
      drawUnit(
        c,
        0,
        0,
        { type, team: 0, hp: UNIT_TYPES[type].hp, acted: true, preview: true },
        selectedNation,
        false,
      );
    }
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
      `<span>${resource.icon}</span><b>${resource.verb}</b><small>${resource.cost} ✦ · 경험치 +${resource.experience}</small>`;
  }
  $("cityGrowth").hidden = !ownCity;
  if (ownCity) {
    $("cityGrowthText").textContent =
      `${city.name} · 경험치 ${city.experience} / ${growthRequired(city)} · 인구 ${city.population} · 레벨 ${city.level}`;
    $("cityGrowthFill").style.width =
      ((city.experience || 0) / growthRequired(city)) * 100 + "%";
  }

  if (!showUnit && !city && resource && t.seen)
    $("tileDescription").textContent =
      `${resource.name} · ${t.developed ? "개발 완료" : `개발 ${resource.cost} ✦ / 경험치 +${resource.experience}`} · ${owner ? owner.city.name + ` · 경험치 ${owner.city.experience || 0}/${growthRequired(owner.city)}` : "소유 도시 없음"}`;
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
                : "영역 안에서 자원을 수확해 경험치를 채우면 도시가 성장합니다."
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
          : "수확하면 도시 경험치가 쌓이고, 레벨업할 때 인구가 늘어납니다.";
  showCityReward();
}
function showCityReward() {
  const t =
    world &&
    !busy &&
    !animating &&
    !over &&
    ownCities().find((t) => t.city.pendingRewards?.length);
  const dialog = $("cityRewardDialog");
  if (!t) {
    dialog.hidden = true;
    return;
  }
  $("cityRewardTitle").textContent =
    `${t.city.name} · 레벨 ${t.city.pendingRewards[0]} 성장 보상`;
  $("cityRewardInfo").textContent =
    `인구 ${t.city.population} · 경험치 ${t.city.experience}/${growthRequired(t.city)} · 영역 확장 ${t.city.expansions}/2 · 성곽 ${t.city.walls ? "건설 완료" : "미건설"}`;
  $("cityRewardChoices").replaceChildren();
  for (const option of cityRewardOptions(t.city)) {
    const button = document.createElement("button");
    button.dataset.reward = option.key;
    const title = document.createElement("b"),
      description = document.createElement("small");
    title.textContent = option.name;
    description.textContent = {stars:"+5 ✦", walls:"방어 +50%", expand:`${t.city.expansions}/2회 사용`, giant:"체력 30"}[option.key];
    button.title = option.description;
    const icon = document.createElement("span");
    icon.className = "reward-icon";
    icon.textContent = {stars:"✦", walls:"♜", expand:"⛶", giant:"♟"}[option.key];
    button.append(icon, title, description);
    button.disabled =
      option.key === "giant" && !giantSpawnTile(world, t, units);
    button.onclick = () => {
      if (multiGame)
        return sendMulti({
          type: "cityReward",
          x: t.x,
          y: t.y,
          choice: option.key,
        });
      try {
        const result = claimCityReward(world, t, option.key, units, 0);
        gold += result.gold;
        if (result.unit) units.push({ ...result.unit, bornTurn: turn });
        reveal();
        update();
        draw();
      } catch (error) {
        toast(error.message);
      }
    };
    $("cityRewardChoices").append(button);
  }
  dialog.hidden = false;
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
    occupant?.team > 0 &&
    stats(selectedUnit).attack > 0 &&
    inSight(t) &&
    !selectedUnit.attacked &&
    distance(t, selectedUnit) <= stats(selectedUnit).range
  )
    return "attack";
  if (
    !occupant &&
    !selectedUnit.moved &&
    !selectedUnit.attacked &&
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
let growthEffects = [], growthFrame = null;
function celebrateCity(t) {
  growthEffects.push({x:t.x, y:t.y, level:t.city.level, start:performance.now()});
  if (growthFrame) return;
  const frame = () => {
    growthEffects = growthEffects.filter(e => performance.now() - e.start < 1400);
    draw();
    growthFrame = growthEffects.length ? requestAnimationFrame(frame) : null;
  };
  growthFrame = requestAnimationFrame(frame);
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
      growthEffects: growthEffects.map(e => ({...e, progress:(performance.now()-e.start)/1400})),
      night: isNight(turn),
      nation: selectedNation,
      enemyNation,
      teamNations,
      panelHeight:
        panelOpen && selectionKind !== "unit" && canvas.clientWidth < 541
          ? $("actionPanel").offsetHeight + 65
          : 0,
    });
}
function selectTile(t, preferredKind) {
  selected = { x: t.x, y: t.y };
  const u = inSight(t) ? unitAt(t.x, t.y) : null;
  selectedUnit = u?.team === 0 ? u : null;
  selectionKind = preferredKind || (u ? "unit" : "city");
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
  addLog(
    win
      ? selectedNation.name + "이 상대 수도를 정복해 승리했습니다."
      : "수도가 함락되었습니다.",
  );
  toast(win ? "✦ 승리! 상대 수도를 정복했습니다." : "수도가 함락되었습니다.");
}
function capture(u, claim = false) {
  let t = at(u.x, u.y);
  if (t.city && t.city.owner !== u.team) {
    if (!claim) { waitAtVillage(u, t, turn); return; }
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
async function attackVisual(u, from, to, current = () => true) {
  const ranged = stats(u).range > 1;
  const visual = {unit:u, position:from};
  animation = visual;
  await tween(ranged ? 850 : 300, p => {
    if (!current()) return;
    visual.pose = {progress:p};
    if (ranged) {
      const flight = (p-.28)/.55;
      visual.projectile = flight >= 0 && flight <= 1 ? {from,to,progress:flight,arrow:u.type === "archer" && !u.boat} : null;
      visual.impact = p > .83 ? {to,progress:(p-.83)/.17,arrow:u.type === "archer" && !u.boat} : null;
    } else {
      const k = Math.sin(Math.PI*p)*.38;
      visual.position = {x:from.x+(to.x-from.x)*k, y:from.y+(to.y-from.y)*k};
    }
  });
}
async function act(u, t) {
  if (multiGame)
    return sendMulti({ type: "act", unitId: u.id, x: t.x, y: t.y });
  if (animating || over || !units.includes(u) || u.acted || u.bornTurn === turn)
    return false;
  const enemy = unitAt(t.x, t.y);
  const techs = u.team === 0 ? researched : new Set(["climbing"]);
  if (
    enemy?.team === u.team ||
    !canEnter(t, u, techs) ||
    (enemy && u.attacked) ||
    (!enemy && (u.moved || u.attacked))
  )
    return false;
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
  if (enemy) {
    u.attacked = true;
    u.acted = true;
  } else {
    u.moved = true;
  }
  actionMode = null;
  update();
  try {
    if (enemy) {
      const from = project(u.x, u.y),
        to = project(t.x, t.y);
      await attackVisual(u, from, to);
      animation = null;
      const damage = battleDamage(
          stats(u).attack,
          u.hp,
          stats(u).hp,
          world,
          enemy,
        ),
        counter = retaliationDamage(world, u, enemy, stats(u), stats(enemy), damage);
      enemy.hp -= damage;
      u.hp -= counter;
      effects = [
        { x: t.x, y: t.y, text: "−" + damage, progress: 0 },
        { x: u.x, y: u.y, text: (reflectsAttack(enemy,stats(u)) ? "반사 −" : "−") + counter, color: reflectsAttack(enemy,stats(u)) ? "#a4f3df" : undefined, progress: 0 },
      ];
      effects = effects.filter((e) => e.text !== "−0" && e.text !== "반사 −0");
      if (counter && reflectsAttack(enemy,stats(u))) effects.push({x:t.x,y:t.y,text:"⛨ 반사",color:"#a4f3df",progress:0});
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
    const actor = selectedUnit,
      session = accountGameId;
    const succeeded = await act(actor, t);
    if (session !== accountGameId) return;
    if (succeeded) {
      const currentActor = multiGame
        ? units.find((u) => u.id === actor.id)
        : actor;
      if (currentActor) selectTile(at(currentActor.x, currentActor.y));
      else cancelSelection();
      return;
    }
  }
  const sameUnit = panelOpen && selectionKind === "unit" && selected.x === t.x && selected.y === t.y && !!unitAt(t.x,t.y);
  selectTile(t, sameUnit ? "tile" : undefined);
  if (t.city && t.city.owner !== 0 && !unitAt(t.x, t.y))
    toast(
      t.city.owner === -1
        ? "중립 마을 · 유닛으로 진입해 점령하세요."
        : "적 도시 · 점령 후에 생산할 수 있습니다.",
    );
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
    setZoom(zoom * Math.exp(-e.deltaY * 0.002));
  },
  { passive: false },
);
function setZoom(value) {
  zoom = Math.min(4, Math.max(0.25, value));
  $("zoomLabel").textContent = Math.round(zoom * 100) + "%";
  draw();
}
$("claimVillage").onclick = () => {
  const u = selectedUnit, t = u && at(u.x, u.y);
  if (busy || animating || over || !canClaimVillage(u, t, turn)) return;
  if (multiGame) return sendMulti({type: "claim", unitId: u.id});
  capture(u, true); reveal(); update(); draw();
};
$("restUnit").onclick = () => {
  if (multiGame) return sendMulti({ type: "rest", unitId: selectedUnit?.id });
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
  if (!canManageCity(at(selected.x, selected.y).city)) return;
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
  if (multiGame)
    return sendMulti({
      type: "recruit",
      unitType: type,
      x: selected.x,
      y: selected.y,
    });
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
  selectTile(t, "unit");
}
$("recruit").onclick = () => recruit("warrior");
$("recruitRider").onclick = () => recruit("rider");
$("recruitGuard").onclick = () => recruit("guard");
$("recruitCatapult").onclick = () => recruit("catapult");
function showUnitInfo(type) {
  const spec = UNIT_TYPES[type];
  $("unitInfoTitle").textContent = spec.name;
  $("unitInfoStats").replaceChildren();
  for (const [name,value] of [["생산 비용",`${spec.cost} ✦`],["최대 체력",spec.hp],["공격",spec.attack],[type === "guard" ? "피해 반사" : "반격",type === "guard" ? "근접 100%" : spec.counter],["이동",spec.moves],["사거리",spec.range],["도시 레벨",`${spec.level} 이상`],["필요 연구",spec.tech ? TECHNOLOGIES[spec.tech].name : "없음"]]) {
    const item = document.createElement("div"), label = document.createElement("dt"), text = document.createElement("dd");
    label.textContent = name; text.textContent = value; item.append(label,text); $("unitInfoStats").append(item);
  }
  $("unitInfoDescription").textContent = {
    warrior:"근접전의 기본 보병입니다. 적을 처치하면 해당 칸으로 전진합니다.",
    archer:"두 칸 떨어진 적에게 화살을 발사합니다. 거리를 유지하며 지원하세요.",
    rider:"빠른 이동으로 탐험과 측면 공격에 유리합니다.",
    guard:"받은 근접 피해의 100%를 공격자에게 반사합니다. 궁수·투석기·함선의 원거리 공격은 바로 옆에서 맞아도 반사하지 못합니다. 승선 중에는 배의 반격 규칙을 따릅니다.",
    assassin:"낮에는 이동 1·공격 1, 밤에는 이동 3·공격 10으로 강화됩니다.",
    catapult:"사거리 3의 공성 병기입니다. 강력한 돌을 던지지만 근접 반격은 약합니다.",
    knight:"갑옷과 방패를 갖춘 중장보병입니다. 이동 2와 공격 10으로 돌격합니다."
  }[type];
  $("unitInfoNote").textContent = type === "guard" ? "반사량은 성곽 방어 적용 후 실제로 잃은 체력만큼입니다. 치명타로 쓰러져도 반사하며 원거리 피해에는 반사하지 않습니다." : "공격·반격 피해는 현재 체력에 따라 달라집니다. 생산한 유닛은 다음 자기 턴부터 행동합니다.";
  const c = $("unitInfoArt").getContext("2d"); c.clearRect(0,0,140,130); c.save(); c.translate(70,108); c.scale(3,3);
  drawUnit(c,0,0,{type,team:0,hp:spec.hp,acted:true,preview:true},selectedNation,false); c.restore();
  $("unitInfoDialog").showModal();
}
$("closeUnitInfo").onclick = () => $("unitInfoDialog").close();
$("recruitKnight").onclick = () => recruit("knight");
$("recruitArcher").onclick = () => recruit("archer");
$("recruitAssassin").onclick = () => recruit("assassin");
$("promoteUnit").onclick = () => {
  if (multiGame)
    return sendMulti({ type: "promote", unitId: selectedUnit?.id });
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
    if (multiGame)
      return sendMulti({ type: "vessel", unitId: selectedUnit?.id, kind });
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
  if (multiGame)
    return sendMulti({ type: "road", x: selected.x, y: selected.y });
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
  if (multiGame) return sendMulti({ type: "develop", x: t.x, y: t.y });
  if (!canDevelop(t)) return;
  const r = RESOURCES[t.resource],
    city = cityForTile(world, t);
  gold -= r.cost;
  t.developed = true;
  const levels = addCityExperience(city.city, r.experience);
  addLog(
    `${r.name} 개발 · ${city.city.name} 경험치 +${r.experience}${levels ? " · 레벨 " + city.city.level + " 성장" : ""}`,
  );
  if (levels) {
    celebrateCity(city);
    toast(
      `${city.city.name} 성장! 다음 턴부터 +${cityIncome(city.city, researched)} ✦`,
    );
    reveal();
  }
  update();
  draw();
}
$("develop").onclick = () => develop(at(selected.x, selected.y));
function renderResearch() {
  $("researchGold").textContent = gold + " ✦";
  $("researchSurcharge").textContent = `도시 성장 할증 +${researchCost(
    { cost: 0 },
    ownCities().map((t) => t.city),
  )} ✦ · 보유 도시의 레벨 상승분마다 +2 ✦`;
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
        price = researchCost(
          tech,
          ownCities().map((t) => t.city),
        ),
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
        learned || locked || gold < price || busy || animating || over;
      button.innerHTML = `<span>${tech.icon}</span><div><b>${tech.name}</b><p>${tech.description}</p><small>${learned ? "연구 완료" : locked ? TECHNOLOGIES[tech.requires].name + " 선행 필요" : price + " ✦"}</small></div>`;
      button.onclick = () => {
        if (multiGame) return sendMulti({ type: "research", tech: key });
        const price = researchCost(
          tech,
          ownCities().map((t) => t.city),
        );
        if (
          researched.has(key) ||
          gold < price ||
          (tech.requires && !researched.has(tech.requires)) ||
          busy ||
          animating ||
          over
        )
          return;
        gold -= price;
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
  if (multiGame) return sendMulti({ type: "endTurn" });
  if (busy || animating || over) return;
  busy = true;
  showTurnBanner(enemyNation.name + "의 턴입니다");
  actionMode = null;
  selectedUnit = null;
  update();
  for (let u of [...units.filter((u) => u.team === 1)]) {
    await new Promise((r) => setTimeout(r, 250));
    if (over) break;
    if (canClaimVillage(u, at(u.x, u.y), turn)) { capture(u, true); continue; }
    let targets = units.filter((v) => v.team === 0);
    let adjacent = targets.find((v) => distance(u, v) === 1);
    let goal = adjacent || homeCapital;
    let step = pathStep(u, goal);
    if (step) await act(u, step);
    if (units.includes(u) && !u.acted && !u.attacked && !over) {
      const contact = units.find(
        (v) => v.team === 0 && distance(u, v) <= stats(u).range,
      );
      if (contact) await act(u, at(contact.x, contact.y));
    }
    draw();
  }
  if (!over) {
    turn++;
    turnDeadline = singleTimeLimit ? Date.now() + singleTimeLimit * 1000 : null;
    const earnings = ownCities().reduce(
      (a, t) => a + cityIncome(t.city, researched),
      0,
    );
    gold += earnings;
    addLog(
      `도시 수입 +${earnings} ✦ · ${ownCities()
        .map((t) => t.city.name + " Lv." + t.city.level)
        .join(", ")}`,
    );
    toast(`도시 수입 +${earnings} ✦`);
    for (let u of units) {
      u.acted = false;
      delete u.moved;
      delete u.attacked;
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
  if (!over) showTurnBanner("내 턴입니다");
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
  $("cancelNation").hidden = false;
  $("nationDialog").showModal();
}
$("startNation").onclick = () => {
  selectedNation = pendingNation;
  init();
  $("nationDialog").close();
};
$("cancelNation").onclick = () => {
  $("nationDialog").close();
  if (!world) lobby.showMode();
};
$("nationDialog").addEventListener("cancel", (e) => {
  if (!world) e.preventDefault();
});
$("newGame").onclick = () => {
  if (animating) return;
  $("menuMain").disabled = busy && !multiGame;
  $("menuRoom").hidden = !multiGame;
  $("gameMenu").showModal();
};
$("menuRoom").onclick = () => { $("gameMenu").close(); lobby.returnToRoom(); };
$("closeGameMenu").onclick = () => $("gameMenu").close();
$("menuMain").onclick = () => {
  if (animating || (busy && !multiGame)) return;
  $("gameMenu").close();
  lobby.showMode();
};
$("help").onclick = () => $("helpDialog").showModal();
$("closeHelp").onclick = $("startPlay").onclick = () => $("helpDialog").close();
$("zoomIn").onclick = () => setZoom(zoom + 0.25);
$("zoomOut").onclick = () => setZoom(zoom - 0.25);
new ResizeObserver(draw).observe(canvas);
$("app").inert = true;
function updateTurnClock() {
  const deadline = multiGame ? multiGame.deadline : turnDeadline;
  const remaining =
    deadline === null
      ? null
      : Math.max(
          0,
          Math.ceil((deadline - (multiGame ? lobby.now() : Date.now())) / 1000),
        );
  $("turnClock").textContent =
    remaining === null
      ? "무한"
      : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  $("turnClock").classList.toggle(
    "urgent",
    remaining !== null && remaining <= 30,
  );
}
setInterval(() => {
  if (!world) return;
  updateTurnClock();
  if (
    !multiGame &&
    !$("modeDialog").open &&
    !$("roomDialog").open &&
    !$("nationDialog").open &&
    turnDeadline &&
    Date.now() >= turnDeadline &&
    !busy &&
    !animating &&
    !over
  )
    $("endTurn").onclick();
}, 500);
async function sendMulti(command) {
  if (!multiGame || busy || mpSending || over) return false;
  mpSending = true;
  busy = true;
  update();
  try {
    await lobby.command(command);
    return true;
  } catch (error) {
    toast(error.message);
    return false;
  } finally {
    mpSending = false;
    if (multiGame) {
      busy =
        multiGame.activeSeat !== multiGame.selfSeat || multiGame.eliminated;
      actionMode = selectedUnit && !busy && !over ? "unit" : null;
      update();
      draw();
      if ($("researchDialog").open) renderResearch();
    }
  }
}
async function loadMulti(game, room) {
  if (gameMode === "multi" && multiRoom?.code === room.code && multiRoom.version >= room.version)
    return;
  const previousSeat = multiGame?.activeSeat, previousRound = multiGame?.round;
  const previous = units || [];
  const previousAttack = multiGame?.attackId;
  const epoch = ++mpAnimation;
  animation = null;
  effects = [];
  animating = false;
  const first = gameMode !== "multi" || multiRoom?.code !== room.code;
  const selectedId = selectedUnit?.id;
  gameMode = "multi";
  multiGame = game;
  multiRoom = room;
  const oldWorld = world;
  world = game.world;
  if (!first && oldWorld) for (const row of world) for (const t of row) {
    const old = oldWorld[t.y]?.[t.x]?.city;
    if (old && t.city?.level > old.level) celebrateCity(t);
  }
  units = game.units;
  gold = game.gold;
  researched = new Set(game.researched);
  turn = game.round;
  logs = [];
  if (!game.finished && (first || previousSeat !== game.activeSeat || previousRound !== game.round)) {
    const active = game.players[game.activeSeat];
    showTurnBanner(game.activeSeat === game.selfSeat ? "내 턴입니다" : active.nickname + "님의 턴입니다");
  }
  selectedNation = NATIONS.find(
    (n) => n.id === game.players[game.selfSeat].nation,
  );
  teamNations = Object.fromEntries(
    game.players.map((p) => [p.team, NATIONS.find((n) => n.id === p.nation)]),
  );
  enemyNation = teamNations[1] || NATIONS[1];
  homeCapital = game.homeCapital;
  enemyCapital = { x: 0, y: 0 };
  busy = mpSending || game.activeSeat !== game.selfSeat || game.eliminated;
  over = game.finished || game.eliminated;
  if (first) {
    selected = { ...homeCapital };
    panelOpen = false;
    zoom = 1;
    pan = { x: 0, y: 0 };
    $("zoomLabel").textContent = "100%";
  }
  selectedUnit = units.find((u) => u.id === selectedId && u.team === 0) || null;
  if (selectedUnit) selected = { x: selectedUnit.x, y: selectedUnit.y };
  actionMode = selectedUnit && !busy && !over ? "unit" : null;
  $("kingdomName").textContent = selectedNation.name;
  update();
  draw();
  if ($("researchDialog").open) renderResearch();
  if (!first) {
    const shot = game.lastAttack;
    if (shot && shot.id !== previousAttack) {
      const shooter = previous.find(u => u.id === shot.unitId) || {...shot.unit, team:shot.team};
      animating = true; update();
      await attackVisual(shooter, project(shot.from.x,shot.from.y), project(shot.to.x,shot.to.y), () => epoch === mpAnimation);
      if (epoch !== mpAnimation) return;
      animation = null;
    }
    const moved = units.find((u) => {
      const old = previous.find((v) => v.id === u.id);
      return old && (old.x !== u.x || old.y !== u.y);
    });
    effects = units.flatMap((u) => {
      const old = previous.find((v) => v.id === u.id);
      return old && old.hp > u.hp && !(shot?.id !== previousAttack && shot?.reflected && u.id === shot.unitId)
        ? [{ x: u.x, y: u.y, text: "−" + (old.hp - u.hp), progress: 0 }]
        : [];
    });
    if (shot?.id !== previousAttack && shot?.reflected && shot.counter) effects.push(
      {x:shot.from.x,y:shot.from.y,text:"반사 −"+shot.counter,color:"#a4f3df",progress:0},
      {x:shot.to.x,y:shot.to.y,text:"⛨ 반사",color:"#a4f3df",progress:0}
    );
    if (moved || effects.length || animating) {
      const old = moved && previous.find((v) => v.id === moved.id),
        from = old && project(old.x, old.y),
        to = moved && project(moved.x, moved.y);
      const visual = moved ? { unit: moved, position: from } : null;
      animation = visual;
      animating = true;
      update();
      await tween(260, (p) => {
        if (epoch !== mpAnimation) return;
        if (visual)
          visual.position = {
            x: from.x + (to.x - from.x) * p,
            y: from.y + (to.y - from.y) * p - Math.sin(Math.PI * p) * 3,
          };
        effects.forEach((e) => (e.progress = p));
      });
      if (epoch === mpAnimation) {
        animation = null;
        effects = [];
        animating = false;
        update();
        draw();
      }
    }
  }
}
requireAccount({
  async onAuthenticated(user) {
    accountGameId++;
    if (!multiGame)
      while (busy || animating)
        await new Promise((resolve) => setTimeout(resolve, 50));
    lobby.stop();
    world = undefined;
    multiGame = null;
    multiRoom = null;
    busy = false;
    selectedUnit = null;
    panelOpen = false;
    $("actionPanel").hidden = true;
    $("productionDock").hidden = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    $("app").inert = false;
    await lobby.open(user, {
      onSingle(limit) {
        gameMode = "single";
        multiGame = null;
        teamNations = null;
        singleTimeLimit = limit;
        openNationChoice();
      },
      onGame: loadMulti,
      onLeave() {
        accountGameId++;
        mpAnimation++;
        animation = null;
        effects = [];
        animating = false;
        multiGame = null;
        multiRoom = null;
        world = undefined;
        busy = false;
        panelOpen = false;
        $("actionPanel").hidden = true;
        $("productionDock").hidden = true;
      },
      onConnection(text) {
        if (world) $("status").textContent = text;
      },
    });
  },
  onSignedOut() {
    accountGameId++;
    lobby.stop();
    if (multiGame) {
      mpAnimation++;
      animation = null;
      effects = [];
      animating = false;
      multiGame = null;
      busy = false;
    }
    $("cityRewardDialog").hidden = true;
    clearTimeout(turnBannerTimer);
    $("turnBanner").hidden = true;
    $("app").inert = true;
    for (const id of [
      "nationDialog",
      "researchDialog",
      "helpDialog",
      "gameMenu",
      "unitInfoDialog",

    ])
      $(id).close();
  },
});
