import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const nations = [
  ["rome", "로마", "붉은 볏 · 판금 투구"],
  ["goguryeo", "고구려", "깃털 관 · 푸른 찰갑"],
  ["egypt", "고대 이집트", "줄무늬 네메스 · 금장"],
  ["persia", "페르시아", "접힌 티아라 · 어깨 망토"],
  ["han", "한나라", "술 장식 · 붉은 찰갑"],
  ["greece", "고대 그리스", "청동 투구 · 크림색 띠"],
  ["mongol", "몽골 제국", "털모자 · 땋은 머리"],
  ["maurya", "마우리아 왕조", "겹 터번 · 부채 장식"],
];
const kinds = [
  ["warrior", "보병", "검과 작은 방패"],
  ["guard", "방패병", "넓은 갑옷 · 커다란 방패"],
  ["archer", "궁수", "굽은 활 · 화살통"],
  ["rider", "기병", "통통한 조랑말"],
  ["knight", "기사", "대검 · 판금 · 짧은 망토"],
  ["assassin", "암살자", "쌍단검 · 마스크 · 스카프"],
  ["giant", "거인", "두꺼운 팔 · 큰 체격"],
  ["catapult", "투석기", "나무 차체 · 돌 투척"],
];
const $ = (id) => document.getElementById(id),
  canvas = $("preview");
for (const [id, name] of nations) $("nation").add(new Option(name, id));
for (const [id, name] of kinds) $("kind").add(new Option(name, id));
const renderer = new T.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
scene.background = new T.Color("#e9ecdf");
scene.add(new T.HemisphereLight("#fff8e9", "#98ad93", 1.6));
const sun = new T.DirectionalLight("#fff5e3", 2.3);
sun.position.set(-4, 9, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 9, bottom: -9 });
sun.shadow.bias = -0.001;
scene.add(sun);
const fill = new T.DirectionalLight("#d3e7ef", 0.8);
fill.position.set(5, 4, -5);
scene.add(fill);
const camera = new T.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);
const loader = new GLTFLoader(),
  cache = new Map();
let mode = "nations",
  motion = "idle",
  rotating = false,
  actors = [],
  labels = [],
  generation = 0,
  lastFrame = 0,
  clock = new T.Clock();
const stage = new T.Group();
scene.add(stage);
const floor = new T.Mesh(
  new T.PlaneGeometry(100, 100),
  new T.MeshStandardMaterial({ color: "#e9ecdf", roughness: 1 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.045;
floor.receiveShadow = true;
scene.add(floor);
const mats = new Map();
const mat = (c) => {
  if (!mats.has(c))
    mats.set(c, new T.MeshStandardMaterial({ color: c, roughness: 1 }));
  return mats.get(c);
};
function ground(x, z, i, field = false) {
  const g = new T.Group();
  g.position.set(x, -0.045, z);
  const tile = new T.Mesh(
    field
      ? new T.BoxGeometry(0.99, 0.12, 0.99)
      : new T.CylinderGeometry(0.89, 0.95, 0.11, 48),
    mat(
      field
        ? i % 7 === 0
          ? "#a8c993"
          : i % 3 === 0
            ? "#b6cf9e"
            : "#c7d7ac"
        : "#d9deca",
    ),
  );
  tile.receiveShadow = true;
  g.add(tile);
  stage.add(g);
  return g;
}
async function model(nation, kind) {
  const key = nation + "/" + kind;
  if (!cache.has(key))
    cache.set(
      key,
      loader.loadAsync(
        new URL("../unit-preview/models/" + key + ".glb", location.href).href,
      ),
    );
  return cache.get(key);
}
function resize() {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  if (mode === "field") {
    const span = 4.7;
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.top = span;
    camera.bottom = -span;
    camera.position.set(10, 8.165, 10);
    camera.lookAt(0, 0, 0);
  } else {
    const mobile = w < 650,
      span = mobile ? 9.2 : 3.9;
    camera.left = -span * aspect;
    camera.right = span * aspect;
    camera.top = span;
    camera.bottom = -span;
    camera.position.set(0, 12, 16);
    camera.lookAt(0, 0.5, 0);
  }
  camera.updateProjectionMatrix();
}
async function show() {
  const current = ++generation;
  $("loading").hidden = false;
  $("stage").dataset.mode = mode;
  stage.clear();
  actors = [];
  labels = [];
  $("labels").replaceChildren();
  const nation = $("nation").value,
    kind = $("kind").value;
  const entries =
    mode === "units"
      ? kinds.map((k) => [nation, k[0], k[1], k[2]])
      : nations.map((n) => [n[0], kind, n[1], n[2]]);
  const loaded = await Promise.all(entries.map(([n, k]) => model(n, k)));
  if (current !== generation) return;
  const mobile = canvas.clientWidth < 650,
    cols = mobile ? 2 : 4;
  resize();
  if (mode === "field") {
    for (let x = -5; x <= 5; x++)
      for (let z = -5; z <= 5; z++) ground(x, z, x * 7 + z * 3, true);
  }
  entries.forEach((entry, i) => {
    let x, z;
    if (mode === "field") {
      x = (i % 4) * 2 - 3;
      z = Math.floor(i / 4) * 3 - 1.5;
    } else {
      x = ((i % cols) - (cols - 1) / 2) * (mobile ? 3.2 : 3.05);
      z =
        (Math.floor(i / cols) - (Math.ceil(8 / cols) - 1) / 2) *
        (mobile ? 5.8 : 5.5);
    }
    const root = loaded[i].scene.clone(true);
    const scale = mode === "field" ? 0.46 : entry[1] === "giant" ? 1.02 : 1.2;
    root.scale.setScalar(scale);
    root.position.set(x, 0.02, z);
    root.rotation.y = 0.22;
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const mixer = new T.AnimationMixer(root);
    loaded[i].animations.forEach((c) => mixer.clipAction(c).play());
    stage.add(root);
    if (mode !== "field") ground(x, z, i);
    actors.push({ root, mixer, x, z, kind: entry[1] });
    const el = document.createElement("div");
    el.className = "label";
    const title = document.createElement("b");
    title.textContent = entry[2];
    const desc = document.createElement("small");
    desc.textContent = entry[3];
    el.append(title, desc);
    $("labels").append(el);
    labels.push({
      el,
      point: new T.Vector3(x, mode === "field" ? -0.13 : -0.17, z + 0.48),
    });
  });
  $("nationLabel").hidden = mode !== "units";
  $("kindLabel").hidden = mode === "units";
  $("note").textContent =
    mode === "field"
      ? "필드 배치 시안 · 기존과 같은 마름모 격자 · 유닛 크기 비교용"
      : mode === "units"
        ? "같은 나라 안에서도 무기와 실루엣으로 병종 구분"
        : "8개 나라 · 색상뿐 아니라 투구, 옷, 방패도 다르게";
  $("loading").hidden = true;
  canvas.dataset.ready = String(current);
}
function frame(now) {
  requestAnimationFrame(frame);
  if (now - lastFrame < 65) return;
  lastFrame = now;
  const time = clock.getElapsedTime();
  for (const a of actors) {
    const phase =
      motion === "walk"
        ? 2.02 + (time % 1.8)
        : motion === "attack"
          ? 4.42 + (time % 1.6 < 1 ? time % 1.6 : 0.98)
          : time % 1.9;
    a.mixer.setTime(phase);
    a.root.rotation.y = rotating ? time * 0.45 : 0.22;
    a.root.position.x =
      a.x +
      (motion === "walk"
        ? Math.sin(time * 1.2) * 0.15
        : motion === "attack"
          ? Math.sin(Math.min(1, time % 1.6) * Math.PI) * 0.07
          : 0);
    a.root.position.y =
      0.02 +
      (motion === "walk"
        ? Math.abs(Math.sin(time * 10)) * 0.018
        : Math.sin(time * 2 + a.x) * 0.007);
  }
  renderer.render(scene, camera);
  for (const l of labels) {
    const p = l.point.clone().project(camera);
    l.el.style.left = ((p.x + 1) * canvas.clientWidth) / 2 + "px";
    l.el.style.top = ((-p.y + 1) * canvas.clientHeight) / 2 + 22 + "px";
  }
  canvas.dataset.frames = String(Number(canvas.dataset.frames || 0) + 1);
}
for (const b of document.querySelectorAll("[data-mode]"))
  b.onclick = () => {
    mode = b.dataset.mode;
    document
      .querySelectorAll("[data-mode]")
      .forEach((x) => x.classList.toggle("active", x === b));
    show();
  };
for (const b of document.querySelectorAll("[data-motion]"))
  b.onclick = () => {
    motion = b.dataset.motion;
    document
      .querySelectorAll("[data-motion]")
      .forEach((x) => x.classList.toggle("active", x === b));
  };
$("rotate").onclick = () => {
  rotating = !rotating;
  $("rotate").classList.toggle("active", rotating);
};
$("nation").onchange = show;
$("kind").onchange = show;
new ResizeObserver(resize).observe($("stage"));
show().catch((e) => {
  $("loading").textContent = "모델 로딩 실패: " + e.message;
});
requestAnimationFrame(frame);
window.__unitPreview = {
  get actors() {
    return actors;
  },
  get mode() {
    return mode;
  },
  get motion() {
    return motion;
  },
};
