export const project = (x, y) => ({ x: (x - y) * 30, y: (x + y) * 15 });
function poly(c, p, color) {
  c.beginPath();
  p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function diamond(c, x, y, col) {
  poly(
    c,
    [
      [x, y - 15],
      [x + 30, y],
      [x, y + 15],
      [x - 30, y],
    ],
    col,
  );
}
function block(c, x, y, w, d, h, col, left, right) {
  poly(
    c,
    [
      [x - w, y],
      [x, y - d],
      [x + w, y],
      [x, y + d],
    ],
    col,
  );
  poly(
    c,
    [
      [x - w, y],
      [x, y + d],
      [x, y + d + h],
      [x - w, y + h],
    ],
    left,
  );
  poly(
    c,
    [
      [x, y + d],
      [x + w, y],
      [x + w, y + h],
      [x, y + d + h],
    ],
    right,
  );
}
function tree(c, x, y, s = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  block(c, 0, -9, 2, 1, 11, "#b49c70", "#846e4d", "#5e5745");
  for (let i = 0; i < 3; i++) {
    const b = -5 - i * 8,
      w = 12 - i * 2;
    poly(
      c,
      [
        [0, b - 22],
        [-w, b],
        [0, b + 5],
      ],
      ["#69bd7c", "#79cd86", "#99db91"][i],
    );
    poly(
      c,
      [
        [0, b - 22],
        [0, b + 5],
        [w, b],
      ],
      ["#2f866a", "#399574", "#45a47a"][i],
    );
  }
  c.restore();
}
function mountain(c, x, y) {
  poly(
    c,
    [
      [x - 24, y + 4],
      [x, y - 43],
      [x + 4, y + 13],
    ],
    "#a3b8be",
  );
  poly(
    c,
    [
      [x, y - 43],
      [x + 24, y + 3],
      [x + 4, y + 13],
    ],
    "#718b9c",
  );
  poly(
    c,
    [
      [x, y - 43],
      [x - 10, y - 24],
      [x - 2, y - 29],
      [x + 4, y - 21],
      [x + 10, y - 26],
    ],
    "#f5f9ec",
  );
  poly(
    c,
    [
      [x - 26, y + 4],
      [x - 13, y - 18],
      [x - 3, y + 10],
    ],
    "#bacbc3",
  );
}
function house(c, x, y, city) {
  let team = city.owner,
    col = team === 0 ? "#62c6a4" : team === 1 ? "#ee8c7d" : "#d2b781";
  block(c, x, y - 11, 13, 7, 13, "#fff0cb", "#c3bd9c", "#8d9e91");
  poly(
    c,
    [
      [x - 15, y - 11],
      [x, y - 29],
      [x, y - 7],
    ],
    col,
  );
  poly(
    c,
    [
      [x, y - 29],
      [x + 15, y - 11],
      [x, y - 7],
    ],
    team === 1 ? "#b75b64" : team === 0 ? "#288d80" : "#99835e",
  );
  block(c, x - 3, y - 5, 3, 2, 7, "#61796d", "#526d61", "#48635a");
  if (city.level > 1)
    block(c, x + 15, y - 8, 6, 4, 13, "#f1e6c8", "#b3b497", "#859c93");
  c.strokeStyle = "#e8e7cd";
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(x + 14, y);
  c.lineTo(x + 14, y - 36);
  c.stroke();
  poly(
    c,
    [
      [x + 14, y - 36],
      [x + 28, y - 32],
      [x + 14, y - 27],
    ],
    team === 0 ? "#b3f5b6" : team === 1 ? "#ffa49a" : "#eddaa0",
  );
}
function resourceArt(c, x, y, kind) {
  if (kind === "game") {
    block(c, x, y - 5, 5, 3, 5, "#e0bf8d", "#b9966c", "#947955");
    block(c, x + 5, y - 11, 2, 2, 6, "#ebd4ae", "#bd9e75", "#9f8563");
    c.strokeStyle = "#d6b387";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x + 5, y - 11);
    c.lineTo(x + 4, y - 16);
    c.moveTo(x + 5, y - 13);
    c.lineTo(x + 8, y - 16);
    c.stroke();
  } else if (kind === "wood") {
    block(c, x, y - 4, 6, 3, 5, "#d4af79", "#a48150", "#825f3b");
    c.strokeStyle = "#f1d9aa";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y - 2);
    c.lineTo(x + 5, y - 4);
    c.stroke();
  } else if (kind === "grain") {
    c.strokeStyle = "#e6cb72";
    c.lineWidth = 1.5;
    for (const dx of [-3, 0, 3]) {
      c.beginPath();
      c.moveTo(x + dx, y + 2);
      c.lineTo(x + dx, y - 10 + Math.abs(dx));
      c.stroke();
      poly(
        c,
        [
          [x + dx, y - 9],
          [x + dx + 2, y - 6],
          [x + dx, y - 4],
          [x + dx - 2, y - 7],
        ],
        "#f4de89",
      );
    }
  } else if (kind === "fruit") {
    for (const [dx, dy] of [
      [-3, 0],
      [2, -1],
      [0, -4],
    ]) {
      c.fillStyle = "#eda36d";
      c.beginPath();
      c.arc(x + dx, y + dy, 2.5, 0, Math.PI * 2);
      c.fill();
    }
  } else if (kind === "fish") {
    poly(
      c,
      [
        [x - 6, y],
        [x, y - 3],
        [x + 4, y],
        [x, y + 3],
      ],
      "#b9eced",
    );
    poly(
      c,
      [
        [x + 3, y],
        [x + 7, y - 3],
        [x + 7, y + 3],
      ],
      "#91cbd7",
    );
  } else
    poly(
      c,
      [
        [x, y - 8],
        [x + 5, y],
        [x, y + 3],
        [x - 4, y],
      ],
      "#d3c1ed",
    );
}
function warrior(c, x, y, u) {
  if (u.type === "catapult") {
    block(c, x, y - 8, 12, 7, 8, "#c6a478", "#947b59", "#6b634c");
    for (const dx of [-10, 10]) {
      c.fillStyle = "#415462";
      c.beginPath();
      c.ellipse(x + dx, y + 5, 4, 6, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#dac498";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x - 6, y - 6);
    c.lineTo(x + 5, y - 30);
    c.stroke();
    poly(
      c,
      [
        [x - 1, y - 31],
        [x + 9, y - 34],
        [x + 12, y - 28],
        [x + 3, y - 25],
      ],
      "#747f85",
    );
    c.fillStyle = "#263f4e";
    c.fillRect(x - 11, y + 13, 22, 3);
    c.fillStyle = u.team === 0 ? "#acfac2" : "#ffa99c";
    c.fillRect(x - 11, y + 13, (22 * Math.max(0, u.hp)) / 8, 3);
    if (!u.acted) {
      c.fillStyle = "#fff0ae";
      c.beginPath();
      c.arc(x, y - 40, 2, 0, Math.PI * 2);
      c.fill();
    }
    return;
  }

  if (u.type === "rider" || u.type === "knight") {
    block(c, x, y - 2, 13, 6, 8, "#bd9971", "#8c735a", "#6b5b4b");
    for (const dx of [-9, 8])
      block(c, x + dx, y + 4, 2, 2, 8, "#bfa27a", "#675a49", "#534d44");
  }
  if (u.type === "guard")
    block(c, x - 8, y - 12, 8, 5, 13, "#d4e3de", "#87ada8", "#527f83");
  let color =
    u.type === "knight" ? "#d4bd7d" : u.team === 0 ? "#64d3b4" : "#f08e81";
  c.fillStyle = "#183c4b55";
  c.beginPath();
  c.ellipse(x, y + 3, 11, 4, 0, 0, Math.PI * 2);
  c.fill();
  for (let dx of [-4, 4])
    block(c, x + dx, y - 3, 3, 2, 6, "#c8d6d0", "#3e5962", "#263f4e");
  block(
    c,
    x,
    y - 16,
    8,
    4,
    13,
    color,
    u.team === 0 ? "#399a90" : "#b85e69",
    u.team === 0 ? "#227c7b" : "#8c485b",
  );
  block(c, x, y - 26, 6, 4, 9, "#ffe6b7", "#deb991", "#bc987e");
  block(c, x, y - 30, 8, 5, 5, "#f0f6ed", "#bfd4d2", "#8faeb6");
  poly(
    c,
    [
      [x - 8, y - 30],
      [x, y - 34],
      [x + 8, y - 30],
      [x, y - 27],
    ],
    color,
  );
  block(c, x - 9, y - 15, 4, 3, 10, "#e4d6a4", "#b59c6c", "#8b8b69");
  c.strokeStyle = "#edf8ff";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + 12, y - 8);
  c.lineTo(x + 12, y - 28);
  c.stroke();
  c.strokeStyle = "#c5b77d";
  c.beginPath();
  c.moveTo(x + 8, y - 13);
  c.lineTo(x + 16, y - 13);
  c.stroke();
  c.fillStyle = "#284958";
  c.fillRect(x - 11, y + 9, 22, 3);
  c.fillStyle = u.team === 0 ? "#acfac2" : "#ffa99c";
  c.fillRect(
    x - 11,
    y + 9,
    (22 * Math.max(0, u.hp)) /
      (u.type === "guard" || u.type === "knight" ? 15 : 10),
    3,
  );
  if (!u.acted) {
    c.fillStyle = "#fff0ae";
    c.beginPath();
    c.arc(x, y - 40, 2, 0, Math.PI * 2);
    c.fill();
  }
}
export function renderMap(
  canvas,
  {
    world,
    units,
    selected,
    zoom,
    pan,
    available,
    panelHeight = 0,
    animation = null,
    effects = [],
  },
) {
  let c = canvas.getContext("2d"),
    w = canvas.clientWidth,
    h = canvas.clientHeight,
    dpr = devicePixelRatio || 1;
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  let bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#193a54");
  bg.addColorStop(1, "#2e5e6a");
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  let scale = Math.max(0.2, Math.min((w - 50) / 720, (h - 130) / 360)) * zoom;
  let view = {
    scale,
    ox: w / 2 + pan.x,
    oy: (h - panelHeight - 330 * scale) / 2 + 40 + pan.y,
  };
  c.translate(view.ox, view.oy);
  c.scale(scale, scale);
  for (let y = -8; y < 20; y++)
    for (let x = -8; x < 20; x++)
      if ((x * 7 + y * 11) % 5 === 0) {
        let p = project(x, y);
        c.strokeStyle = "#a7cfdc20";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(p.x - 5, p.y);
        c.lineTo(p.x + 5, p.y);
        c.stroke();
      }
  let hit = [];
  for (let t of world.flat().sort((a, b) => a.x + a.y - (b.x + b.y))) {
    let p = project(t.x, t.y),
      fog = !t.seen,
      water = t.type === "water",
      y = p.y - (!fog && water ? 0 : 8),
      depth = fog ? 9 : water ? 3 : 11;
    poly(
      c,
      [
        [p.x - 30, y],
        [p.x, y + 15],
        [p.x, y + 15 + depth],
        [p.x - 30, y + depth],
      ],
      fog ? "#7a9fae" : water ? "#347f98" : "#568c72",
    );
    poly(
      c,
      [
        [p.x, y + 15],
        [p.x + 30, y],
        [p.x + 30, y + depth],
        [p.x, y + 15 + depth],
      ],
      fog ? "#6d93a6" : water ? "#2b708b" : "#3f7666",
    );
    diamond(
      c,
      p.x,
      y,
      fog
        ? "#a3c1cd"
        : water
          ? "#4c9db0"
          : t.type === "forest"
            ? "#73b48a"
            : t.type === "mountain"
              ? "#b0c5a1"
              : (t.x + t.y) % 3 === 0
                ? "#a2d2a0"
                : "#92c896",
    );
    if (fog)
      poly(
        c,
        [
          [p.x - 14, y - 3],
          [p.x - 2, y - 9],
          [p.x + 14, y - 2],
          [p.x + 2, y + 5],
        ],
        "#c1d7df88",
      );
    else if (water) {
      c.strokeStyle = "#b5e6e060";
      c.beginPath();
      c.moveTo(p.x - 7, y);
      c.lineTo(p.x + 2, y + 4);
      c.lineTo(p.x + 9, y + 1);
      c.stroke();
    } else {
      if (t.type === "forest") {
        tree(c, p.x - 9, y + 1, 0.7);
        tree(c, p.x + 8, y - 3, 0.9);
      }
      if (t.type === "mountain") mountain(c, p.x, y);
      if (t.city) house(c, p.x, y, t.city);
      if (t.type === "grass" && !t.city)
        poly(
          c,
          [
            [p.x + 8, y],
            [p.x + 10, y - 4],
            [p.x + 11, y + 2],
          ],
          "#68ac7d",
        );
    }
    if (!fog && t.road) {
      c.strokeStyle = "#e5d4a5";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(p.x - 23, y);
      c.lineTo(p.x + 23, y);
      c.moveTo(p.x, y - 11);
      c.lineTo(p.x, y + 11);
      c.stroke();
    }
    let a = available(t),
      sel = selected && selected.x === t.x && selected.y === t.y;
    if (a || sel) {
      if (a) diamond(c, p.x, y, a === "attack" ? "#ed504e99" : "#ffffff18");
      c.strokeStyle = sel ? "#fff3b2" : a === "attack" ? "#ff6560" : "#ffffff";
      c.lineWidth = sel ? 2.5 : 2.3;
      c.beginPath();
      c.moveTo(p.x, y - 15);
      c.lineTo(p.x + 30, y);
      c.lineTo(p.x, y + 15);
      c.lineTo(p.x - 30, y);
      c.closePath();
      c.stroke();
      if (a) {
        c.fillStyle = a === "attack" ? "#ffcfbc" : "#f0ffd9";
        c.beginPath();
        c.arc(p.x, y, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    let u = t.seen && units.find((u) => u.x === t.x && u.y === t.y);
    if (u && animation?.unit !== u) warrior(c, p.x, y - 3, u);
    if (!fog && t.resource && !t.city) {
      const colors = {
        fruit: "#f3aa74",
        game: "#dbb992",
        fish: "#afe2e8",
        ore: "#d7c2f0",
        wood: "#cfa679",
        grain: "#f4d083",
      };
      const rx = p.x + 15,
        ry = y + 4;
      if (!t.developed) resourceArt(c, rx, ry, t.resource);
      else
        poly(
          c,
          [
            [rx, ry - 5],
            [rx + 4, ry],
            [rx, ry + 4],
            [rx - 4, ry],
          ],
          "#e6d39e",
        );
      if (t.developed) {
        c.strokeStyle = "#a5cb8b";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(rx - 3, ry);
        c.lineTo(rx, ry + 3);
        c.lineTo(rx + 5, ry - 4);
        c.stroke();
      }
    }
    hit.push({
      t,
      x: p.x,
      y,
      unit: !!u,
      available: a,
      feature:
        !fog && !water
          ? t.city
            ? 36
            : t.type === "mountain"
              ? 43
              : t.type === "forest"
                ? 40
                : 0
          : 0,
    });
  }
  if (animation && world[animation.unit.y]?.[animation.unit.x]?.seen) {
    const p = animation.position;
    warrior(c, p.x, p.y - 11, animation.unit);
  }
  if (animation?.projectile) {
    const { from, to, progress: k } = animation.projectile;
    c.fillStyle = "#354b5f";
    c.beginPath();
    c.arc(
      from.x + (to.x - from.x) * k,
      from.y + (to.y - from.y) * k - 30 - Math.sin(Math.PI * k) * 65,
      4,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  for (const effect of effects) {
    if (!world[effect.y]?.[effect.x]?.seen) continue;
    const p = project(effect.x, effect.y),
      k = effect.progress;
    c.save();
    c.globalAlpha = 1 - k;
    c.fillStyle = effect.color || "#ffb3a3";
    c.font = "bold 14px sans-serif";
    c.textAlign = "center";
    c.fillText(effect.text, p.x, p.y - 44 - k * 25);
    c.strokeStyle = effect.color || "#ffd9ad";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(p.x, p.y - 6, 8 + k * 20, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ...view, hit };
}
export function pickTile(view, x, y) {
  if (!view) return null;
  const px = (x - view.ox) / view.scale,
    py = (y - view.oy) / view.scale;
  const ground = view.hit
    .filter((p) => Math.abs(px - p.x) / 30 + Math.abs(py - p.y) / 15 <= 1)
    .at(-1);
  // Ground and actionable tiles win over a neighbouring unit's tall sprite hitbox.
  if (ground && (ground.available || ground.unit)) return ground.t;
  return (
    view.hit
      .filter(
        (p) =>
          p.unit && Math.abs(px - p.x) < 14 && py > p.y - 43 && py < p.y + 8,
      )
      .sort(
        (a, b) =>
          Math.hypot(px - a.x, py - a.y + 20) -
          Math.hypot(px - b.x, py - b.y + 20),
      )[0]?.t ||
    ground?.t ||
    null
  );
}
