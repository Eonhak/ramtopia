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
function warrior(c, x, y, u) {
  let color = u.team === 0 ? "#64d3b4" : "#f08e81";
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
  c.fillRect(x - 11, y + 9, (22 * u.hp) / 10, 3);
  if (!u.acted) {
    c.fillStyle = "#fff0ae";
    c.beginPath();
    c.arc(x, y - 40, 2, 0, Math.PI * 2);
    c.fill();
  }
}
export function renderMap(
  canvas,
  { world, units, selected, zoom, pan, available, panelHeight = 0 },
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
    if (u) warrior(c, p.x, y - 3, u);
    hit.push({
      t,
      x: p.x,
      y,
      unit: !!u,
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
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ...view, hit };
}
export function pickTile(view, x, y) {
  if (!view) return null;
  let px = (x - view.ox) / view.scale,
    py = (y - view.oy) / view.scale;
  for (let i = view.hit.length - 1; i >= 0; i--) {
    let p = view.hit[i];
    if (p.unit && Math.abs(px - p.x) < 14 && py > p.y - 43 && py < p.y + 8)
      return p.t;
    if (Math.abs(px - p.x) / 30 + Math.abs(py - p.y) / 15 <= 1) return p.t;
  }
  return null;
}
