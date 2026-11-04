const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { pixels: decodePNG } = require("./helpers/png.cjs");
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
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.stack));
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: { user: { id: 1, username: "presentation", nickname: "파랑왕" } },
      }),
    );
    await page.route("**/api/rooms/current", (r) =>
      r.fulfill({ json: { room: null } }),
    );
    await page.addInitScript(() => {
      window.__played = [];
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) =>
        raf((t) => {
          cb(t);
          const state = window.__presentation?.state;
          if (state?.animation && window.__recordPlayback)
            window.__played.push(state);
        });
    });
    await page.route(/\/src\/main\.js(?:\?.*)?$/, async (r) => {
      const response = await r.fetch();
      await r.fulfill({
        response,
        body:
          (await response.text()) +
          `
window.__presentation={setup(){init();clearTimeout(turnBannerTimer);$('turnBanner').hidden=true;world=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',seen:true,visible:true,city:null,resource:null})));homeCapital={x:3,y:7};enemyCapital={x:9,y:3};world[7][3].city={owner:0,name:'내 도시',level:2,population:2,experience:1};world[3][9].city={owner:1,name:'상대 도시',level:1,population:1};world[7][2].type='forest';world[7][2].resource='game';world[8][3].type='forest';world[8][3].resource='wood';world[1][10].seen=false;world[1][10].visible=false;units=[{id:1,x:4,y:7,team:0,type:'warrior',hp:10,acted:false},{id:2,x:9,y:3,team:1,type:'warrior',hp:10}];cityOwners={0:'파랑왕',1:'빨강왕'};researched=new Set(['hunting','lumber']);gold=100;selected={x:3,y:7};selectedUnit=null;panelOpen=false;assignTerritories(world);zoom=1.1;update();draw();},night(value){turn=value?2:1;update();draw();},point(x,y){const p=project(x,y),r=canvas.getBoundingClientRect();return {x:r.left+view.ox+p.x*view.scale,y:r.top+view.oy+p.y*view.scale,scale:view.scale};},select(x,y){selectTile(at(x,y));},async harvestSetup(){init();singleMatch=createMatch([{nation:'rome',nickname:'파랑왕'},{nation:'goguryeo',nickname:'빨강왕'}],0,0,{size:12});const g=singleMatch;for(const t of g.world.flat()){t.type='grass';t.city=null;t.resource=null;}g.world[7][3].city={owner:0,name:'내 도시',level:2,population:2,experience:0};g.world[3][9].city={owner:1,name:'상대 도시',level:1,population:1};g.players[0].capital={x:3,y:7};g.players[0].gold=50;g.players[0].researched=['lumber'];g.units=[{id:1,x:3,y:7,type:'warrior',team:0,hp:10},{id:2,x:9,y:3,type:'warrior',team:1,hp:10}];g.world[7][4].type='forest';g.world[7][4].resource='wood';assignTerritories(g.world);g.knowledge=g.players.map(()=>Array(144).fill(null));multiGame=null;multiRoom=null;localCode='harvest';localRevision=1;await loadMulti(matchView(g,0),{code:localCode,version:localRevision});clearTimeout(turnBannerTimer);$('turnBanner').hidden=true;zoom=1.5;draw();},async harvest(){applyCommand(singleMatch,0,{type:'develop',x:4,y:7});await loadMulti(matchView(singleMatch,0),{code:localCode,version:++localRevision});},sync(){return loadMulti(matchView(singleMatch,0),{code:localCode,version:++localRevision});},async aiSetup(){init();singleMatch=createMatch([{nation:'rome',nickname:'파랑왕'},{nation:'goguryeo',nickname:'빨강왕',bot:true}],0,0,{size:12});const g=singleMatch;for(const t of g.world.flat()){t.type='grass';t.city=null;t.resource=null;}g.world[7][3].city={owner:0,name:'내 도시',level:1,population:1};g.world[10][10].city={owner:1,name:'AI 도시',level:1,population:1};assignTerritories(g.world);g.players[0].capital={x:3,y:7};g.players[1].capital={x:10,y:10};g.units=[{id:1,x:7,y:7,team:0,type:'warrior',hp:1},{id:2,x:8,y:8,team:1,type:'warrior',hp:10},{id:3,x:4,y:7,team:1,type:'warrior',hp:10}];g.nextUnit=4;g.knowledge=g.players.map(()=>Array(144).fill(null));applyCommand(g,0,{type:'endTurn'});localCode='presentation';localRevision=1;await loadMulti(matchView(g,0),{code:localCode,version:localRevision});zoom=2;pan={x:0,y:0};draw();},async play(){const g=singleMatch;applyCommand(g,1,{type:'act',unitId:2,x:8,y:7});applyCommand(g,1,{type:'act',unitId:2,x:7,y:7});applyCommand(g,1,{type:'act',unitId:3,x:4,y:6});advanceTurnForTest(g);await loadMulti(matchView(g,0),{code:localCode,version:++localRevision});},get state(){return {gold,caption:$('statusTitle').textContent,units:(units||[]).map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp})),labels:view?.cityLabels,pan:{...pan},animation:animation&&{id:animation.unit?.id,team:animation.unit?.team,pose:animation.pose?.progress,death:animation.death},busy,animating,world:(world||[]).flat().filter(t=>t.resource).map(t=>({x:t.x,y:t.y,type:t.type,developed:t.developed})),sequence:lastVisualSequence};}};
import {advanceTurn as advanceTurnForTest} from '../server/game.js';
`,
      });
    });
    await page.goto("http://localhost:3000");
    await page.click("#singleMode");
    await page.click("#startNation");
    await page.evaluate(() => window.__presentation.setup());
    await page.waitForFunction(
      () => Number(document.querySelector("#map").dataset.unitModels) >= 8 && document.querySelector("#map").dataset.unitModelSet === "animals",
    );
    const motion = () =>
      page.locator("#map").evaluate((c) => JSON.parse(c.dataset.motion));
    const first = await motion();
    await page.waitForFunction((before) => {
      const m = JSON.parse(document.querySelector("#map").dataset.motion);
      return (
        Math.abs(m.trees - before.trees) > 0.012 &&
        Math.abs(m.animal - before.animal) > 0.025 &&
        Math.abs(m.units - before.units) > 0.003
      );
    }, first);
    const labels = await page.evaluate(
      () => window.__presentation.state.labels,
    );
    assert(labels.some((l) => l.text.includes("파랑왕")));
    assert(labels.some((l) => l.text.includes("빨강왕")));
    await page.evaluate(() => document.fonts.ready);
    const drawn = await page
      .locator("#map")
      .evaluate((c) => Number(c.dataset.frames));
    await page.waitForFunction(
      (n) => Number(document.querySelector("#map").dataset.frames) > n + 2,
      drawn,
    );
    const center = await page.evaluate(() => window.__presentation.point(7, 5));
    const crop = { x: center.x - 3, y: center.y - 3, width: 6, height: 6 };
    const daylight = decodePNG(
      await page.screenshot({
        clip: crop,
        path: "/tmp/ramtopia-daylight-crop.png",
      }),
    );
    await page.evaluate(() => window.__presentation.night(true));
    const rendered = await page
      .locator("#map")
      .evaluate((c) => Number(c.dataset.frames));
    await page.waitForFunction(
      (n) => Number(document.querySelector("#map").dataset.frames) > n + 2,
      rendered,
    );
    const night = decodePNG(
      await page.screenshot({
        clip: crop,
        path: "/tmp/ramtopia-night-crop.png",
      }),
    );
    let difference = 0;
    for (let i = 0; i < daylight.pixels.length; i++)
      difference += Math.abs(daylight.pixels[i] - night.pixels[i]);
    assert(
      difference / daylight.pixels.length < 5,
      "visible terrain retains daylight lighting at night",
    );
    const cloud = await page.evaluate(() => window.__presentation.point(10, 1));
    const fog = decodePNG(
      await page.screenshot({
        clip: {
          x: cloud.x - 4,
          y: cloud.y - 10 * cloud.scale,
          width: 8,
          height: 6,
        },
      }),
    );
    assert(
      fog.pixels[0] > 130 && fog.pixels[1] > 130 && fog.pixels[2] > 130,
      "unexplored tiles are light cloud cover",
    );
    const cityAlpha = await page.locator("#map").evaluate((c) => {
      const p = window.__presentation.point(3, 7),
        r = c.getBoundingClientRect(),
        dpr = devicePixelRatio;
      return c
        .getContext("2d")
        .getImageData(
          Math.round((p.x - r.left) * dpr),
          Math.round((p.y - r.top + 12 * p.scale) * dpr),
          1,
          1,
        ).data[3];
    });
    assert.equal(
      cityAlpha,
      0,
      "opaque city level panel no longer obscures the field",
    );
    await page.evaluate(() => window.__presentation.select(2, 7));
    await page.click("#develop");
    assert.equal(
      (await page.evaluate(() => window.__presentation.state)).world.find(
        (t) => t.x === 2 && t.y === 7,
      ).developed,
      true,
    );
    await page.evaluate(() => window.__presentation.select(3, 8));
    await page.click("#develop");
    assert.equal(
      (await page.evaluate(() => window.__presentation.state)).world.find(
        (t) => t.x === 3 && t.y === 8,
      ).type,
      "grass",
    );
    await page.screenshot({ path: "/tmp/ramtopia-clouds-city-labels.png" });
    await page.evaluate(() => window.__presentation.aiSetup());
    const originalGold = await page.evaluate(
      () => window.__presentation.state.gold,
    );
    const original = await page.evaluate(() => window.__presentation.state.pan);
    await page.evaluate(() => {
      window.__played = [];
      window.__recordPlayback = true;
    });
    const playback = page.evaluate(() => window.__presentation.play());
    await page.waitForFunction(() =>
      window.__played.some(
        (f) => f.animation?.id === 2 && f.animation.pose > 0,
      ),
    );
    await page.screenshot({ path: "/tmp/ramtopia-follow-ai.png" });
    await playback;
    const frames = await page.evaluate(() => window.__played);
    assert(
      frames.some(
        (f) => f.animation?.id === 2 && f.animation.pose === undefined,
      ),
    );
    assert(frames.some((f) => f.animation?.id === 2 && f.animation.pose > 0.4));
    assert(
      frames.some(
        (f) =>
          Math.abs(f.pan.x - original.x) > 2 ||
          Math.abs(f.pan.y - original.y) > 2,
      ),
      "camera follows an off-screen visible enemy",
    );
    const final = await page.evaluate(() => window.__presentation.state);
    assert(!final.units.some((u) => u.id === 1));
    assert(final.units.some((u) => u.id === 3 && u.y === 6));
    assert(final.sequence >= 3);
    assert.equal(final.animating, false);
    assert(
      frames.some((f) => f.gold === originalGold),
      "incoming income waits until visible AI actions finish",
    );
    assert(final.gold > originalGold);
    assert(
      frames.some((f) => f.caption.includes("빨강왕")),
      "turn caption identifies the acting opponent",
    );
    await page.evaluate(() => {
      window.__played = [];
    });
    await page.evaluate(() => window.__presentation.sync());
    assert.equal(
      (await page.evaluate(() => window.__played)).length,
      0,
      "unchanged action history is not replayed twice",
    );
    await page.evaluate(() => window.__presentation.harvestSetup());
    const woodPoint = await page.evaluate(() =>
      window.__presentation.point(4, 7),
    );
    const countTree = async () => {
      const { pixels, channels } = decodePNG(
        await page.screenshot({
          clip: {
            x: woodPoint.x - 35,
            y: woodPoint.y - 50,
            width: 70,
            height: 65,
          },
        }),
      );
      let count = 0;
      for (let i = 0; i < pixels.length; i += channels)
        if (
          pixels[i] < 125 &&
          pixels[i + 1] > pixels[i] + 18 &&
          pixels[i + 1] > pixels[i + 2] + 12
        )
          count++;
      return count;
    };
    const treeBefore = await countTree();
    assert(treeBefore > 10);
    const ownPan = await page.evaluate(() => window.__presentation.state.pan);
    await page.evaluate(() => window.__presentation.harvest());
    const painted = await page
      .locator("#map")
      .evaluate((c) => Number(c.dataset.frames));
    await page.waitForFunction(
      (n) => Number(document.querySelector("#map").dataset.frames) > n + 2,
      painted,
    );
    assert(
      (await countTree()) < treeBefore - 10,
      "shared-engine harvesting removes trees from the rendered field",
    );
    assert.deepEqual(
      await page.evaluate(() => window.__presentation.state.pan),
      ownPan,
      "own harvesting never triggers enemy camera follow",
    );
    assert(!(await page.locator("#turnBanner").textContent()).includes("공격"));

    assert.deepEqual(errors, []);
    console.log(
      "PASS: visible idle motion, fresh harvest terrain, daylight sight at night, cloud fog, owner labels without field panels, ordered AI camera-follow and visible unit death",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
