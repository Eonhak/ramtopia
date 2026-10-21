import "./style.css";
import { renderMap, pickTile } from "./isometric.js";
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
let actionMode = null,
  selectionKind = "unit",
  panelOpen = false;
let pan = { x: 0, y: 0 },
  pointerStart = null,
  dragged = false;
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const at = (x, y) => world[y]?.[x];
const unitAt = (x, y) => units.find((u) => u.x === x && u.y === y);
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function rng(x, y) {
  return (((x * 731 + y * 193 + 17) * 16807) % 997) / 997;
}
function init() {
  $("statusTitle").textContent = "당신의 이야기가 시작됩니다";
  $("status").textContent = "전사나 도시를 클릭해 가능한 행동을 확인하세요.";
  $("objectiveText").textContent = "수도 점령 0 / 1";
  actionMode = null;
  panelOpen = false;
  pan = { x: 0, y: 0 };
  zoom = 1;
  $("zoomLabel").textContent = "100%";
  gold = 10;
  turn = 1;
  units = [
    { x: 3, y: 7, team: 0, hp: 10, acted: false },
    { x: 9, y: 3, team: 1, hp: 10, acted: false },
  ];
  logs = [];
  busy = false;
  over = false;
  selected = { x: 3, y: 7 };
  selectedUnit = null;
  world = Array.from({ length: N }, (_, y) =>
    Array.from({ length: N }, (_, x) => {
      let d = ((x - 5.5) / 5.5) ** 2 + ((y - 5.5) / 5.3) ** 2;
      let water = d > 1.03 || (x === 6 && y < 3) || (x === 0 && y > 7);
      let r = rng(x, y);
      return {
        x,
        y,
        type: water
          ? "water"
          : r < 0.19
            ? "mountain"
            : r < 0.48
              ? "forest"
              : "grass",
        seen: false,
        city: null,
      };
    }),
  );
  for (let [x, y, owner, name] of [
    [3, 7, 0, "숲의 수도"],
    [9, 3, 1, "붉은 수도"],
    [6, 6, -1, "이끼 마을"],
    [4, 3, -1, "바람 마을"],
    [8, 8, -1, "햇살 마을"],
  ])
    Object.assign(at(x, y), { type: "grass", city: { owner, name, level: 1 } });
  for (let [x, y] of [
    [3, 6],
    [4, 7],
    [8, 3],
    [9, 4],
    [7, 6],
    [8, 6],
    [8, 5],
    [8, 4],
  ])
    at(x, y).type = "grass";
  reveal();
  addLog("초록 깃발이 올랐습니다. 모험을 시작하세요.");
  update();
  draw();
}
function reveal() {
  for (let u of units.filter((u) => u.team === 0))
    for (let row of world)
      for (let t of row) if (distance(t, u) <= 3) t.seen = true;
  for (let row of world)
    for (let t of row)
      if (t.city?.owner === 0)
        for (let row2 of world)
          for (let v of row2) if (distance(t, v) <= 3) v.seen = true;
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
  const cities = ownCities();
  $("gold").textContent = gold;
  $("cities").textContent = cities.length;
  $("army").textContent = units.filter((u) => u.team === 0).length;
  $("land").textContent = world
    .flat()
    .filter((t) => t.seen && t.type !== "water").length;
  $("income").textContent =
    "+" + cities.reduce((a, t) => a + t.city.level + 2, 0);
  $("turnLabel").innerHTML =
    `턴 ${String(turn).padStart(2, "0")} <span>${over ? "게임 종료" : busy ? "붉은 왕국의 차례" : "당신의 차례"}</span>`;
  $("logs").innerHTML = logs
    .map(
      (l) =>
        `<div class="log"><span>턴 ${String(l.turn).padStart(2, "0")}</span>${l.s}</div>`,
    )
    .join("");
  $("endTurn").disabled = busy || over;
  $("progress").style.width =
    (over && ownCities().some((t) => t.x === 9 && t.y === 3)
      ? 100
      : Math.min(85, cities.length * 15)) + "%";
  $("actionPanel").hidden = !panelOpen;
  const t = at(selected.x, selected.y),
    u = t.seen ? unitAt(t.x, t.y) : null,
    city = t.seen ? t.city : null;
  const showUnit = !!u && (selectionKind === "unit" || !city);
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
      ? `${u.team === 0 ? "숲의" : "붉은"} 전사`
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
      ? `체력 ${u.hp} / 10 · ${u.acted ? "이번 턴 행동 완료" : "행동 가능"}`
      : city
        ? `레벨 ${city.level} · ${city.owner === 0 ? "내 도시" : city.owner === 1 ? "적의 도시" : "중립 마을"} · 수입 +${city.level + 2} ✦`
        : "왕국의 지도를 넓혀 보세요.";
  $("healthBar").hidden = !showUnit;
  $("healthBar").firstElementChild.style.width = (u ? u.hp * 10 : 0) + "%";
  $("actionPanel").classList.toggle(
    "enemy",
    showUnit ? u.team === 1 : city?.owner === 1,
  );
  const ownUnit = showUnit && u.team === 0,
    ready = ownUnit && !u.acted && !busy && !over;
  const ownCity = !showUnit && city?.owner === 0;
  const buttons = {
    moveUnit: ownUnit,
    attackUnit: ownUnit,
    restUnit: ownUnit,
    recruit: ownCity,
    upgrade: ownCity,
    inspectCity: showUnit && !!city,
    inspectUnit: !showUnit && !!u,
    cancelAction: !!actionMode,
  };
  for (const [id, visible] of Object.entries(buttons)) $(id).hidden = !visible;
  $("moveUnit").disabled =
    !ready ||
    !directions.some(([dx, dy]) => {
      const v = at(u.x + dx, u.y + dy);
      return v && v.type !== "water" && !unitAt(v.x, v.y);
    });
  $("attackUnit").disabled =
    !ready || !units.some((v) => v.team === 1 && distance(v, u) === 1);
  $("restUnit").disabled = !ready || u.hp >= 10;
  $("recruit").disabled = busy || over || !ownCity || !!u || gold < 5;
  $("upgrade").disabled = busy || over || !ownCity || gold < 8;
  $("moveUnit").classList.toggle("active", actionMode === "move");
  $("attackUnit").classList.toggle("active", actionMode === "attack");
  $("actionHint").textContent = over
    ? "게임이 끝났습니다. 새 왕국을 시작해 보세요."
    : busy
      ? "붉은 왕국이 행동하고 있습니다."
      : actionMode === "move"
        ? "빛나는 인접 타일을 클릭하면 이동합니다."
        : actionMode === "attack"
          ? "붉게 빛나는 적을 클릭하면 공격합니다."
          : ownUnit
            ? u.acted
              ? "턴을 마치면 다시 행동할 수 있습니다."
              : "아래에서 행동을 선택하세요."
            : ownCity
              ? u
                ? "전사가 도시를 비우면 새 전사를 훈련할 수 있습니다."
                : "별을 사용해 병력을 훈련하거나 수입을 늘리세요."
              : city
                ? "전사로 이 도시에 진입하면 점령할 수 있습니다."
                : !t.seen
                  ? "탐험하지 않은 땅의 정보는 아직 보이지 않습니다."
                  : t.type === "water"
                    ? "전사는 바다를 건널 수 없습니다."
                    : "전사를 이동시켜 이 땅을 탐험하세요.";
}
function available(t) {
  if (
    !selectedUnit ||
    selectedUnit.acted ||
    busy ||
    over ||
    distance(t, selectedUnit) !== 1 ||
    t.type === "water"
  )
    return null;
  const occupant = unitAt(t.x, t.y);
  if (actionMode === "move" && !occupant) return "move";
  if (actionMode === "attack" && t.seen && occupant?.team === 1)
    return "attack";
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
      panelHeight:
        panelOpen && canvas.clientWidth < 541
          ? $("actionPanel").offsetHeight + 65
          : 0,
    });
}
function selectTile(t) {
  selected = { x: t.x, y: t.y };
  const u = t.seen ? unitAt(t.x, t.y) : null;
  selectedUnit = u?.team === 0 ? u : null;
  selectionKind = u ? "unit" : "city";
  actionMode = null;
  panelOpen = true;
  update();
  draw();
}
function cancelSelection() {
  if (actionMode) actionMode = null;
  else {
    panelOpen = false;
    selectedUnit = null;
  }
  update();
  draw();
}
function finish(win) {
  over = true;
  $("statusTitle").textContent = win
    ? "에버그린의 새로운 왕이 탄생했습니다!"
    : "숲의 깃발이 내려갔습니다";
  $("status").textContent = win
    ? "붉은 수도를 정복했습니다. 당신의 왕국에 영광을!"
    : "새로운 왕국에서 다시 도전해 보세요.";
  $("objectiveText").textContent = win ? "수도 점령 1 / 1" : "왕국 함락";
  addLog(
    win
      ? "붉은 수도 정복! 숲의 왕국이 승리했습니다."
      : "수도가 함락되었습니다.",
  );
  toast(win ? "✦ 승리! 에버그린은 당신의 것입니다." : "수도가 함락되었습니다.");
}
function capture(u) {
  let t = at(u.x, u.y);
  if (t.city && t.city.owner !== u.team) {
    t.city.owner = u.team;
    addLog(`${u.team === 0 ? "숲의 왕국" : "붉은 왕국"}이 ${t.city.name} 점령`);
    if (u.team === 0 && t.x === 9 && t.y === 3) finish(true);
    if (u.team === 1 && t.x === 3 && t.y === 7) finish(false);
  }
}
function act(u, t) {
  let enemy = unitAt(t.x, t.y);
  if (enemy && enemy.team === u.team) return false;
  if (enemy) {
    enemy.hp -= 6;
    u.hp -= 3;
    addLog(`${u.team === 0 ? "숲의" : "붉은"} 전사가 적과 교전했습니다.`);
    if (enemy.hp <= 0) {
      units = units.filter((v) => v !== enemy);
      u.x = t.x;
      u.y = t.y;
    }
    if (u.hp <= 0) units = units.filter((v) => v !== u);
  } else {
    u.x = t.x;
    u.y = t.y;
  }
  u.acted = true;
  if (units.includes(u)) capture(u);
  reveal();
  return true;
}
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  pointerStart = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  dragged = false;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointerStart) return;
  const dx = e.clientX - pointerStart.x,
    dy = e.clientY - pointerStart.y;
  if (Math.hypot(dx, dy) > 5) dragged = true;
  if (dragged) {
    pan = { x: pointerStart.panX + dx, y: pointerStart.panY + dy };
    draw();
  }
});
canvas.addEventListener("pointerup", (e) => {
  if (!pointerStart) return;
  pointerStart = null;
  if (dragged || busy || over) return;
  const b = canvas.getBoundingClientRect(),
    t = pickTile(view, e.clientX - b.left, e.clientY - b.top);
  if (!t) {
    panelOpen = false;
    actionMode = null;
    selectedUnit = null;
    update();
    draw();
    return;
  }
  if (actionMode) {
    if (available(t)) {
      const actor = selectedUnit;
      if (act(actor, t)) {
        selectTile(at(actor.x, actor.y));
        return;
      }
    }
    toast("빛나는 타일을 선택하거나 행동을 취소하세요.");
    return;
  }
  selectTile(t);
});
canvas.addEventListener("pointercancel", () => {
  pointerStart = null;
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
$("moveUnit").onclick = () => {
  if ($("moveUnit").disabled) return;
  actionMode = "move";
  update();
  draw();
};
$("attackUnit").onclick = () => {
  if ($("attackUnit").disabled) return;
  actionMode = "attack";
  update();
  draw();
};
$("restUnit").onclick = () => {
  if ($("restUnit").disabled || !selectedUnit) return;
  selectedUnit.hp = Math.min(10, selectedUnit.hp + 3);
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
  actionMode = null;
  update();
  draw();
};
$("cancelAction").onclick = cancelSelection;
$("closePanel").onclick = () => {
  actionMode = null;
  panelOpen = false;
  selectedUnit = null;
  update();
  draw();
};
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("helpDialog").open) cancelSelection();
});
$("resetView").onclick = () => {
  pan = { x: 0, y: 0 };
  setZoom(1);
};
$("recruit").onclick = () => {
  let t = at(selected.x, selected.y);
  if (gold < 5 || t.city?.owner !== 0 || unitAt(t.x, t.y) || busy || over)
    return;
  gold -= 5;
  units.push({ x: t.x, y: t.y, team: 0, hp: 10, acted: false });
  addLog("새로운 전사가 왕국에 합류했습니다.");
  selectedUnit = unitAt(t.x, t.y);
  selectionKind = "unit";
  actionMode = null;
  update();
  draw();
};
$("upgrade").onclick = () => {
  let t = at(selected.x, selected.y);
  if (gold < 8 || t.city?.owner !== 0 || busy || over) return;
  gold -= 8;
  t.city.level++;
  addLog(`${t.city.name}이 레벨 ${t.city.level}로 성장했습니다.`);
  toast("도시 성장! 다음 턴부터 수입이 증가합니다.");
  update();
  draw();
};
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
      if (!t || t.type === "water" || seen.has(key)) continue;
      let other = unitAt(x, y);
      if (other?.team === u.team) continue;
      seen.add(key);
      queue.push({ x, y, first: p.first || t });
    }
  }
  return null;
}
$("endTurn").onclick = async () => {
  if (busy || over) return;
  busy = true;
  actionMode = null;
  selectedUnit = null;
  update();
  for (let u of [...units.filter((u) => u.team === 1)]) {
    await new Promise((r) => setTimeout(r, 250));
    if (over) break;
    let targets = units.filter((v) => v.team === 0);
    let adjacent = targets.find((v) => distance(u, v) === 1);
    let goal = adjacent || { x: 3, y: 7 };
    let step = pathStep(u, goal);
    if (step) act(u, step);
    draw();
  }
  if (!over) {
    turn++;
    gold += ownCities().reduce((a, t) => a + t.city.level + 2, 0);
    for (let u of units) {
      u.acted = false;
      if (at(u.x, u.y).city?.owner === u.team) u.hp = Math.min(10, u.hp + 2);
    }
    if (turn % 3 === 0 && !unitAt(9, 3) && at(9, 3).city.owner === 1) {
      units.push({ x: 9, y: 3, team: 1, hp: 10, acted: false });
      addLog("붉은 수도에 지원군이 도착했습니다.");
    }
    addLog("새로운 아침. 도시에서 별을 거두었습니다.");
    $("statusTitle").textContent = `턴 ${turn}, 왕국의 다음 걸음`;
    $("status").textContent =
      "전사를 움직이거나, 도시를 선택해 병력을 훈련하세요.";
  }
  busy = false;
  selectedUnit = unitAt(selected.x, selected.y);
  if (selectedUnit?.team !== 0) selectedUnit = null;
  update();
  draw();
};
$("newGame").onclick = () => {
  if (busy) return;
  if (confirm("현재 왕국을 떠나 새로운 게임을 시작할까요?")) {
    init();
    $("statusTitle").textContent = "당신의 이야기가 시작됩니다";
    $("objectiveText").textContent = "수도 점령 0 / 1";
  }
};
$("help").onclick = () => $("helpDialog").showModal();
$("closeHelp").onclick = $("startPlay").onclick = () => $("helpDialog").close();
$("zoomIn").onclick = () => setZoom(zoom + 0.15);
$("zoomOut").onclick = () => setZoom(zoom - 0.15);
new ResizeObserver(draw).observe(canvas);
init();
