const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/\/src\/main\.js(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
window.__gameTest={get view(){return view},fixture(kind){init();if(kind==='combat'){units=[{x:3,y:7,team:0,hp:10,acted:false},{x:4,y:7,team:1,hp:10,acted:false}];}if(kind==='rest'){units[0].hp=4;}if(kind==='win'){units=[{x:8,y:3,team:0,hp:10,acted:false}];at(8,3).type='grass';}if(kind==='lose'){units=[{x:3,y:6,team:1,hp:10,acted:false}];}if(kind==='mutual'){units=[{x:8,y:3,team:0,hp:1,acted:false},{x:9,y:3,team:1,hp:4,acted:false}];at(8,3).type='grass';}reveal();update();draw();},get snapshot(){return {units,gold,turn,over,zoom,pan,panelOpen,selected,owner:at(9,3).city.owner,targets:world.flat().filter(t=>available(t)).map(t=>({x:t.x,y:t.y,action:available(t)}))}}};`,
    });
  });
  await page.goto(process.env.TEST_URL || "http://localhost:3000");
  await page.waitForTimeout(500);
  async function clickTile(x, y, unit = false) {
    let p = await page.locator("#map").evaluate(
      (c, { x, y, unit }) => {
        const v = window.__gameTest.view,
          t = v.hit.find((p) => p.t.x === x && p.t.y === y),
          r = c.getBoundingClientRect();
        return {
          x: r.left + v.ox + t.x * v.scale,
          y: r.top + v.oy + (t.y - (unit ? 23 : 0)) * v.scale,
        };
      },
      { x, y, unit },
    );
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(220);
  }

  assert.equal(await page.locator("#actionPanel").isVisible(), false);
  await clickTile(3, 7, true);
  await page.locator("#actionPanel").waitFor({ state: "visible" });
  assert.match(await page.locator("#tileTitle").innerText(), /숲의 전사/);
  assert.equal(
    await page
      .locator("#actionPanel")
      .evaluate((e) => e.classList.contains("unit-compact")),
    true,
  );
  assert(
    (await page.evaluate(() => window.__gameTest.snapshot.targets)).some(
      (t) => t.x === 4 && t.y === 7 && t.action === "move",
    ),
  );
  assert((await page.locator("#actionPanel").boundingBox()).height < 90);
  await clickTile(4, 7);
  assert.match(await page.locator("#tileDescription").innerText(), /행동 완료/);
  await page.click("#closePanel");
  await clickTile(3, 7);
  assert.match(await page.locator("#tileTitle").innerText(), /숲의 수도/);
  await page.click("#upgrade");
  assert.equal(await page.locator("#gold").innerText(), "2");
  assert.match(await page.locator("#tileDescription").innerText(), /레벨 2/);
  await page.click("#endTurn");
  await page.waitForFunction(() =>
    document.getElementById("turnLabel").textContent.includes("02"),
  );
  assert.equal(await page.locator("#gold").innerText(), "6");
  await page.click("#recruit");
  assert.equal(await page.locator("#army").innerText(), "2");
  assert.match(await page.locator("#tileTitle").innerText(), /숲의 전사/);
  await page.click("#inspectCity");
  assert.match(await page.locator("#tileTitle").innerText(), /숲의 수도/);
  assert.equal(await page.locator("#recruit").isDisabled(), true);
  await page.click("#inspectUnit");
  assert.match(await page.locator("#tileTitle").innerText(), /숲의 전사/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#actionPanel").isVisible(), false);
  await page.click("#zoomIn");
  assert.equal(await page.locator("#zoomLabel").innerText(), "115%");
  await page.click("#resetView");
  await clickTile(3, 7, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#closePanel");
  await clickTile(3, 7, true);
  assert.equal(await page.locator("#actionPanel").isVisible(), true);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.__gameTest.fixture("combat"));
  await clickTile(3, 7, true);
  const targets = await page.evaluate(() => window.__gameTest.snapshot.targets);
  assert(targets.some((t) => t.x === 4 && t.y === 7 && t.action === "attack"));
  assert(targets.some((t) => t.action === "move"));
  await clickTile(4, 7, true);
  let state = await page.evaluate(() => window.__gameTest.snapshot);
  assert.equal(state.units.find((u) => u.team === 1).hp, 4);
  assert.equal(state.units.find((u) => u.team === 0).hp, 7);
  await page.evaluate(() => window.__gameTest.fixture("rest"));
  await clickTile(3, 7, true);
  await page.click("#restUnit");
  assert.match(
    await page.locator("#tileDescription").innerText(),
    /체력 7.*행동 완료/,
  );
  await page.evaluate(() => window.__gameTest.fixture("win"));
  await clickTile(8, 3, true);
  await clickTile(9, 3);
  assert.match(await page.locator("#statusTitle").innerText(), /새로운 왕/);
  assert.equal(await page.locator("#endTurn").isDisabled(), true);
  await page.evaluate(() => window.__gameTest.fixture("lose"));
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.over);
  assert.match(await page.locator("#statusTitle").innerText(), /내려갔습니다/);
  await page.evaluate(() => window.__gameTest.fixture("mutual"));
  await clickTile(8, 3, true);
  await clickTile(9, 3, true);
  state = await page.evaluate(() => window.__gameTest.snapshot);
  assert.equal(state.units.length, 0);
  assert.equal(state.owner, 1);
  assert.equal(state.over, false);
  // Real multi-touch input through Chromium, including cancellation and a remaining finger.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__gameTest.fixture("rest"));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  const touch = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map(([id, x, y]) => ({
        id,
        x,
        y,
        radiusX: 4,
        radiusY: 4,
        force: 1,
      })),
    });
  await page.evaluate(() => {
    window.touchTrace = [];
    for (const type of [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
    ])
      document
        .getElementById("map")
        .addEventListener(type, (e) =>
          window.touchTrace.push({
            type,
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
          }),
        );
  });
  const before = await page.evaluate(() => window.__gameTest.snapshot);
  const anchor = await page.evaluate(() => {
    let v = window.__gameTest.view;
    return { x: (195 - v.ox) / v.scale, y: (300 - v.oy) / v.scale };
  });
  await touch("touchStart", [
    [1, 145, 360],
    [2, 245, 360],
  ]);
  await touch("touchMove", [
    [1, 120, 360],
    [2, 270, 360],
  ]);
  await touch("touchEnd", []);
  let gesture = await page.evaluate(() => window.__gameTest.snapshot);
  assert(Math.abs(gesture.zoom - 1.5) < 0.02, "spread fingers zooms in");
  assert.equal(gesture.panelOpen, false, "pinch must not select a tile");
  assert.deepEqual(
    gesture.units,
    before.units,
    "pinch must not move or attack",
  );
  const centered = await page.evaluate(() => {
    let v = window.__gameTest.view;
    return { x: (195 - v.ox) / v.scale, y: (300 - v.oy) / v.scale };
  });
  assert(
    Math.abs(anchor.x - centered.x) < 0.1 &&
      Math.abs(anchor.y - centered.y) < 0.1,
    "world point stays under pinch center",
  );
  await touch("touchStart", [
    [1, 120, 360],
    [2, 270, 360],
  ]);
  await touch("touchMove", [
    [1, 155, 360],
    [2, 235, 360],
  ]);
  await touch("touchEnd", []);
  gesture = await page.evaluate(() => window.__gameTest.snapshot);
  assert(gesture.zoom < 1, "bringing fingers together zooms out");
  await touch("touchStart", [
    [1, 145, 360],
    [2, 245, 360],
  ]);
  await touch("touchMove", [
    [1, 95, 360],
    [2, 295, 360],
  ]);
  await touch("touchEnd", [[2, 295, 360]]);
  const beforeDrag = await page.evaluate(() => window.__gameTest.snapshot.pan);
  await touch("touchMove", [[1, 120, 380]]);
  await touch("touchEnd", []);
  gesture = await page.evaluate(() => window.__gameTest.snapshot);
  if (!(gesture.pan.x > beforeDrag.x + 15))
    console.log({
      beforeDrag,
      after: gesture.pan,
      trace: await page.evaluate(() => window.touchTrace),
    });
  assert(
    gesture.pan.x > beforeDrag.x + 15,
    "remaining finger continues panning",
  );
  assert.equal(
    gesture.panelOpen,
    false,
    "remaining finger release is not a tap",
  );
  await touch("touchStart", [
    [1, 145, 360],
    [2, 245, 360],
  ]);
  await touch("touchCancel", []);
  await page.click("#resetView");
  const tap = await page.locator("#map").evaluate((c) => {
    let v = window.__gameTest.view,
      p = v.hit.find((t) => t.t.x === 3 && t.t.y === 7),
      r = c.getBoundingClientRect();
    return {
      x: r.left + v.ox + p.x * v.scale,
      y: r.top + v.oy + (p.y - 23) * v.scale,
    };
  });
  await touch("touchStart", [[1, tap.x, tap.y]]);
  await touch("touchEnd", []);
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator("#actionPanel").isVisible(),
    true,
    "tap works after canceled pinch",
  );
  assert(
    (await page.locator("#actionPanel").boundingBox()).height < 90,
    "mobile unit strip stays compact",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real Chromium render, tile picking, action panel, movement, upgrade, income, training, unit/city switch, Escape, zoom, real pinch-in/out, anchored zoom, finger transition, canceled pinch, compact mobile layout, combat, rest, victory, defeat and simultaneous defeat; no JS errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
