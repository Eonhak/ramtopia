import { combatStats } from "./rules.js";
const THEMES = {
  rome: {
    cloth: "#b94e57",
    trim: "#efcd89",
    stone: "#eee2c9",
    roof: "#b45d53",
    dark: "#663d4d",
  },
  goguryeo: {
    cloth: "#416984",
    trim: "#ddc497",
    stone: "#bbc9c2",
    roof: "#355c61",
    dark: "#253e52",
  },
  egypt: {
    cloth: "#f0e4c9",
    trim: "#d6ac5a",
    stone: "#e5c38a",
    roof: "#c89e57",
    dark: "#3b7a92",
  },
  persia: {
    cloth: "#8a6ba7",
    trim: "#e0bc7a",
    stone: "#dbd0ca",
    roof: "#56a9a3",
    dark: "#534369",
  },
  han: {
    cloth: "#af5646",
    trim: "#e4c984",
    stone: "#d5c8ab",
    roof: "#577e67",
    dark: "#574239",
  },
  greece: {
    cloth: "#5d9eac",
    trim: "#e5d4a0",
    stone: "#f1ecdb",
    roof: "#6b98a3",
    dark: "#3d5a72",
  },
  mongol: {
    cloth: "#776854",
    trim: "#d3bd91",
    stone: "#ede6cf",
    roof: "#a05a45",
    dark: "#3b524c",
  },
  maurya: {
    cloth: "#c08b4e",
    trim: "#e3c67e",
    stone: "#d8bd8b",
    roof: "#719378",
    dark: "#4d624c",
  },
};
function p(c, points, fill) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function line(c, points, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}
function wall(c, x, y, w, h, t) {
  p(
    c,
    [
      [x - w, y],
      [x, y + 6],
      [x + w, y],
      [x + w, y - h],
      [x, y - h + 6],
      [x - w, y - h],
    ],
    t.stone,
  );
  p(
    c,
    [
      [x, y + 6],
      [x + w, y],
      [x + w, y - h],
      [x, y - h + 6],
    ],
    "#294a4e30",
  );
}
function roof(c, x, y, w, h, color, curve = false) {
  p(
    c,
    [
      [x - w - (curve ? 4 : 0), y],
      [x - w * 0.55, y - 3],
      [x, y - h],
      [x + w * 0.55, y - 3],
      [x + w + (curve ? 4 : 0), y],
      [x, y + 6],
    ],
    color,
  );
  line(
    c,
    [
      [x - w, y],
      [x, y + 6],
      [x + w, y],
    ],
    "#152f4226",
    1,
  );
}
export function drawCity(c, x, y, city, nation) {
  const t = THEMES[nation?.id] || THEMES.rome,
    id = nation?.id;
  c.save();
  c.translate(x, y);
  ellipse(c, 0, 5, 23, 9, "#183d4650");
  p(
    c,
    [
      [-23, 2],
      [0, -10],
      [24, 2],
      [0, 14],
    ],
    city.owner === -1 ? "#c4b58b" : "#c3cab2",
  );
  if (city.owner === -1) {
    wall(c, -5, 2, 10, 12, { stone: "#cfbb91" });
    roof(c, -5, -10, 13, 12, "#8d7660");
    wall(c, 11, 5, 5, 7, { stone: "#d4c5a2" });
    ellipse(c, 0, -27, 6, 6, "#f4e7c8");
    c.fillStyle = "#776044";
    c.font = "bold 8px sans-serif";
    c.textAlign = "center";
    c.fillText("?", 0, -24);
    c.restore();
    return;
  }
  if (id === "egypt") {
    wall(c, 0, 0, 17, 17, t);
    p(
      c,
      [
        [-18, -14],
        [0, -48],
        [18, -14],
        [0, -6],
      ],
      "#e1bd7c",
    );
    p(
      c,
      [
        [0, -48],
        [18, -14],
        [0, -6],
      ],
      "#b99053",
    );
    wall(c, -17, 5, 5, 17, t);
    wall(c, 17, 5, 5, 17, t);
    line(
      c,
      [
        [-15, -9],
        [-15, 0],
      ],
      "#a77e49",
      2,
    );
  } else if (id === "mongol") {
    for (const [dx, dy, s] of [
      [-12, 0, 0.65],
      [11, 3, 0.7],
      [0, -6, 1],
    ]) {
      c.save();
      c.translate(dx, dy);
      c.scale(s, s);
      ellipse(c, 0, -2, 14, 7, t.stone);
      p(
        c,
        [
          [-14, -3],
          [-12, -15],
          [0, -27],
          [12, -15],
          [14, -3],
          [0, 3],
        ],
        "#f1e8ce",
      );
      p(
        c,
        [
          [0, -27],
          [12, -15],
          [14, -3],
          [0, 3],
        ],
        "#d4ccb6",
      );
      ellipse(c, 0, -20, 5, 2, t.roof);
      p(
        c,
        [
          [-3, 0],
          [-3, -10],
          [3, -11],
          [3, 1],
        ],
        "#695440",
      );
      c.restore();
    }
  } else if (id === "greece" || id === "rome") {
    wall(c, 0, 1, 18, 9, t);
    for (const dx of [-13, -5, 5, 13]) {
      wall(c, dx, -8, 2.3, 15, t);
      ellipse(c, dx, -23, 3, 1.5, "#fff3dd");
    }
    roof(c, 0, -25, 22, 12, t.roof);
    p(
      c,
      [
        [-12, -24],
        [0, -31],
        [12, -24],
        [0, -20],
      ],
      "#e6d7b9",
    );
    if (id === "rome") {
      wall(c, -19, 6, 5, 20, t);
      wall(c, 19, 6, 5, 20, t);
      roof(c, -19, -14, 6, 5, t.roof);
      roof(c, 19, -14, 6, 5, t.roof);
    }
  } else if (id === "goguryeo" || id === "han") {
    wall(c, 0, 2, 19, 13, t);
    for (const dx of [-12, -4, 4, 12])
      line(
        c,
        [
          [dx, -10],
          [dx, -21],
        ],
        id === "han" ? "#a94c42" : "#7d6553",
        2,
      );
    roof(c, 0, -22, 23, 12, t.roof, true);
    wall(c, 0, -25, 9, 7, t);
    roof(c, 0, -34, 15, 9, t.roof, true);
    line(
      c,
      [
        [-23, -21],
        [0, -16],
        [23, -21],
      ],
      t.trim,
      0.8,
    );
    if (id === "goguryeo") {
      wall(c, -20, 6, 4, 11, t);
      wall(c, 20, 6, 4, 11, t);
    }
  } else if (id === "persia") {
    wall(c, 0, 1, 17, 23, t);
    ellipse(c, 0, -24, 13, 5, t.roof);
    p(
      c,
      [
        [-13, -25],
        [-9, -37],
        [0, -45],
        [9, -37],
        [13, -25],
      ],
      t.roof,
    );
    line(
      c,
      [
        [0, -45],
        [0, -51],
      ],
      t.trim,
      1.5,
    );
    p(
      c,
      [
        [-5, 4],
        [-5, -12],
        [0, -18],
        [5, -12],
        [5, 4],
      ],
      t.dark,
    );
    for (const dx of [-19, 19]) wall(c, dx, 3, 3, 25, t);
  } else {
    wall(c, 0, 2, 19, 14, t);
    ellipse(c, 0, -17, 15, 7, t.roof);
    c.fillStyle = t.roof;
    c.beginPath();
    c.arc(0, -18, 15, Math.PI, 0);
    c.fill();
    wall(c, 0, -32, 4, 4, t);
    line(
      c,
      [
        [0, -36],
        [0, -44],
      ],
      t.trim,
      2,
    );
    for (const dx of [-18, 18]) {
      wall(c, dx, 5, 3, 21, t);
      ellipse(c, dx, -17, 4, 2, t.trim);
    }
  }
  if (city.level >= 2) {
    for (const dx of [-22, 22]) wall(c, dx, 9, 4, 5, t);
  }
  if (city.level >= 3) ellipse(c, 0, -51, 2.2, 2.2, "#f5dca0");
  const flag = city.owner === 1 ? "#d8767d" : t.cloth;
  line(
    c,
    [
      [25, 2],
      [25, -35],
    ],
    "#d3c5a0",
    1.1,
  );
  p(
    c,
    [
      [25, -35],
      [38, -30],
      [25, -25],
    ],
    flag,
  );
  c.fillStyle = "#f7e9bb";
  c.font = "7px serif";
  c.textAlign = "center";
  c.fillText(
    {
      rome: "R",
      goguryeo: "G",
      egypt: "E",
      persia: "P",
      han: "H",
      greece: "A",
      mongol: "M",
      maurya: "I",
    }[id] || "N",
    29,
    -28,
  );
  c.restore();
}
function health(c, u, s) {
  line(
    c,
    [
      [-10, 10],
      [10, 10],
    ],
    "#1b3545",
    3,
  );
  line(
    c,
    [
      [-10, 10],
      [-10 + (20 * Math.max(0, u.hp)) / s.hp, 10],
    ],
    u.team === 0 ? "#a9d4bb" : "#eab1a6",
    2,
  );
  if (!u.acted) ellipse(c, 0, -41, 1.7, 1.7, "#f1dda1");
  if (u.veteran) {
    c.fillStyle = "#efd88f";
    c.font = "7px sans-serif";
    c.fillText("★", 11, -33);
  }
}
export function drawVessel(c, x, y, u, nation, night) {
  const t = THEMES[nation?.id] || THEMES.rome,
    s = combatStats(u, { night });
  c.save();
  c.translate(x, y);
  ellipse(c, 0, 7, 21, 6, "#c5e9e826");
  line(
    c,
    [
      [-23, 8],
      [-9, 13],
      [12, 12],
      [25, 6],
    ],
    "#afdddf88",
    1,
  );
  const w = u.boat === "warship" ? 22 : 18;
  p(
    c,
    [
      [-w, -2],
      [-w + 5, 8],
      [0, 14],
      [w - 2, 5],
      [w + 5, -6],
      [2, -12],
    ],
    "#875e44",
  );
  p(
    c,
    [
      [-w, -2],
      [0, 6],
      [w + 5, -6],
      [2, -12],
    ],
    "#c4a87a",
  );
  p(
    c,
    [
      [0, 6],
      [0, 14],
      [w - 2, 5],
      [w + 5, -6],
    ],
    "#634a3c",
  );
  line(
    c,
    [
      [0, 4],
      [0, -39],
    ],
    "#a79470",
    2,
  );
  if (u.boat !== "transport") {
    p(
      c,
      [
        [1, -37],
        [18, -29],
        [1, -9],
      ],
      u.team === 1 ? "#d69495" : t.cloth,
    );
    line(
      c,
      [
        [1, -37],
        [18, -29],
        [1, -9],
      ],
      "#ecd9ad",
      0.7,
    );
  } else {
    p(
      c,
      [
        [-12, -6],
        [-7, -12],
        [7, -8],
        [10, 0],
        [0, 3],
      ],
      "#d3c2a0",
    );
    ellipse(c, -7, -13, 3, 3, "#dbb18a");
  }
  if (u.boat === "warship") {
    for (const dx of [-12, 12]) {
      ellipse(c, dx, 0, 3, 3, "#475a61");
      line(
        c,
        [
          [dx, 0],
          [dx + 6, -4],
        ],
        "#475a61",
        3,
      );
    }
    p(
      c,
      [
        [-22, -1],
        [-18, -4],
        [-17, 6],
      ],
      t.trim,
    );
  }
  c.translate(0, 3);
  health(c, u, s);
  c.restore();
}
export function drawUnit(c, x, y, u, nation, night) {
  c.save();
  c.translate(x, y);
  c.scale(0.74, 0.74);
  drawFigure(c, 0, 0, u, nation, night);
  c.restore();
}
function drawFigure(c, x, y, u, nation, night) {
  if (u.boat) {
    drawVessel(c, x, y, u, nation, night);
    return;
  }
  const t = THEMES[nation?.id] || THEMES.rome,
    id = nation?.id,
    s = combatStats(u, { night });
  c.save();
  c.translate(x, y);
  ellipse(c, 0, 4, 12, 4, "#112f4260");
  if (u.type === "catapult") {
    p(
      c,
      [
        [-13, 1],
        [0, 8],
        [14, 0],
        [0, -8],
      ],
      "#b99a68",
    );
    for (const dx of [-10, 10]) {
      ellipse(c, dx, 5, 3, 5, "#3b4d51");
      ellipse(c, dx, 5, 1, 2, "#b5a17a");
    }
    line(
      c,
      [
        [-6, 1],
        [5, -25],
      ],
      "#d2bb8b",
      3,
    );
    p(
      c,
      [
        [1, -25],
        [8, -29],
        [12, -24],
        [5, -19],
      ],
      "#7a8787",
    );
    health(c, u, s);
    c.restore();
    return;
  }
  const mounted = ["rider", "knight"].includes(u.type);
  if (mounted) {
    p(
      c,
      [
        [-15, -1],
        [-10, -12],
        [11, -11],
        [16, -1],
        [8, 6],
        [-8, 6],
      ],
      "#927458",
    );
    p(
      c,
      [
        [9, -8],
        [8, -23],
        [14, -27],
        [20, -21],
        [16, -6],
      ],
      "#ad8c65",
    );
    line(
      c,
      [
        [-10, 4],
        [-12, 11],
      ],
      "#5c5148",
      2,
    );
    line(
      c,
      [
        [10, 4],
        [13, 11],
      ],
      "#5c5148",
      2,
    );
    c.translate(-2, -9);
  }
  const assassin = u.type === "assassin",
    cloth = assassin ? "#29394d" : t.cloth;
  // Cape, tunic and faceted shoulders replace the old stacked block silhouettes.
  p(
    c,
    [
      [-7, -24],
      [-12, 1],
      [-3, 5],
      [7, -2],
      [6, -24],
    ],
    assassin ? "#1c2d43" : t.dark,
  );
  line(
    c,
    [
      [-4, -1],
      [-5, 6],
    ],
    "#4d5352",
    3,
  );
  line(
    c,
    [
      [4, -1],
      [5, 6],
    ],
    "#4d5352",
    3,
  );
  p(
    c,
    [
      [-8, -24],
      [0, -28],
      [8, -23],
      [6, -5],
      [0, -2],
      [-6, -6],
    ],
    cloth,
  );
  p(
    c,
    [
      [0, -28],
      [8, -23],
      [6, -5],
      [0, -2],
    ],
    "#142e4129",
  );
  line(
    c,
    [
      [-6, -8],
      [6, -8],
    ],
    t.trim,
    1.4,
  );
  ellipse(c, 0, -30, 6, 6.4, "#d9b48b");
  p(
    c,
    [
      [0, -35],
      [5, -31],
      [3, -25],
      [0, -24],
    ],
    "#c19b78",
  );
  ellipse(c, 2, -30, 0.65, 0.8, "#41494a");
  if (assassin) {
    p(
      c,
      [
        [-7, -29],
        [-5, -38],
        [0, -42],
        [6, -36],
        [7, -28],
        [4, -26],
        [3, -33],
        [-3, -34],
        [-4, -27],
      ],
      "#203149",
    );
    line(
      c,
      [
        [9, -20],
        [12, -11],
      ],
      night ? "#d8a1b8" : "#c8d2ce",
      2,
    );
  } else if (id === "rome") {
    p(
      c,
      [
        [-6, -31],
        [-6, -36],
        [0, -39],
        [6, -35],
        [6, -31],
      ],
      "#d5ba80",
    );
    line(
      c,
      [
        [-3, -39],
        [1, -42],
        [5, -38],
      ],
      "#ad4b55",
      3,
    );
  } else if (id === "goguryeo") {
    p(
      c,
      [
        [-6, -32],
        [-3, -40],
        [1, -42],
        [6, -32],
      ],
      "#486374",
    );
    line(
      c,
      [
        [1, -40],
        [5, -45],
      ],
      "#b46360",
      2,
    );
    for (const dy of [-19, -15, -11])
      line(
        c,
        [
          [-4, dy],
          [4, dy + 1],
        ],
        "#b3b4a5",
        0.6,
      );
  } else if (id === "han") {
    p(
      c,
      [
        [-7, -33],
        [-4, -38],
        [4, -38],
        [8, -33],
      ],
      "#495e51",
    );
    line(
      c,
      [
        [-7, -32],
        [7, -32],
      ],
      t.trim,
      1,
    );
  } else if (id === "egypt") {
    p(
      c,
      [
        [-6, -33],
        [-3, -39],
        [4, -39],
        [7, -32],
        [7, -22],
        [4, -25],
        [3, -33],
      ],
      "#d6b36a",
    );
    for (const dy of [-32, -28, -24])
      line(
        c,
        [
          [4, dy],
          [7, dy + 1],
        ],
        "#497b91",
        1,
      );
  } else if (id === "persia") {
    ellipse(c, 0, -35, 7, 4, "#d9cfbf");
    line(
      c,
      [
        [-6, -35],
        [4, -37],
      ],
      t.cloth,
      1.5,
    );
  } else if (id === "greece") {
    p(
      c,
      [
        [-6, -30],
        [-5, -37],
        [1, -40],
        [6, -35],
        [5, -28],
        [2, -31],
        [0, -33],
        [-2, -29],
      ],
      "#d0b47c",
    );
    line(
      c,
      [
        [-1, -40],
        [4, -43],
        [7, -38],
      ],
      "#568c9f",
      2,
    );
  } else if (id === "mongol") {
    p(
      c,
      [
        [-7, -33],
        [-4, -38],
        [0, -41],
        [5, -36],
        [7, -32],
      ],
      "#6d6555",
    );
    line(
      c,
      [
        [-6, -32],
        [6, -32],
      ],
      "#d4c6a6",
      2,
    );
  } else {
    ellipse(c, 0, -35, 7, 4, "#d4b16d");
    ellipse(c, 2, -39, 2, 2, t.cloth);
  }
  if (u.type === "archer") {
    c.strokeStyle = "#cfac7b";
    c.lineWidth = 1.6;
    c.beginPath();
    c.ellipse(11, -19, 5, 11, 0, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    line(
      c,
      [
        [11, -30],
        [11, -8],
      ],
      "#e4dcc2",
      0.65,
    );
    line(
      c,
      [
        [4, -20],
        [19, -20],
      ],
      "#e3e8dc",
      1,
    );
  } else if (!assassin) {
    line(
      c,
      [
        [10, -9],
        [12, -28],
      ],
      "#e4e9e0",
      1.8,
    );
    line(
      c,
      [
        [8, -13],
        [15, -13],
      ],
      t.trim,
      1.5,
    );
    const big = u.type === "guard";
    ellipse(
      c,
      -9,
      -14,
      big ? 7 : 5,
      big ? 10 : 7,
      id === "rome" ? "#a94a51" : t.cloth,
    );
    ellipse(c, -9, -14, 1.5, 1.5, t.trim);
  }
  if (mounted) c.translate(2, 9);
  health(c, u, s);
  c.restore();
}
