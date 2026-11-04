const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 850 },
    });
    const errors = [];
    await page.addInitScript(() => {
      window.__walkingFrames = [];
      const raf = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) =>
        raf((t) => {
          cb(t);
          const raw = document.querySelector("#map")?.dataset.unitAnimations;
          if (raw)
            for (const a of JSON.parse(raw))
              if (a.id === "id:1" && a.mode === "walk")
                window.__walkingFrames.push(a);
        });
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: { user: { id: 1, username: "graphics", nickname: "그래픽" } },
      }),
    );
    await page.route("**/api/rooms/current", (r) =>
      r.fulfill({ json: { room: null } }),
    );
    await page.route(/\/src\/main\.js(?:\?.*)?$/, async (r) => {
      const response = await r.fetch();
      await r.fulfill({
        response,
        body:
          (await response.text()) +
          `
window.__graphicsTest={get status(){return {models:Number(canvas.dataset.unitModels||0),frames:Number(canvas.dataset.frames||0)};},setup(){init();world=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',seen:true,visible:true,city:null,resource:null})));homeCapital={x:3,y:7};enemyCapital={x:9,y:3};world[7][3].city={owner:0,level:3,population:3,experience:1,name:'내 도시'};world[3][9].city={owner:1,level:1,population:1,name:'상대 도시'};units=[{id:1,x:3,y:6,type:'warrior',team:0,hp:10,acted:false},{id:20,x:5,y:6,type:'warrior',team:1,hp:1,acted:false},...['guard','archer','rider','knight','assassin','giant','catapult'].map((type,i)=>({id:2+i,type,x:2+i,y:9,team:0,hp:UNIT_TYPES[type].hp,acted:false}))];world[7][4].type='forest';world[7][4].resource='game';world[7][5].type='mountain';world[7][5].resource='ore';world[7][6].type='water';world[7][6].resource='fish';researched=new Set(['climbing','navigation']);assignTerritories(world);selected={x:3,y:6};selectedUnit=null;panelOpen=false;selectionKind='tile';actionMode=null;zoom=1.4;update();draw();},point(x,y){const p=project(x,y),r=canvas.getBoundingClientRect();return {x:r.left+view.ox+p.x*view.scale,y:r.top+view.oy+p.y*view.scale};},get state(){return {units,selected,animating};}};
`,
      });
    });
    await page.goto("http://localhost:3000");
    await page.click("#singleMode");
    await page.click("#startNation");
    await page.evaluate(() => window.__graphicsTest.setup());
    await page.waitForFunction(() => window.__graphicsTest.status.models >= 8);
    assert.equal(
      await page.locator("#map").getAttribute("data-unit-model-set"),
      "animals",
    );
    const initial = await page.evaluate(() => window.__graphicsTest.status);
    assert(initial.models >= 8);
    await page.waitForFunction(
      (n) => window.__graphicsTest.status.frames > n + 2,
      initial.frames,
    );
    const click = async (x, y) => {
      const p = await page.evaluate(
        ([x, y]) => window.__graphicsTest.point(x, y),
        [x, y],
      );
      await page.mouse.click(p.x, p.y);
    };
    await click(3, 6);
    await click(4, 6);
    await page.waitForFunction(() => !window.__graphicsTest.state.animating);
    assert.equal(
      (await page.evaluate(() => window.__graphicsTest.state)).units.find(
        (u) => u.id === 1,
      ).x,
      4,
    );
    const walking = await page.evaluate(() => window.__walkingFrames);
    assert(walking.length >= 2, "movement renders multiple walking frames");
    assert(
      Math.max(...walking.map((x) => x.leg)) -
        Math.min(...walking.map((x) => x.leg)) >
        0.12,
      "actual GLB legs change pose during tile movement",
    );
    assert(
      Math.max(...walking.map((x) => x.x)) -
        Math.min(...walking.map((x) => x.x)) >
        0.1,
      "walking accompanies movement across the field",
    );
    await click(5, 6);
    await page.waitForFunction(() => !window.__graphicsTest.state.animating);
    const state = await page.evaluate(() => window.__graphicsTest.state);
    assert(!state.units.some((u) => u.id === 20));
    assert.equal(state.units.find((u) => u.id === 1).x, 5);
    await page.screenshot({ path: "/tmp/ramtopia-live-models.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click("#zoomIn");
    assert.equal(await page.locator("#zoomLabel").textContent(), "165%");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: eight GLB models in live game, environmental frames, canvas tile picking, movement, lethal sword advance and mobile camera",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
