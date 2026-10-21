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
  await page.addInitScript(() => {
    window.__renderFrames = [];
    window.__resetWasPrompted = false;
    window.confirm = () => {
      window.__resetWasPrompted = true;
      return false;
    };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      raf((time) => {
        callback(time);
        const s = window.__gameTest?.snapshot;
        if (s?.animation && !window.__triedReset) {
          window.__triedReset = true;
          document.getElementById("newGame").click();
        }
        if (s?.animation)
          window.__renderFrames.push({
            position: s.animation.position,
            animating: s.animating,
          });
      });
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
window.__gameTest={get view(){return view},fixture(kind){init();
 if(kind==='combat'||kind==='kill'){units=[{x:3,y:7,team:0,hp:10,acted:false},{x:4,y:7,team:1,hp:kind==='kill'?4:10,acted:false}];}
 if(kind==='rest')units[0].hp=4;
 if(kind==='win'||kind==='mutual'){units=[{x:8,y:3,team:0,hp:kind==='mutual'?1:10,acted:false}];if(kind==='mutual')units.push({x:9,y:3,team:1,hp:4,acted:false});at(8,3).type='grass';}
 if(kind==='lose')units=[{x:3,y:6,team:1,hp:10,acted:false}];
 if(kind==='cluster')units=[{x:3,y:7,team:0,hp:10,acted:false},{x:4,y:7,team:0,hp:10,acted:false},{x:4,y:6,team:0,hp:10,acted:false}];
 if(kind==='economy'){gold=100;researched.add('gathering');units=[{x:3,y:6,team:0,hp:10,acted:false}];for(const [x,y,type,resource] of [[3,6,'grass','fruit'],[4,7,'grass','fruit'],[2,7,'mountain','ore'],[2,8,'water','fish'],[2,6,'forest','game'],[3,8,'forest','wood'],[4,8,'grass','grain']])Object.assign(at(x,y),{type,resource,developed:false});}if(kind==='rest')gold=100;
 if(kind==='mountain'){units=[{x:3,y:7,team:0,hp:10,acted:false}];Object.assign(at(4,7),{type:'mountain',resource:'ore'});gold=100;}
 if(kind==='siege'){gold=100;researched=new Set(['hunting','lumber','siege']);units=[{x:3,y:7,type:'catapult',team:0,hp:8,acted:false},{x:5,y:7,team:1,hp:6,acted:false}];for(const x of [3,4,5])at(x,7).type='grass';}

 if(kind==='capture'){units=[{x:6,y:5,team:0,hp:10,acted:false}];at(6,5).type='grass';}
 reveal();update();draw();},get snapshot(){return{units,gold,turn,over,zoom,pan,panelOpen,selected,animating,animation:animation&&{position:animation.position},effects,researched:[...researched],cities:world.flat().filter(t=>t.city).map(t=>({x:t.x,y:t.y,...t.city})),developed:world.flat().filter(t=>t.developed).map(t=>({x:t.x,y:t.y})),owner:at(9,3).city.owner,targets:world.flat().filter(t=>available(t)).map(t=>({x:t.x,y:t.y,action:available(t)}))}}};`,
    });
  });
  await page.goto(process.env.TEST_URL || "http://localhost:3000");
  await page.waitForFunction(() => window.__gameTest);
  const snapshot = () => page.evaluate(() => window.__gameTest.snapshot);
  const fixture = (kind) =>
    page.evaluate((kind) => window.__gameTest.fixture(kind), kind);
  async function point(x, y, head = false) {
    return page.locator("#map").evaluate(
      (c, { x, y, head }) => {
        const v = window.__gameTest.view,
          t = v.hit.find((p) => p.t.x === x && p.t.y === y),
          r = c.getBoundingClientRect();
        return {
          x: r.left + v.ox + t.x * v.scale,
          y: r.top + v.oy + (t.y - (head ? 23 : 0)) * v.scale,
        };
      },
      { x, y, head },
    );
  }
  async function clickTile(x, y, head = false) {
    const p = await point(x, y, head);
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => !window.__gameTest.snapshot.animating);
    await page.waitForTimeout(60);
  }
  async function research(name) {
    await page.click("#research");
    await page
      .locator(".tech-card")
      .filter({ has: page.getByText(name, { exact: true }) })
      .first()
      .click();
    await page.click("#closeResearch");
  }
  assert.equal(await page.locator("#actionPanel").isVisible(), false);
  await clickTile(3, 7);
  assert((await snapshot()).targets.some((t) => t.x === 4 && t.y === 7));
  const p = await point(4, 7);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => !window.__gameTest.snapshot.animating);
  assert.equal((await snapshot()).units[0].x, 4);
  assert.equal(await page.evaluate(() => window.__resetWasPrompted), false);
  assert.equal((await snapshot()).units[0].acted, true);
  assert.deepEqual((await snapshot()).targets, []);
  assert(
    (await page.evaluate(() => window.__renderFrames)).some((f) => f.animating),
    "movement produced visual animation frames",
  );
  await fixture("cluster");
  await page.click("#zoomIn");
  await page.click("#zoomIn");
  for (const [x, y] of [
    [3, 7],
    [4, 7],
    [4, 6],
    [4, 7],
  ]) {
    await clickTile(x, y);
    assert.deepEqual((await snapshot()).selected, { x, y });
  }
  await fixture("economy");
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruit").isEnabled(), true);
  const fruits = page
    .locator(".resource-option")
    .filter({ hasText: "열매 수확" });
  await fruits.first().click();
  assert.match(
    await page.locator("#cityGrowthText").innerText(),
    /인구 1 \/ 2/,
  );
  await fruits.first().click();
  let state = await snapshot();
  assert.equal(state.cities.find((c) => c.owner === 0).level, 2);
  assert.equal(state.cities.find((c) => c.owner === 0).population, 0);
  assert.equal(state.gold, 96);
  assert.equal(await page.locator("#income").innerText(), "+4");
  await page.click("#recruit");
  state = await snapshot();
  assert.equal(state.gold, 91);
  assert.equal(state.units[1].acted, true);
  assert.equal(state.units[1].bornTurn, 1);
  assert.deepEqual(state.targets, []);
  assert.match(await page.locator("#tileDescription").innerText(), /다음 턴/);
  await page.click("#endTurn");
  await page.waitForFunction(
    () =>
      window.__gameTest.snapshot.turn === 2 &&
      !window.__gameTest.snapshot.animating,
  );
  state = await snapshot();
  assert.equal(state.gold, 95);
  assert.equal(state.units[1].acted, false);
  assert(state.targets.length > 0);
  // Research spends stars once, enforces prerequisites, and enables real units/abilities.
  await fixture("economy");
  await page.click("#research");
  assert.equal(
    await page
      .locator(".tech-card")
      .filter({ has: page.getByText("기병", { exact: true }) })
      .isDisabled(),
    true,
  );
  await page.click("#closeResearch");
  await research("사냥");
  assert.equal((await snapshot()).gold, 95);
  assert((await snapshot()).researched.includes("hunting"));
  await research("도로");
  await research("기병");
  assert.equal((await snapshot()).gold, 80);
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruitRider").isDisabled(), true);
  await page
    .locator(".resource-option")
    .filter({ hasText: "열매 수확" })
    .first()
    .click();
  await page
    .locator(".resource-option")
    .filter({ hasText: "열매 수확" })
    .first()
    .click();
  assert.equal(await page.locator("#recruitRider").isVisible(), true);
  await page.click("#recruitRider");
  state = await snapshot();
  assert.equal(state.units[1].type, "rider");
  assert.equal(state.units[1].acted, true);
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  assert((await snapshot()).targets.some((t) => t.x === 5 && t.y === 7));
  await clickTile(5, 7);
  assert.equal((await snapshot()).units[1].x, 5);
  await fixture("economy");
  await research("농업");
  await research("방어술");
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruitGuard").isDisabled(), true);
  await page
    .locator(".resource-option")
    .filter({ hasText: "곡물 수확" })
    .first()
    .click();
  await page.click("#recruitGuard");
  assert.equal((await snapshot()).units[1].hp, 15);
  await fixture("rest");
  await research("낚시");
  await research("항해");
  await research("의술");
  await clickTile(3, 7, true);
  await page.click("#restUnit");
  assert.equal((await snapshot()).units[0].hp, 9);
  await fixture("economy");
  const beforeScout = Number(await page.locator("#land").innerText());
  await research("정찰");
  assert(Number(await page.locator("#land").innerText()) > beforeScout);
  await research("등산");
  await research("제련");
  await clickTile(3, 7);
  const ore = page.locator(".resource-option").filter({ hasText: "광산 개발" });
  assert((await ore.count()) > 0);
  await ore.first().click();
  assert((await snapshot()).cities.find((c) => c.owner === 0).level >= 2);
  await fixture("economy");
  await research("낚시");
  await clickTile(3, 7);
  await page
    .locator(".resource-option")
    .filter({ hasText: "어장 개발" })
    .first()
    .click();
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 2);
  await fixture("economy");
  await research("사냥");
  await clickTile(3, 7);
  await page
    .locator(".resource-option")
    .filter({ hasText: "동물 사냥" })
    .first()
    .click();
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 2);
  await fixture("combat");
  await clickTile(3, 7);
  assert((await snapshot()).targets.some((t) => t.action === "attack"));
  await clickTile(4, 7);
  state = await snapshot();
  assert.equal(state.units[0].hp, 7);
  assert.equal(state.units[1].hp, 4);
  assert.equal(state.units[0].x, 3);
  await fixture("kill");
  await clickTile(3, 7);
  await clickTile(4, 7);
  state = await snapshot();
  assert.equal(state.units.length, 1);
  assert.equal(state.units[0].x, 4);
  assert.equal(state.units[0].acted, true);
  await fixture("capture");
  await clickTile(6, 5);
  await clickTile(6, 6);
  state = await snapshot();
  assert.equal(state.cities.find((c) => c.x === 6 && c.y === 6).owner, 0);
  assert.equal(state.units[0].acted, true);
  assert.deepEqual(state.targets, []);
  await fixture("win");
  await clickTile(8, 3);
  await clickTile(9, 3);
  assert((await snapshot()).over);
  assert.equal((await snapshot()).units[0].x, 9);
  await fixture("lose");
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.over);
  assert.match(await page.locator("#statusTitle").innerText(), /내려갔습니다/);
  await fixture("mutual");
  await clickTile(8, 3);
  await clickTile(9, 3);
  state = await snapshot();
  assert.equal(state.units.length, 0);
  assert.equal(state.owner, 1);
  assert.equal(state.over, false);
  await fixture("mountain");
  await clickTile(3, 7);
  assert(!(await snapshot()).targets.some((t) => t.x === 4 && t.y === 7));
  await research("등산");
  assert((await snapshot()).targets.some((t) => t.x === 4 && t.y === 7));
  await clickTile(4, 7);
  assert.equal((await snapshot()).units[0].x, 4);
  await fixture("economy");
  await clickTile(3, 7);
  assert.equal(
    await page
      .locator(".resource-option")
      .filter({ hasText: "동물 사냥" })
      .first()
      .isDisabled(),
    true,
  );
  await research("사냥");
  await page
    .locator(".resource-option")
    .filter({ hasText: "동물 사냥" })
    .first()
    .click();
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 2);
  await research("벌목");
  await research("투석기");
  assert.equal(await page.locator("#recruitCatapult").isDisabled(), true);
  await page
    .locator(".resource-option")
    .filter({ hasText: "목재 수확" })
    .first()
    .click();
  await page
    .locator(".resource-option")
    .filter({ hasText: "열매 수확" })
    .first()
    .click();
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 3);
  await page.click("#recruitCatapult");
  assert.equal((await snapshot()).units[1].type, "catapult");
  await fixture("economy");
  await research("등산");
  await research("제련");
  await research("기사");
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruitKnight").isDisabled(), true);
  await page
    .locator(".resource-option")
    .filter({ hasText: "광산 개발" })
    .first()
    .click();
  await page
    .locator(".resource-option")
    .filter({ hasText: "열매 수확" })
    .first()
    .click();
  await page
    .locator(".resource-option")
    .filter({ hasText: "열매 수확" })
    .first()
    .click();
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 3);
  await page.click("#recruitKnight");
  assert.equal((await snapshot()).units[1].type, "knight");
  await fixture("siege");
  await clickTile(3, 7);
  assert(
    (await snapshot()).targets.some(
      (t) => t.x === 5 && t.y === 7 && t.action === "attack",
    ),
  );
  await clickTile(5, 7);
  state = await snapshot();
  assert.equal(state.units.length, 1);
  assert.equal(state.units[0].x, 3);
  assert.equal(state.units[0].hp, 8);
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
    "PASS: overlapping selection, animated movement/combat, kill advance, production cooldown, village capture exhaustion, resource population and income, research and new units/abilities, victory/defeat, mobile layout and multi-touch",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
