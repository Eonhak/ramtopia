const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 850 },
    });
    page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      window.__growthLevels = [];
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => {
        callback(time);
        for (const effect of window.__cityTest?.state.growthEffects || [])
          if (!window.__growthLevels.includes(effect.level)) window.__growthLevels.push(effect.level);
      });
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: {
          user: { id: 1, nickname: "도시왕", email: "city@example.com" },
        },
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
window.__cityTest={setup(){init();world=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',city:null,resource:null,seen:true,visible:true})));homeCapital={x:3,y:7};enemyCapital={x:9,y:3};world[7][3].city={owner:0,level:1,population:1,experience:0,name:'도시'};world[3][9].city={owner:1,level:1,population:1,experience:0,name:'적'};assignTerritories(world);for(const [x,y] of [[4,7],[2,7],[3,9]])world[y][x].resource='fruit';researched=new Set(['gathering']);gold=100;units=[{x:3,y:6,team:0,hp:10,acted:false},{x:9,y:3,team:1,hp:10,acted:false}];selected={x:3,y:7};update();draw();},level(){const c=world[7][3].city;addCityExperience(c,growthRequired(c)-c.experience);update();draw();},combat(){units=[{x:3,y:7,team:0,hp:10,acted:false},{x:4,y:7,team:1,hp:10,acted:false}];update();draw();},get state(){return {city:world[7][3].city,units,gold,animating,growthEffects}},get view(){return view}};
`,
      });
    });
    await page.goto("http://localhost:3000");
    await page.click("#singleMode");
    await page.click("#startNation");
    await page.evaluate(() => window.__cityTest.setup());
    assert.equal(await page.locator(".objective").count(), 0);
    async function click(x, y) {
      const p = await page.locator("#map").evaluate(
        (c, { x, y }) => {
          const v = window.__cityTest.view,
            t = v.hit.find((p) => p.t.x === x && p.t.y === y),
            r = c.getBoundingClientRect();
          return {
            x: r.left + v.ox + t.x * v.scale,
            y: r.top + v.oy + t.y * v.scale,
          };
        },
        { x, y },
      );
      await page.mouse.click(p.x, p.y);
    }
    await click(3, 9);
    assert.equal(
      await page.locator("#develop").isDisabled(),
      true,
      "outside borders cannot harvest",
    );
    await click(4, 7);
    await page.click("#develop");
    let state = await page.evaluate(() => window.__cityTest.state);
    assert.equal(state.city.experience, 1);
    assert.equal(state.city.population, 1);
    assert.equal(await page.locator("#cityRewardDialog").isVisible(), false);
    await click(2, 7);
    await page.click("#develop");
    await page.locator("#cityRewardDialog").waitFor({ state: "visible" });
    state = await page.evaluate(() => window.__cityTest.state);
    assert.equal(state.city.level, 2);
    // The reward UI opens synchronously; the first rendered frame arrives later.
    await page.waitForFunction(() => window.__growthLevels.includes(2));
    assert(await page.evaluate(() => window.__growthLevels.includes(2)), "city growth renders animation frames");
    assert.equal(await page.locator("#cityRewardDialog").evaluate(el => el.tagName), "SECTION");
    assert.equal(await page.locator("#healthBar").isVisible(), false);
    assert.equal(state.city.population, 2);
    assert.equal(await page.locator('[data-reward="giant"]').count(), 0);
    await page.locator('[data-reward="walls"]').click();
    assert.equal(
      (await page.evaluate(() => window.__cityTest.state)).city.walls,
      true,
    );
    await page.evaluate(() => window.__cityTest.combat());
    await click(3, 7);
    await click(4, 7);
    await page.waitForFunction(() => !window.__cityTest.state.animating);
    assert.equal(
      (await page.evaluate(() => window.__cityTest.state)).units[0].hp,
      8,
      "wall defence reduces counter damage",
    );
    await page.evaluate(() => window.__cityTest.level());
    assert.equal(await page.locator('[data-reward="walls"]').count(), 0);
    await page.locator('[data-reward="expand"]').click();
    await click(3, 9);
    assert.equal(
      await page.locator("#develop").isEnabled(),
      true,
      "expansion unlocks harvest in new territory",
    );
    await page.evaluate(() => window.__cityTest.level());
    await page.locator('[data-reward="expand"]').click();
    await page.evaluate(() => window.__cityTest.level());
    assert.equal(await page.locator('[data-reward="expand"]').count(), 0);
    assert.equal(await page.locator('[data-reward="walls"]').count(), 0);
    assert.equal(await page.locator('[data-reward="giant"]').isVisible(), true);
    await page.screenshot({ path: "/tmp/ramtopia-city-reward.png" });
    await page.locator('[data-reward="giant"]').click();
    state = await page.evaluate(() => window.__cityTest.state);
    assert.equal(state.city.level, 5);
    assert.equal(state.city.population, 5);
    assert.equal(state.city.expansions, 2);
    const giant = state.units.find((u) => u.type === "giant");
    assert(giant);
    assert.equal(giant.hp, 30);
    assert.equal(giant.acted, true);
    assert.equal(giant.bornTurn, 1);
    await click(3, 7);
    await page.click("#inspectCity");
    await page.screenshot({ path: "/tmp/ramtopia-city-level5.png" });
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-unit="knight"]').click();
    await page.locator("#unitInfoDialog").waitFor({state:"visible"});
    assert.equal(await page.locator("#unitInfoTitle").innerText(),"기사");
    assert.match(await page.locator("#unitInfoStats").innerText(),/기사|도시 레벨/);
    assert.equal(await page.locator("#unitInfoStats dd").last().innerText(),"기사");
    await page.screenshot({path:"/tmp/ramtopia-knight-info.png"});
    await page.click("#closeUnitInfo");
    for (const text of await page.locator(".production-choice > button small").allTextContents()) assert.match(text,/^\d+ ✦$/);
    const beforeInfo = await page.evaluate(() => window.__cityTest.state.gold);
    assert.equal(await page.locator("#recruitCatapult").isDisabled(),true);
    await page.locator('[data-unit="catapult"]').click();
    assert.equal(await page.locator("#unitInfoTitle").innerText(),"투석기");
    assert.equal((await page.evaluate(() => window.__cityTest.state)).gold,beforeInfo);
    await page.click("#closeUnitInfo");
    await page.locator('[data-unit="guard"]').click();
    assert.match(await page.locator("#unitInfoDescription").innerText(),/반사/);
    assert.match(await page.locator("#unitInfoStats").innerText(),/근접 100%/);
    await page.click("#closeUnitInfo");
    assert.deepEqual(errors, []);
    console.log(
      "PASS: city XP, harvest borders, level-up choice UI, wall combat, expansion caps and level-five giant",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
