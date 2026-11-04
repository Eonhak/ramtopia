import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { animalURL, ANIMAL_NATIONS, UNIT_KINDS } from "./unit-art.js";
const modelLoader = new GLTFLoader(),
  nationLoads = new Map();
function requestedNations(opts) {
  return [
    ...new Set(
      Object.values(opts.teamNations || { 0: opts.nation, 1: opts.enemyNation })
        .map((n) => n?.id)
        .filter((n) => ANIMAL_NATIONS.includes(n)),
    ),
  ];
}
function loadNation(nation) {
  if (!nationLoads.has(nation))
    nationLoads.set(
      nation,
      Promise.all(
        UNIT_KINDS.map(async (kind) => [
          kind,
          await modelLoader.loadAsync(animalURL(nation, kind)),
        ]),
      )
        .then((entries) => {
          templates[nation] = Object.fromEntries(entries);
          sceneInfo.models = Object.keys(templates).length * UNIT_KINDS.length;
        })
        .catch((error) => {
          failed = true;
          sceneInfo.failed = true;
          console.warn(
            "Animal models unavailable; using animal sprites",
            error,
          );
        }),
    );
  return nationLoads.get(nation);
}

let software = false,
  cloudGeometry,
  cloudMaterial,
  fogBatch,
  fogFloor;
let renderer,
  scene,
  unitScene,
  unitSun,
  unitHemi,
  camera,
  sun,
  hemi,
  failed = false,
  ready = false,
  tiles = new Map(),
  actors = new Map(),
  templates = {},
  trees = [],
  flags = [];
const sceneInfo = { ready: false, failed: false, models: 0, frames: 0 };
export function graphicsStatus() {
  return { ...sceneInfo };
}
export function graphicsActive() {
  return !!renderer && !failed;
}
export function ambientInterval() {
  return failed ? 100 : software ? 100 : 33;
}
const mat = (c) =>
  new T.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
const mats = new Map();
let dim = 1;
function M(c) {
  const key = c + ":" + dim;
  if (!mats.has(key)) {
    const m = mat(c);
    m.color.multiplyScalar(dim);
    mats.set(key, m);
  }
  return mats.get(key);
}
function mesh(g, c, parent, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(g, M(c));
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(p, w, h, d, c, x = 0, y = 0, z = 0) {
  return mesh(new T.BoxGeometry(w, h, d), c, p, x, y, z);
}
function ball(p, r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = mesh(new T.IcosahedronGeometry(r, 1), c, p, x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}
function cyl(p, r1, r2, h, c, x = 0, y = 0, z = 0, n = 8) {
  return mesh(new T.CylinderGeometry(r1, r2, h, n), c, p, x, y, z);
}
function group(parent, x = 0, y = 0, z = 0) {
  const o = new T.Group();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function tree(p, x, z, scale = 1) {
  const g = group(p, x, 0.05, z);
  g.scale.setScalar(scale);
  cyl(g, 0.045, 0.065, 0.58, "#786c4b", 0, 0.28, 0, 6);
  for (let i = 0; i < 3; i++) {
    const o = cyl(
      g,
      0,
      0.34 - i * 0.065,
      0.53,
      "#4f8063",
      0,
      0.52 + i * 0.23,
      0,
      6,
    );
    o.rotation.y = i * 0.6;
  }
  trees.push(g);
}
function rock(p, x, z, s = 1, ore = false) {
  const o = mesh(
    new T.ConeGeometry(0.52 * s, 1.03 * s, 5, 2),
    "#9aa99e",
    p,
    x,
    0.5 * s,
    z,
  );
  o.rotation.z = 0.09;
  o.rotation.y = 0.8;
  const cap = mesh(
    new T.ConeGeometry(0.18 * s, 0.35 * s, 5),
    "#ccd4c7",
    p,
    x - 0.034 * s,
    0.86 * s,
    z,
  );
  cap.rotation.z = 0.09;
  if (ore)
    for (let i = 0; i < 3; i++)
      ball(p, 0.09, "#bba570", x + 0.2 + i * 0.06, 0.3 + i * 0.1, z + 0.31);
}
function flag(parent, x, y, z, color) {
  cyl(parent, 0.018, 0.018, 0.85, "#6d7970", x, y + 0.42, z, 6);
  const geo = new T.PlaneGeometry(0.38, 0.24, 8, 2);
  const material = new T.MeshStandardMaterial({
    color,
    side: T.DoubleSide,
    roughness: 1,
  });
  const o = new T.Mesh(geo, material);
  o.position.set(x + 0.2, y + 0.72, z);
  parent.add(o);
  flags.push({ o, base: geo.attributes.position.array.slice() });
}
function roof(p, w, h, d, c, x, y, z) {
  const o = mesh(new T.CylinderGeometry(0, 1, 1, 4), c, p, x, y, z);
  o.rotation.y = Math.PI / 4;
  o.scale.set(w * 0.71, h, d * 0.71);
  return o;
}
function building(p, x, z, w, h, d, roofCol) {
  box(p, w, h, d, "#d4ceaf", x, h / 2, z);
  roof(p, w * 1.25, 0.36, d * 1.25, roofCol, x, h + 0.15, z);
  box(p, 0.13, 0.27, 0.015, "#536257", x, 0.135, z + d / 2 + 0.008);
}
function city(parent, type, level = 1) {
  const g = group(parent);
  g.scale.setScalar(0.8 * (1 + Math.min(4, level - 1) * 0.07));
  box(g, 1.08, 0.12, 1.02, "#b2b89b", 0, 0.02, 0);
  if (type === "goguryeo") {
    building(g, 0, -0.1, 0.66, 0.51, 0.5, "#3e6568");
    building(g, -0.35, 0.28, 0.29, 0.24, 0.28, "#4b6b69");
    building(g, 0.35, 0.28, 0.29, 0.24, 0.28, "#4b6b69");
    box(g, 0.59, 0.045, 0.62, "#64685a", 0, 0.44, -0.1);
    for (const side of [-1, 1]) {
      box(g, 0.06, 0.39, 0.06, "#83644e", side * 0.25, 0.3, 0.12);
    }
    box(g, 1.06, 0.2, 0.1, "#a2ac99", 0, 0.13, 0.49);
  } else if (type === "rome") {
    box(g, 0.65, 0.5, 0.55, "#d4d0b6", 0, 0.3, 0);
    for (const q of [-0.25, 0, 0.25])
      cyl(g, 0.047, 0.06, 0.49, "#e3dcc1", q, 0.35, 0.35, 8);
    roof(g, 0.94, 0.26, 0.81, "#a77362", 0, 0.67, 0.05);
    box(g, 0.8, 0.08, 0.72, "#c4c4ad", 0, 0.1, 0.05);
  } else {
    building(g, 0, 0, 0.58, 0.35, 0.48, "#93836a");
    building(g, -0.34, 0.28, 0.23, 0.2, 0.25, "#93836a");
  }
  flag(
    g,
    0.45,
    0.14,
    -0.4,
    type === "rome" ? "#ad6670" : type === "goguryeo" ? "#548d79" : "#dedcc8",
  );
  return g;
}

function init(opts) {
  if (renderer || failed) return;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const gl = renderer.getContext(),
      debug = gl.getExtension("WEBGL_debug_renderer_info");
    software =
      !!debug &&
      /swiftshader|llvmpipe|software/i.test(
        gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
      );
    renderer.shadowMap.enabled = !software;
    sceneInfo.software = software;
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      failed = true;
      sceneInfo.failed = true;
    });
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 500);
    camera.position.set(100, Math.sqrt(20000 / 3), 100);
    camera.lookAt(0, 0, 0);
    hemi = new T.HemisphereLight("#f3f2df", "#627b77", 1.8);
    scene.add(hemi);
    sun = new T.DirectionalLight("#fff3db", 2.1);
    sun.position.set(-10, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.normalBias = 0.025;
    sun.shadow.bias = -0.0002;
    scene.add(sun, sun.target);
    unitScene = new T.Scene();
    unitHemi = hemi.clone();
    unitSun = sun.clone();
    unitSun.castShadow = false;
    unitScene.add(unitHemi, unitSun, unitSun.target);
    const requested = requestedNations(opts);
    Promise.all((requested.length ? requested : ["rome"]).map(loadNation)).then(
      () => {
        if (!failed) {
          ready = true;
          sceneInfo.ready = true;
        }
      },
    );
  } catch (e) {
    failed = true;
    sceneInfo.failed = true;
    console.warn("3D initialization failed", e);
  }
}
function disposeTile(record) {
  scene.remove(record.g);
  unitScene.remove(record.resource);
  for (const root of [record.g, record.resource])
    root.traverse((o) => {
      if (o.geometry && !o.userData.sharedGeometry) o.geometry.dispose();
    });
}
function createTile(t, nations) {
  const g = group(scene, t.x, 0, t.y),
    resource = group(unitScene, t.x, 0, t.y);
  resource.scale.setScalar(0.8);
  const motion = [];
  trees = [];
  flags = [];
  dim = t.seen ? ((t.visible ?? true) ? 1 : 0.64) : 1;
  const water = t.seen && t.type === "water",
    color = !t.seen
      ? "#536a70"
      : water
        ? "#4e9297"
        : t.type === "forest"
          ? "#85a47b"
          : (t.x + t.y) % 2
            ? "#91af83"
            : "#9db88b";
  if (!t.seen) {
    if (!cloudGeometry) {
      const parts = [
        [-0.24, 0.2, -0.12, 0.46, 0.22, 0.42],
        [0.22, 0.22, 0.12, 0.48, 0.25, 0.44],
        [0.02, 0.31, -0.1, 0.4, 0.28, 0.41],
      ].map(([x, y, z, sx, sy, sz]) => {
        const geo = new T.IcosahedronGeometry(1, software ? 1 : 2);
        geo.scale(sx, sy, sz);
        geo.translate(x, y, z);
        return geo;
      });
      cloudGeometry = mergeGeometries(parts);
      for (const part of parts) part.dispose();
    }
    cloudMaterial ||= new T.MeshLambertMaterial({
      color: "#ccdae4",
      flatShading: false,
    });
    const cloud = new T.Object3D();
    g.add(cloud);
    const seed = ((t.x * 17 + t.y * 31) % 11) / 11;
    cloud.rotation.y = seed * Math.PI * 2;
    cloud.scale.set(1.08 + seed * 0.08, 0.8 + seed * 0.15, 1.08 + seed * 0.08);
    cloud.castShadow = false;
    cloud.receiveShadow = false;
    // Shared geometry is retained when individual fog tiles are revealed.
    cloud.userData.sharedGeometry = true;
    motion.push({ o: cloud, kind: "cloud" });
  } else box(g, 0.986, 0.12, 0.986, color, 0, -0.07, 0);
  if (water) {
    for (const z of [-0.28, 0.2]) {
      const wave = mesh(
        new T.PlaneGeometry(0.43, 0.012),
        "#a7c7b4",
        g,
        0,
        0.002,
        z,
      );
      wave.rotation.x = -Math.PI / 2;
      wave.castShadow = false;
      wave.receiveShadow = false;
      motion.push({ o: wave, kind: "wave", z });
    }
  }
  if (t.seen) {
    const detail = group(g);
    detail.scale.setScalar(0.8);
    if (t.city) {
      city(
        g,
        t.city.owner === -1
          ? "neutral"
          : ["goguryeo", "han", "mongol"].includes(nations?.[t.city.owner]?.id)
            ? "goguryeo"
            : "rome",
        t.city.level,
      );
      if (t.city.walls)
        for (const z of [-0.43, 0.43])
          box(g, 0.9, 0.16, 0.07, "#9eac97", 0, 0.08, z);
    } else {
      if (t.type === "forest") {
        tree(detail, -0.23, -0.12, 0.72);
        tree(detail, 0.23, 0.2, 0.65);
      }
      if (t.type === "mountain") {
        rock(detail, 0, 0, 0.8, t.resource === "ore" && !t.developed);
        rock(detail, -0.3, 0.23, 0.32);
      }
      if (t.resource && !t.developed) {
        if (t.resource === "fruit") {
          tree(detail, 0, 0, 0.6);
          for (let i = 0; i < 3; i++)
            ball(
              resource,
              0.065,
              "#b27459",
              Math.sin(i * 2) * 0.18,
              0.53,
              Math.cos(i * 2) * 0.15,
            );
        }
        if (t.resource === "game") {
          const animal = group(resource, 0.23, 0.03, 0.28);
          ball(animal, 0.15, "#b39a71", 0, 0.24, 0, 1, 0.8, 1.5);
          const head = ball(
            animal,
            0.09,
            "#b39a71",
            0,
            0.36,
            0.18,
            0.7,
            1.1,
            1,
          );
          motion.push({ o: head, kind: "deer" });
          for (const x of [-0.07, 0.07])
            for (const z of [-0.1, 0.1])
              cyl(animal, 0.018, 0.023, 0.19, "#70664f", x, 0.1, z, 5);
        }
        if (t.resource === "fish") {
          const fish = ball(
            resource,
            0.13,
            "#c4d5be",
            0.14,
            0.04,
            0.1,
            1,
            0.2,
            0.5,
          );
          motion.push({ o: fish, kind: "fish" });
          const fin = mesh(
            new T.ConeGeometry(0.07, 0.1, 3),
            "#a8c8b5",
            resource,
            0.29,
            0.04,
            0.1,
          );
          fin.rotation.z = Math.PI / 2;
        }
        if (t.resource === "grain")
          for (let i = 0; i < 5; i++)
            cyl(
              resource,
              0.02,
              0.025,
              0.26,
              "#c6b36d",
              -0.2 + i * 0.1,
              0.13,
              0.1,
              5,
            );
      }
      if (t.resource === "ore" && t.developed) {
        box(detail, 0.3, 0.26, 0.25, "#a99670", 0.14, 0.14, 0.15);
        box(detail, 0.12, 0.19, 0.015, "#304c4d", 0.14, 0.1, 0.28);
      }
      if (t.building === "smelter") {
        box(detail, 0.4, 0.28, 0.35, "#9d927b", 0, 0.14, 0);
        box(detail, 0.09, 0.43, 0.1, "#787a6c", 0.13, 0.35, 0);
      }
      if (t.building === "landStatue" || t.building === "seaStatue") {
        box(detail, 0.34, 0.12, 0.34, "#a7b4a4", 0, 0.06, 0);
        cyl(detail, 0.07, 0.1, 0.5, "#b5c2ae", 0, 0.34, 0, 6);
      }
      if (t.road) box(g, 0.13, 0.015, 0.96, "#b6bba1", 0, 0.005, 0);
    }
  }
  dim = 1;
  return { g, resource, trees, flags, motion, key: tileKey(t, nations) };
}
function tileKey(t, nations) {
  return [
    t.seen,
    t.visible,
    t.type,
    t.resource,
    t.developed,
    t.building,
    t.road,
    t.city?.owner,
    t.city?.level,
    t.city?.walls,
    nations?.[t.city?.owner]?.id,
  ].join("|");
}
function boatModel(kind, color) {
  const g = new T.Group();
  const hull = cyl(g, 0.18, 0.25, 0.65, "#9d805b", 0, 0.12, 0, 5);
  hull.rotation.z = Math.PI / 2;
  hull.scale.z = 1.7;
  cyl(g, 0.014, 0.014, 0.85, "#7b7660", 0, 0.51, 0, 6);
  const sail = mesh(new T.PlaneGeometry(0.4, 0.54), "#e3dfc4", g, 0.2, 0.56, 0);
  sail.material = sail.material.clone();
  sail.material.side = T.DoubleSide;
  if (kind !== "transport") {
    box(g, 0.28, 0.15, 0.4, color, 0, 0.26, 0);
    if (kind === "warship")
      for (const s of [-1, 1]) {
        const cannon = cyl(g, 0.05, 0.05, 0.24, "#536766", s * 0.25, 0.27, 0);
        cannon.rotation.z = Math.PI / 2;
      }
  }
  return g;
}
function actor(u, nation) {
  const g = new T.Group(),
    color = nation?.color || (u.team === 0 ? "#477866" : "#9d5863");
  let model, mixer, tip;
  if (u.boat) model = boatModel(u.boat, color);
  else {
    const pack =
      templates[nation?.id] || templates.rome || Object.values(templates)[0];
    const asset = pack[u.type || "warrior"] || pack.warrior;
    model = asset.scene.clone(true);
    model.scale.setScalar(0.4);
    mixer = new T.AnimationMixer(model);
    for (const clip of asset.animations) mixer.clipAction(clip).play();
    tip =
      model.getObjectByName("BladeTip") ||
      (u.type === "guard" ? model.getObjectByName("Shield") : null);
  }
  g.add(model);
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.material = o.material.clone();
    }
  });
  unitScene.add(g);
  const shadow = new T.Mesh(
    new T.CircleGeometry(0.22, 12),
    new T.MeshBasicMaterial({
      color: "#263f39",
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  return {
    g,
    shadow,
    model,
    mixer,
    tip,
    yaw: Math.PI / 4,
    key: [u.type, u.boat, nation?.id].join("|"),
  };
}
function removeActor(a) {
  unitScene.remove(a.g);
  scene.remove(a.shadow);
  a.shadow.geometry.dispose();
  a.shadow.material.dispose();
  a.mixer?.stopAllAction();
  a.model.traverse((o) => {
    if (o.isMesh) o.material.dispose();
  });
}
const unproject = (p) => ({
  x: (p.x / 30 + p.y / 15) / 2,
  y: (p.y / 15 - p.x / 30) / 2,
});
function atPosition(record, p) {
  record.g.position.set(p.x, 0.015, p.y);
}
export function renderScene(canvas, opts, view) {
  init(opts);
  if (!failed) for (const nation of requestedNations(opts)) loadNation(nation);
  if (!ready || failed || requestedNations(opts).some((n) => !templates[n]))
    return false;
  const { world, units, animation, night, nation, enemyNation, teamNations } =
      opts,
    nations = teamNations || { 0: nation, 1: enemyNation },
    n = world.length,
    w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (
    renderer.domElement.width !== Math.round(w * renderer.getPixelRatio()) ||
    renderer.domElement.height !== Math.round(h * renderer.getPixelRatio())
  )
    renderer.setSize(w, h, false);
  const factor = 30 * Math.SQRT2 * view.scale;
  camera.left = -view.ox / factor;
  camera.right = (w - view.ox) / factor;
  camera.top = view.oy / factor;
  camera.bottom = -(h - view.oy) / factor;
  camera.updateProjectionMatrix();
  scene.background = new T.Color(night ? "#172d40" : "#41616a");
  sun.intensity = 2.1;
  hemi.intensity = 1.8;
  unitSun.intensity = sun.intensity;
  unitHemi.intensity = hemi.intensity;
  sun.position.set(n / 2 - 10, 30, n / 2 + 12);
  sun.target.position.set(n / 2, 0, n / 2);
  Object.assign(sun.shadow.camera, { left: -n, right: n, top: n, bottom: -n });
  sun.shadow.camera.updateProjectionMatrix();
  const tileKeep = new Set();
  for (const t of world.flat()) {
    const key = t.x + "," + t.y;
    tileKeep.add(key);
    let r = tiles.get(key);
    if (!r || r.key !== tileKey(t, nations)) {
      if (r) disposeTile(r);
      r = createTile(t, nations);
      tiles.set(key, r);
    }
  }
  for (const [key, r] of tiles)
    if (!tileKeep.has(key)) {
      disposeTile(r);
      tiles.delete(key);
    }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
    time = performance.now() / 1000,
    motionScale = reduced ? 0.35 : 1;
  for (const r of tiles.values()) {
    for (const m of r.motion) {
      if (m.kind === "wave")
        m.o.position.z =
          m.z + Math.sin(time * 1.2 + r.g.position.x + r.g.position.z) * 0.07;
      else if (m.kind === "deer") {
        m.o.rotation.x =
          Math.sin(time * 1.2 + r.g.position.x) * 0.42 * motionScale;
        m.o.position.y =
          0.34 + Math.sin(time * 1.2 + r.g.position.x) * 0.065 * motionScale;
        m.o.position.z =
          0.18 + Math.sin(time * 1.2 + r.g.position.x) * 0.03 * motionScale;
      } else if (m.kind === "cloud")
        m.o.position.y =
          Math.sin(time * 0.5 + r.g.position.x * 0.3 + r.g.position.z * 0.2) *
          0.025 *
          motionScale;
      else m.o.rotation.y = Math.sin(time + r.g.position.z) * 0.3 * motionScale;
    }
    for (let i = 0; i < r.trees.length; i++)
      r.trees[i].rotation.z =
        Math.sin(time * 1.3 + i + r.g.position.x) * 0.065 * motionScale;
    for (const f of r.flags) {
      const p = f.o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        p.setZ(i, Math.sin(time * 3 + f.base[i * 3] * 9) * 0.04);
      p.needsUpdate = true;
    }
  }
  const cloudNodes = [...tiles.values()].flatMap((r) =>
    r.motion.filter((m) => m.kind === "cloud").map((m) => m.o),
  );
  if (cloudGeometry) {
    if (!fogBatch || fogBatch.instanceMatrix.count !== n * n) {
      if (fogBatch) {
        scene.remove(fogBatch);
        fogBatch.dispose();
      }
      fogBatch = new T.InstancedMesh(cloudGeometry, cloudMaterial, n * n);
      fogBatch.frustumCulled = false;
      scene.add(fogBatch);
    }
    fogBatch.count = cloudNodes.length;
    cloudNodes.forEach((cloud, i) => {
      cloud.updateWorldMatrix(true, false);
      fogBatch.setMatrixAt(i, cloud.matrixWorld);
    });
    fogBatch.instanceMatrix.needsUpdate = true;
    if (!fogFloor || fogFloor.userData.size !== n) {
      if (fogFloor) {
        scene.remove(fogFloor);
        fogFloor.geometry.dispose();
        fogFloor.material.dispose();
      }
      fogFloor = new T.Mesh(
        new T.PlaneGeometry(n, n),
        new T.MeshBasicMaterial({ color: "#c4d3da" }),
      );
      fogFloor.rotation.x = -Math.PI / 2;
      fogFloor.position.set((n - 1) / 2, -0.14, (n - 1) / 2);
      fogFloor.userData.size = n;
      scene.add(fogFloor);
    }
    fogFloor.visible = cloudNodes.length > 0;
  }
  canvas.dataset.cloudInstances = String(cloudNodes.length);
  canvas.dataset.cloudBatches = cloudNodes.length ? "1" : "0";
  const visibleUnits = units.filter(
    (u) => world[u.y]?.[u.x]?.visible ?? world[u.y]?.[u.x]?.seen,
  );
  const defender = animation?.defender,
    progress = animation?.pose?.progress ?? 0;
  const display = defender
    ? [
        ...visibleUnits.filter(
          (u) =>
            u.id !== defender.id &&
            !(u.id === undefined && u.x === defender.x && u.y === defender.y),
        ),
        defender,
      ]
    : [...visibleUnits];
  if (
    animation?.unit &&
    !display.some((u) =>
      u.id !== undefined ? u.id === animation.unit.id : u === animation.unit,
    )
  )
    display.push(animation.unit);
  const keep = new Set();
  for (const u of display) {
    const key =
      u.id !== undefined
        ? "id:" + u.id
        : "tile:" + u.team + ":" + u.x + "," + u.y;
    keep.add(key);
    const kind = [u.type, u.boat, nations[u.team]?.id].join("|");
    let a = actors.get(key);
    if (!a || a.key !== kind) {
      if (a) removeActor(a);
      a = actor(u, nations[u.team]);
      actors.set(key, a);
    }
    a.g.visible = true;
    a.g.rotation.set(0, a.yaw, 0);
    a.model.rotation.set(0, 0, 0);
    a.g.position.set(u.x, 0.015, u.y);
    a.mode = "idle";
    a.walkPhase = null;
    a.mixer?.setTime(time % 1.95);
    a.model.position.y =
      Math.abs(Math.sin(time * 1.7 + u.x + u.y)) * 0.025 * motionScale;
    const head = a.model.getObjectByName("Head");
    if (head) {
      head.rotation.y += Math.sin(time * 0.7 + u.x) * 0.22 * motionScale;
      head.rotation.z += Math.sin(time * 1.2 + u.y) * 0.025 * motionScale;
    }
    a.model.traverse((o) => {
      if (o.isMesh) {
        o.material.opacity = 1;
      }
    });
    const active =
      animation &&
      (u.id !== undefined ? u.id === animation.unit.id : u === animation.unit);
    if (active) {
      const pos = unproject(animation.position);
      atPosition(a, pos);
      const from = animation.from
          ? unproject(animation.from)
          : { x: animation.unit.x, y: animation.unit.y },
        to = animation.to ? unproject(animation.to) : pos;
      const dx = to.x - from.x,
        dz = to.y - from.y;
      if (Math.abs(dx) + Math.abs(dz) > 0.001) a.yaw = Math.atan2(dx, dz);
      a.g.rotation.y = a.yaw;
      if (animation.pose) {
        a.mode = "attack";
        a.mixer?.setTime(4.4 + progress);
        if (!u.boat && a.tip && animation.to) {
          a.g.position.set(from.x, 0.015, from.y);
          a.mixer.setTime(4.9);
          unitScene.updateMatrixWorld(true);
          const end = new T.Vector3();
          a.tip.getWorldPosition(end);
          const dir = new T.Vector2(dx, dz).normalize();
          const correction = new T.Vector3(
            to.x - dir.x * 0.08 - end.x,
            0,
            to.y - dir.y * 0.08 - end.z,
          );
          a.mixer.setTime(4.4 + progress);
          const k = Math.sin(Math.PI * progress);
          a.g.position.addScaledVector(correction, k);
          if (
            animation.lethal &&
            animation.advance !== false &&
            progress >= 0.5
          ) {
            const advance = Math.min(1, (progress - 0.5) / 0.5);
            a.g.position
              .set(from.x, 0.015, from.y)
              .addScaledVector(correction, 1 - advance)
              .addScaledVector(new T.Vector3(dx, 0, dz), advance);
            if (advance > 0.15) a.mixer.setTime(2.1 + advance * 1.5);
          }
        }
      } else {
        const distance = Math.hypot(dx, dz),
          travel = distance
            ? Math.min(1, Math.hypot(pos.x - from.x, pos.y - from.y) / distance)
            : 0;
        a.mode = animation.death === undefined ? "walk" : "death";
        a.walkPhase = 2.2 + (travel * Math.PI) / 5;
        a.mixer?.setTime(a.walkPhase);
        if (u.type === "catapult" && !u.boat)
          a.model.traverse((o) => {
            if (o.name.startsWith("Wheel")) {
              o.userData.restSpin ||= o.quaternion.clone();
              o.quaternion
                .copy(o.userData.restSpin)
                .multiply(
                  new T.Quaternion().setFromAxisAngle(
                    new T.Vector3(0, 1, 0),
                    travel * Math.PI * 2,
                  ),
                );
            }
          });
        if (u.boat) a.g.rotation.z = Math.sin(time * 2) * 0.025;
      }
      if (animation.death !== undefined) {
        const k = animation.death;
        a.model.rotation.x = (-k * Math.PI) / 2;
        a.model.traverse((o) => {
          if (o.isMesh) {
            o.material.transparent = true;
            o.material.opacity = 1 - Math.max(0, (k - 0.65) / 0.35);
          }
        });
      }
    } else if (u.boat) {
      a.g.position.y += Math.sin(time * 2 + u.x) * 0.015;
      a.g.rotation.z = Math.sin(time * 1.7) * 0.025;
    }
    if (
      defender &&
      (u.id !== undefined ? u.id === defender.id : u === defender) &&
      animation.lethal &&
      progress >= (animation.hitAt ?? 0.5)
    ) {
      const deathProgress =
        (progress - (animation.hitAt ?? 0.5)) / (1 - (animation.hitAt ?? 0.5));
      const fall = Math.min(1, deathProgress / 0.6);
      const from = animation.from ? unproject(animation.from) : animation.unit;
      a.g.rotation.y = Math.atan2(from.x - u.x, from.y - u.y);
      a.model.rotation.x = (-fall * Math.PI) / 2;
      a.g.position.y -= fall * 0.02;
      const opacity = 1 - Math.max(0, (deathProgress - 0.65) / 0.35);
      a.model.traverse((o) => {
        if (o.isMesh) {
          o.material.transparent = true;
          o.material.opacity = opacity;
        }
      });
    }
  }
  for (const a of actors.values()) {
    a.shadow.position.set(a.g.position.x, 0.003, a.g.position.z);
    a.shadow.visible = a.g.visible;
  }
  for (const [key, a] of actors)
    if (!keep.has(key)) {
      removeActor(a);
      actors.delete(key);
    }
  renderer.render(scene, camera);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(unitScene, camera);
  renderer.autoClear = true;
  if (renderer.domElement.parentElement !== canvas.parentElement) {
    renderer.domElement.setAttribute("aria-hidden", "true");
    Object.assign(renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    canvas.style.position = "relative";
    canvas.before(renderer.domElement);
  }
  const ctx = canvas.getContext("2d"),
    dpr = devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  sceneInfo.frames++;
  canvas.dataset.renderer = "webgl";
  canvas.dataset.unitModels = String(sceneInfo.models);
  canvas.dataset.unitModelSet = "animals";
  canvas.dataset.modelNations = JSON.stringify(Object.keys(templates));
  canvas.dataset.unitAnimations = JSON.stringify(
    [...actors.entries()].map(([id, a]) => ({
      id,
      mode: a.mode,
      phase: a.walkPhase,
      nation: a.key.split("|")[2],
      kind: a.key.split("|")[0],
      leg: a.model.getObjectByName("HipL")?.rotation.x ?? null,
      shield: a.model.getObjectByName("ShoulderL")?.rotation.x ?? null,
      x: a.g.position.x,
      z: a.g.position.z,
    })),
  );
  canvas.dataset.frames = String(sceneInfo.frames);
  canvas.dataset.fog = "clouds";
  canvas.dataset.visibleLighting = "daylight";
  sceneInfo.motion = {
    time,
    trees:
      [...tiles.values()]
        .flatMap((r) => r.trees)
        .slice(0, 1)
        .map((o) => o.rotation.z)[0] ?? null,
    animal:
      [...tiles.values()]
        .flatMap((r) => r.motion)
        .find((m) => m.kind === "deer")?.o.rotation.x ?? null,
    units:
      [...actors.values()].slice(0, 1).map((a) => a.model.position.y)[0] ??
      null,
  };
  canvas.dataset.motion = JSON.stringify(sceneInfo.motion);
  return true;
}
