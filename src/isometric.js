import {renderScene} from './scene.js';
import { cityForTile, growthRequired } from "./rules.js";
import { drawCity, drawUnit } from "./visuals.js";
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
  c.scale(s * 0.78, s * 0.78);
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
  c.save(); c.translate(x, y); c.scale(.72, .72); x = 0; y = 0;
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
  c.restore();
}
function resourceArt(c, x, y, kind) {
  if (kind === "game") {
    block(c, x, y - 5, 5, 3, 5, "#e0bf8d", "#b9966c", "#947955");
    block(c, x + 5, y - 11, 2, 2, 6, "#ebd4ae", "#bd9e75", "#9f8563");
    c.strokeStyle = "#d6b387";
    for (const dx of [-3, 3]) {
      c.strokeStyle = "#785a3e";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x + dx, y - 1);
      c.lineTo(x + dx, y + 4);
      c.stroke();
    }
    c.lineWidth = 1.5;
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
function legacyMap(
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
    growthEffects = [],
    night = false,
    nation,
    enemyNation,
    teamNations = null,
    allies = [],
    showIdleUnit = false,
    combatPreview = null,
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
  bg.addColorStop(0, night ? "#0e192e" : "#2b485d");
  bg.addColorStop(1, night ? "#182a43" : "#436476");
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  const territoryCities = new Map(
    world
      .flat()
      .filter((t) => t.city)
      .map((t) => [`${t.x},${t.y}`, t]),
  );
  const territoryOwner = (t) =>
    Object.hasOwn(t, "territory")
      ? territoryCities.get(t.territory)
      : cityForTile(world, t);
  let scale =
    Math.max(
      0.2,
      Math.min((w - 50) / (world.length * 60), (h - 130) / (world.length * 30)),
    ) * zoom;
  const margin = Math.min(120, w * 0.2);
  const panLimits = {
    x: Math.max(margin, world.length * 30 * scale - w / 2 + margin),
    y: Math.max(margin, world.length * 15 * scale - (h - panelHeight) / 2 + margin),
  };
  pan.x = Math.max(-panLimits.x, Math.min(panLimits.x, pan.x));
  pan.y = Math.max(-panLimits.y, Math.min(panLimits.y, pan.y));
  const cornerRatio = Math.abs(pan.x) / Math.max(margin, world.length * 30 * scale)
    + Math.abs(pan.y) / Math.max(margin, world.length * 15 * scale);
  if (cornerRatio > 1) { pan.x /= cornerRatio; pan.y /= cornerRatio; }
  let view = {
    scale,
    ox: w / 2 + pan.x,
    oy: (h - panelHeight - (world.length - 1) * 30 * scale) / 2 + 40 + pan.y,
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
      fog ? "#293c50" : water ? "#347f98" : "#568c72",
    );
    poly(
      c,
      [
        [p.x, y + 15],
        [p.x + 30, y],
        [p.x + 30, y + depth],
        [p.x, y + 15 + depth],
      ],
      fog ? "#24384c" : water ? "#2b708b" : "#3f7666",
    );
    diamond(
      c,
      p.x,
      y,
      fog
        ? "#405468"
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
        "#596c7e44",
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
      if (t.city)
        drawCity(
          c,
          p.x,
          y,
          t.city,
          teamNations?.[t.city.owner] ||
            (t.city.owner === 0 ? nation : enemyNation),
        );
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
    if (t.seen) {
      const owner = territoryOwner(t);
      if (owner?.city.owner >= 0) {
        const team = owner.city.owner,
          color =
            (teamNations?.[team] || (team === 0 ? nation : enemyNation))
              ?.color || (team === 0 ? "#a6e9b2" : "#ed9292");
        diamond(c, p.x, y, color + "20");
        c.strokeStyle = color;
        c.lineWidth = 1.8;
        for (const [dx, dy, a, b] of [
          [1, 0, [30, 0], [0, 15]],
          [-1, 0, [-30, 0], [0, -15]],
          [0, 1, [-30, 0], [0, 15]],
          [0, -1, [0, -15], [30, 0]],
        ]) {
          const neighbour = world[t.y + dy]?.[t.x + dx];
          if (neighbour?.seen && territoryOwner(neighbour) === owner) continue;
          c.beginPath();
          c.moveTo(p.x + a[0], y + a[1]);
          c.lineTo(p.x + b[0], y + b[1]);
          c.stroke();
        }
      }
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
    if (t.seen && !(t.visible ?? t.seen))
      diamond(c, p.x, y, night ? "#0b183b99" : "#132b4266");
    let u =
      (t.visible ?? t.seen) && units.find((u) => u.x === t.x && u.y === t.y);
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
              ? 31
              : t.type === "forest"
                ? 31
                : 0
          : 0,
    });
  }
  // Resource sprites and ownership labels are a foreground pass: trees and adjacent tiles cannot hide them.
  for (const t of world.flat()) {
    if (!t.seen) continue;
    const p = project(t.x, t.y),
      y = p.y - (t.type === "water" ? 0 : 8);
    if (t.resource && !t.city) {
      const rx = p.x + 17,
        ry = y + 5;
      c.fillStyle = "#173b4666";
      c.beginPath();
      c.ellipse(rx, ry, 7, 4, 0, 0, Math.PI * 2);
      c.fill();
      if (!t.developed) {
        c.globalAlpha = (t.visible ?? t.seen) ? 1 : 0.3;
        c.save();
        c.translate(rx, ry);
        c.scale(0.9, 0.9);
        resourceArt(c, 0, 0, t.resource);
        c.restore();
        c.globalAlpha = 1;
      } else if (t.resource === "ore") {
        // A built mine stays visible on the mountain, rather than a harvest checkmark.
        block(c, rx, ry - 6, 8, 5, 9, "#bda67b", "#806b52", "#66564b");
        c.fillStyle = "#23323b"; c.fillRect(rx - 3, ry - 6, 6, 9);
        c.strokeStyle = "#cfb27c"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(rx - 3, ry + 7); c.lineTo(rx - 2, ry + 1);
        c.moveTo(rx + 3, ry + 7); c.lineTo(rx + 2, ry + 1); c.stroke();
      }
    }
    if(t.building) {
      c.save();c.globalAlpha=(t.visible??t.seen)?1:.4;
      if(t.building==="smelter") {
        block(c,p.x,y-9,13,8,12,"#ae8571","#76584d","#614e47");
        block(c,p.x+6,y-23,4,3,24,"#998e86","#746960","#5c5550");
        c.fillStyle="#ffbe6c";c.fillRect(p.x-6,y-5,7,8);
        c.fillStyle="#bfc9c0aa";c.beginPath();c.arc(p.x+7,y-32,4,0,Math.PI*2);c.fill();
      }else{
        block(c,p.x,y-5,11,7,7,"#d3c5a1","#9e9278","#7d796a");
        block(c,p.x,y-13,6,4,10,"#c3b99c","#978e78","#787b70");
        c.fillStyle=t.building==="seaStatue"?"#79c8c1":"#d9b971";
        c.font="bold 22px sans-serif";c.textAlign="center";c.fillText(t.building==="seaStatue"?"⚓":"⚔",p.x,y-18);
      }
      c.restore();
    }
    if (t.city) {
      const owner = t.city.owner;
      if (owner === 0) {
        const required = growthRequired(t.city), ratio = Math.min(1, (t.city.experience || 0) / required);
        c.fillStyle = "#123e43ed"; c.fillRect(p.x - 28, y + 15, 56, 14);
        c.fillStyle = "#3d6264"; c.fillRect(p.x - 24, y + 20, 32, 4);
        c.fillStyle = "#ecd58a"; c.fillRect(p.x - 24, y + 20, 32 * ratio, 4);
        c.fillStyle = "#ffffff"; c.font = "bold 7px sans-serif"; c.textAlign = "left";
        c.fillText(`Lv.${t.city.level}`, p.x + 11, y + 25);
      } else {
        const label = allies.includes(owner) ? "동맹 도시" : owner > 0 ? "⚔ 적 도시" : "◇ 중립 마을";
        c.fillStyle = allies.includes(owner) ? "#315c64ed" : owner > 0 ? "#743a48ed" : "#f4e4bbf5";
        c.fillRect(p.x - 25, y + 15, 50, 12);
        c.fillStyle = owner === -1 ? "#5d503c" : "#ffffff";
        c.font = "bold 7px sans-serif"; c.textAlign = "center";
        c.fillText(label, p.x, y + 24);
      }
    }
  }
  // Units are foreground objects, above city XP labels and resource markers.
  for (const u of [...units].sort((a,b) => a.x+a.y-b.x-b.y)) {
    if (!(world[u.y]?.[u.x]?.visible ?? world[u.y]?.[u.x]?.seen)) continue;
    if (animation?.unit === u || (u.id !== undefined && animation?.unit?.id === u.id)) continue;
    const p = project(u.x,u.y), t = world[u.y][u.x];
    drawUnit(c,p.x,p.y-(t.type === "water"?3:11),u,teamNations?.[u.team] || (u.team === 0?nation:enemyNation),night);
  }
  // Only one untouched friendly unit receives a reminder at a time.
  const idleUnit = showIdleUnit && units.find(u =>
    u.team === 0 && u.hp > 0 && !u.acted && !u.moved && !u.attacked &&
    (world[u.y]?.[u.x]?.visible ?? world[u.y]?.[u.x]?.seen));
  if (idleUnit) {
    const p = project(idleUnit.x, idleUnit.y);
    const x = p.x + 13, y = p.y - (idleUnit.type === "catapult" || idleUnit.type === "giant" ? 62 : 48);
    c.save();
    c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2);
    c.fillStyle = "#ffe28a"; c.fill();
    c.strokeStyle = "#725522"; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = "#493619"; c.font = "bold 11px sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", x, y + .5);
    c.restore();
  }
  if (
    animation &&
    (world[animation.unit.y]?.[animation.unit.x]?.visible ??
      world[animation.unit.y]?.[animation.unit.x]?.seen)
  ) {
    const p = animation.position;
    drawUnit(
      c,
      p.x,
      p.y - 11,
      animation.unit,
      teamNations?.[animation.unit.team] ||
        (animation.unit.team === 0 ? nation : enemyNation),
      night,
      animation.pose,
    );
  }
  const forecastLabels = [];
  if (combatPreview) {
    c.save(); c.setTransform(dpr,0,0,dpr,0,0);
    c.font = "bold 13px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    for (const [u, damage, lethal, enemy] of [
      [combatPreview.attacker, combatPreview.counter, combatPreview.attackerDies, false],
      [combatPreview.defender, combatPreview.damage, combatPreview.defenderDies, true],
    ]) {
      const p=project(u.x,u.y), text=`−${damage} 피해${lethal ? (enemy ? " · ☠ 처치" : " · ☠ 전사") : ""}`;
      const width=c.measureText(text).width+18, height=26;
      const x=Math.max(width/2+4,Math.min(w-width/2-4,view.ox+p.x*scale));
      let y=Math.max(18,view.oy+(p.y-(u.type==="giant"||u.type==="catapult"?86:65))*scale);
      if (forecastLabels.some(l=>Math.abs(l.x-x)<(l.width+width)/2+4&&Math.abs(l.y-y)<height+4)) y=forecastLabels[0].y-height-6>=18?forecastLabels[0].y-height-6:forecastLabels[0].y+height+6;
      c.fillStyle=lethal?"#8c2535f5":enemy?"#803c3af5":"#214b61f5";
      c.fillRect(x-width/2,y-height/2,width,height);
      c.strokeStyle=lethal?"#ffb49c":"#eadca4";c.lineWidth=1.5;c.strokeRect(x-width/2,y-height/2,width,height);
      c.fillStyle="#fff5dc";c.fillText(text,x,y+.5);
      forecastLabels.push({text,x,y,width});
    }
    c.restore();
  }
  if (animation?.projectile) {
    const { from, to, progress: k } = animation.projectile;
    const x = from.x + (to.x - from.x) * k,
      y =
        from.y +
        (to.y - from.y) * k -
        30 -
        Math.sin(Math.PI * k) * (animation.projectile.arrow ? 15 : 65);
    if (animation.projectile.arrow) {
      c.save();
      c.translate(x, y);
      c.rotate(Math.atan2(to.y - from.y - Math.PI * 15 * Math.cos(Math.PI*k), to.x - from.x));
      c.strokeStyle = "#f6e6ba";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-8, 0);
      c.lineTo(7, 0);
      c.stroke();
      poly(
        c,
        [
          [8, 0],
          [3, -3],
          [3, 3],
        ],
        "#edf8ff",
      );
      c.restore();
    } else {
      c.save(); c.translate(x, y); c.rotate(k * Math.PI * 3);
      c.shadowColor = "#102a45aa"; c.shadowBlur = 6;
      poly(c, [[-7,-4],[-2,-8],[6,-5],[8,2],[2,7],[-6,5]], "#4b5869");
      poly(c, [[-7,-4],[-2,-8],[6,-5],[1,0]], "#99a6ae");
      c.restore();
    }
  }

  if (animation?.impact) {
    const {to, progress:k, arrow} = animation.impact;
    c.save(); c.globalAlpha=1-k; c.strokeStyle=arrow?"#fff1b0":"#d7c8a7"; c.lineWidth=2;
    c.beginPath(); c.ellipse(to.x,to.y-10,5+k*20,3+k*10,0,0,Math.PI*2); c.stroke();
    for(let i=0;i<8;i++){const a=i*Math.PI/4; c.fillStyle=arrow?"#ffe9a1":"#9f9c8c"; c.fillRect(to.x+Math.cos(a)*k*24,to.y-14+Math.sin(a)*k*16-k*10,3,3);}
    c.restore();
  }
  for (const effect of growthEffects) {
    if (!world[effect.y]?.[effect.x]?.visible) continue;
    const p = project(effect.x, effect.y), k = Math.min(1, effect.progress);
    c.save();
    c.globalAlpha = Math.sin(Math.PI * k);
    c.strokeStyle = "#ffe99b";
    c.lineWidth = 3;
    c.beginPath(); c.ellipse(p.x, p.y, 22 + k * 25, 10 + k * 12, 0, 0, Math.PI*2); c.stroke();
    c.fillStyle = "#fff2aa";
    for (let i=0; i<12; i++) {
      const a=i*Math.PI/6, r=12+k*45;
      c.fillRect(p.x+Math.cos(a)*r-2, p.y-30+Math.sin(a)*r*.65-k*25, 4, 4);
    }
    c.font = "bold 17px sans-serif"; c.textAlign="center";
    c.strokeStyle="#634d29"; c.lineWidth=3;
    c.strokeText(`✦ LEVEL ${effect.level}`, p.x, p.y-68-k*18);
    c.fillText(`✦ LEVEL ${effect.level}`, p.x, p.y-68-k*18);
    c.restore();
  }
  for (const effect of effects) {
    if (!(
      world[effect.y]?.[effect.x]?.visible ?? world[effect.y]?.[effect.x]?.seen
    ))
      continue;
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
  return { ...view, hit, selected, panLimits, forecastLabels, idleUnit: idleUnit || null };
}
export function pickTile(view, x, y) {
  if (!view) return null;
  const px = (x - view.ox) / view.scale,
    py = (y - view.oy) / view.scale;
  const selectedUnit = view.hit.find(p => p.unit && p.t.x === view.selected?.x && p.t.y === view.selected?.y && Math.abs(px-p.x)<10 && py>p.y-32 && py<p.y+8);
  if (selectedUnit) return selectedUnit.t;
  const ground = view.hit
    .filter((p) => Math.abs(px - p.x) / 30 + Math.abs(py - p.y) / 15 <= 1)
    .at(-1);
  // Ground and actionable tiles win over a neighbouring unit's tall sprite hitbox.
  if (ground && (ground.available || ground.unit)) return ground.t;
  return (
    view.hit
      .filter(
        (p) =>
          p.unit && Math.abs(px - p.x) < 10 && py > p.y - 32 && py < p.y + 8,
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

// Preserve the proven camera/hit testing while using the animated 3D world renderer.
let lastLayout=null,lastInput=null;
export function renderMap(canvas,options){
 const {world,units,selected,zoom,pan,animation,combatPreview}=options;
 const key=[canvas.clientWidth,canvas.clientHeight,zoom,pan.x,pan.y,selected?.x,selected?.y,options.night,options.panelHeight,options.showIdleUnit,
 world.flat().map(t=>[t.type,t.seen,t.visible,t.city?.level,t.city?.owner,t.city?.experience].join(':')).join(','),
 units.map(u=>[u.id,u.x,u.y,u.hp,u.acted,u.moved,u.attacked].join(':')).join(','),combatPreview?.damage,combatPreview?.counter,combatPreview?.defender?.x,combatPreview?.defender?.y].join('|');
 let view;
 if(lastInput===key&&lastLayout?.world===world&&lastLayout.canvas===canvas)view=lastLayout.view;
 else {view=legacyMap(canvas,options);lastInput=key;lastLayout={world,canvas,view};}
 if(!renderScene(canvas,options,view))return legacyMap(canvas,options);
 for(const hit of view.hit)hit.y=project(hit.t.x,hit.t.y).y;
 const c=canvas.getContext('2d'),dpr=devicePixelRatio||1;
 c.setTransform(dpr,0,0,dpr,0,0);c.save();c.translate(view.ox,view.oy);c.scale(view.scale,view.scale);
 const ownership=new Map(world.flat().filter(t=>t.city).map(t=>[t.x+','+t.y,t.city.owner]));
 for(const hit of view.hit){const t=hit.t,p=project(t.x,t.y);if(!t.seen)continue;
  if(t.territory&&ownership.get(t.territory)!==undefined){const owner=ownership.get(t.territory);if(owner>=0){c.strokeStyle=owner===0?'#bdd5a0':'#d68b87';c.lineWidth=1.3;for(const [dx,dy,edge]of [[-1,0,[[-30,0],[0,-15]]],[0,-1,[[0,-15],[30,0]]],[1,0,[[30,0],[0,15]]],[0,1,[[0,15],[-30,0]]]]){const n=world[t.y+dy]?.[t.x+dx];if(n?.seen&&ownership.get(n.territory)===owner)continue;c.beginPath();c.moveTo(p.x+edge[0][0],p.y+edge[0][1]);c.lineTo(p.x+edge[1][0],p.y+edge[1][1]);c.stroke();}}}
  const a=options.available(t),sel=selected&&selected.x===t.x&&selected.y===t.y;
  if(a||sel){if(a==='attack')diamond(c,p.x,p.y,'#b54e4b55');c.strokeStyle=sel?'#f4e4ad':a==='attack'?'#df6863':'#f6f5e6';c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y-15);c.lineTo(p.x+30,p.y);c.lineTo(p.x,p.y+15);c.lineTo(p.x-30,p.y);c.closePath();c.stroke();}
  if(t.city){if(t.city.owner===0){const ratio=Math.min(1,(t.city.experience||0)/growthRequired(t.city));c.fillStyle='#264749ed';c.fillRect(p.x-25,p.y+8,50,11);c.fillStyle='#627f73';c.fillRect(p.x-21,p.y+12,26,3);c.fillStyle='#dfd39c';c.fillRect(p.x-21,p.y+12,26*ratio,3);c.fillStyle='#f4f3e3';c.font='bold 7px sans-serif';c.textAlign='left';c.fillText('Lv.'+t.city.level,p.x+8,p.y+16);}else{c.font='bold 7px sans-serif';c.textAlign='center';const label=t.city.owner===-1?'◇ 중립 마을':options.allies?.includes(t.city.owner)?'동맹 도시':'⚔ 적 도시';c.fillStyle=t.city.owner===-1?'#e6dfc4':'#774d54';c.fillRect(p.x-25,p.y+8,50,11);c.fillStyle=t.city.owner===-1?'#5c604d':'#f0eddf';c.fillText(label,p.x,p.y+16);}}
 }
 // Screen-facing health stays readable and above city level bars.
 for(const u of units){if(!(world[u.y]?.[u.x]?.visible??world[u.y]?.[u.x]?.seen))continue;let p=project(u.x,u.y);const active=animation&&(u.id!==undefined?u.id===animation.unit.id:u===animation.unit);if(active)p=animation.position;const height=u.boat?40:u.type==='giant'?57:u.type==='rider'?52:40;c.font='bold 8px sans-serif';c.textAlign='center';c.lineWidth=2;c.strokeStyle='#2d4d50';c.strokeText(String(u.hp),p.x,p.y-height);c.fillStyle='#f5f4e6';c.fillText(String(u.hp),p.x,p.y-height);}
 if(view.idleUnit){const p=project(view.idleUnit.x,view.idleUnit.y);c.fillStyle='#e9d9a1';c.beginPath();c.arc(p.x+10,p.y-34,5,0,Math.PI*2);c.fill();c.fillStyle='#4b5b4d';c.font='bold 8px sans-serif';c.textAlign='center';c.fillText('!',p.x+10,p.y-31);}
 if(animation?.projectile){const {from,to,progress:p,arrow}=animation.projectile;const x=from.x+(to.x-from.x)*p,y=from.y+(to.y-from.y)*p-25-Math.sin(p*Math.PI)*(arrow?15:65);if(arrow){c.save();c.translate(x,y);c.rotate(Math.atan2(to.y-from.y-Math.PI*15*Math.cos(Math.PI*p),to.x-from.x));c.strokeStyle='#ecdfb7';c.lineWidth=1.7;c.beginPath();c.moveTo(-7,0);c.lineTo(7,0);c.stroke();poly(c,[[8,0],[3,-3],[3,3]],'#cfdad3');c.restore();}else{c.fillStyle='#9da99e';c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();}}
 for(const e of options.growthEffects||[]){const p=project(e.x,e.y),k=e.progress;if(!world[e.y]?.[e.x]?.visible)continue;c.save();c.globalAlpha=Math.sin(Math.PI*k);c.strokeStyle='#e9d799';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,20+k*25,10+k*13,0,0,Math.PI*2);c.stroke();c.font='bold 14px sans-serif';c.fillStyle='#f2e5b7';c.textAlign='center';c.fillText('LEVEL '+e.level,p.x,p.y-50-k*20);c.restore();}
 for(const e of options.effects||[]){const p=project(e.x,e.y);c.save();c.globalAlpha=1-e.progress;c.fillStyle=e.color||'#eeb6a1';c.strokeStyle='#3d4f4a';c.lineWidth=2;c.font='bold 13px sans-serif';c.textAlign='center';c.strokeText(e.text,p.x,p.y-44-e.progress*25);c.fillText(e.text,p.x,p.y-44-e.progress*25);c.restore();}
 c.restore();
 for(const l of view.forecastLabels||[]){c.fillStyle='#334c50f5';c.fillRect(l.x-l.width/2,l.y-13,l.width,26);c.strokeStyle='#dacb99';c.strokeRect(l.x-l.width/2,l.y-13,l.width,26);c.fillStyle='#f6f0db';c.font='bold 13px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(l.text,l.x,l.y);}
 c.textBaseline='alphabetic';return view;
}
