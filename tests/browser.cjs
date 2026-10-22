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
            projectile: s.animation.projectile,
            pose: s.animation.pose,
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
window.__gameTest={expireTurn:()=>{turnDeadline=Date.now()-1},choose:()=>openNationChoice(),get view(){return view},fixture(kind){init();
 world=Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>({x,y,type:'grass',seen:false,city:null,resource:null,developed:false,road:false})));
 homeCapital={x:3,y:7};enemyCapital={x:9,y:3};for(const [x,y,owner]of [[3,7,0],[9,3,1],[6,6,-1],[4,3,-1],[8,8,-1]])at(x,y).city={owner,name:'테스트 마을',level:1,population:0,isCapital:owner!==-1};units=[{x:3,y:7,team:0,hp:10,acted:false},{x:9,y:3,team:1,hp:10,acted:false}];researched=new Set();selected={x:3,y:7};

 if(kind==='combat'||kind==='kill'){units=[{x:3,y:7,team:0,hp:10,acted:false},{x:4,y:7,team:1,hp:kind==='kill'?4:10,acted:false}];}
 if(kind==='reflect'||kind==='rangedReflect'){units=[{x:3,y:7,type:kind==='reflect'?'warrior':'archer',team:0,hp:kind==='reflect'?10:8,acted:false},{x:4,y:7,type:'guard',team:1,hp:15,acted:false}];}
 if(kind==='rest')units[0].hp=4;
 if(kind==='income'){gold=10;units=units.slice(0,1);at(3,7).city.level=2;at(6,6).city.owner=0;at(6,6).city.level=3;}
 if(kind==='wounded'){units=[{x:3,y:7,team:0,hp:5,acted:false},{x:4,y:7,team:1,hp:10,acted:false}];}
 if(kind==='win'||kind==='mutual'){units=[{x:8,y:3,team:0,hp:kind==='mutual'?1:10,acted:false}];if(kind==='mutual')units.push({x:9,y:3,team:1,hp:1,acted:false});at(8,3).type='grass';}
 if(kind==='lose')units=[{x:3,y:6,team:1,hp:10,acted:false}];
 if(kind==='cluster')units=[{x:3,y:7,team:0,hp:10,acted:false},{x:4,y:7,team:0,hp:10,acted:false},{x:4,y:6,team:0,hp:10,acted:false}];
 if(kind==='economy'){gold=100;researched.add('gathering');units=[{x:3,y:5,team:0,hp:10,acted:false}];for(const [x,y,type,resource] of [[3,6,'grass','fruit'],[4,7,'grass','fruit'],[2,7,'mountain','ore'],[2,8,'water','fish'],[2,6,'forest','game'],[3,8,'forest','wood'],[4,8,'grass','grain']])Object.assign(at(x,y),{type,resource,developed:false});}if(kind==='rest')gold=100;
 if(kind==='animals'){researched.add('hunting');Object.assign(at(4,7),{type:'forest',resource:'game'});at(4,8).type='forest';}
 if(kind==='bow'){gold=100;units=[{x:3,y:7,type:'archer',team:0,hp:8,acted:false},{x:5,y:7,team:1,hp:10,acted:false}];researched=new Set(['hunting','archery']);}
 if(kind==='diagonal'){units=[{x:3,y:7,team:0,hp:10,acted:false}];}
 if(kind==='mountain'){units=[{x:3,y:7,team:0,hp:10,acted:false}];Object.assign(at(4,7),{type:'mountain',resource:'ore'});gold=100;}
 if(kind==='siege'){gold=100;researched=new Set(['hunting','lumber','siege']);units=[{x:3,y:7,type:'catapult',team:0,hp:8,acted:false},{x:5,y:7,team:1,hp:6,acted:false}];for(const x of [3,4,5])at(x,7).type='grass';}

 if(kind==='navy'){gold=100;researched=new Set(['fishing','navigation','navalwarfare']);units=[{x:3,y:7,team:0,hp:10,acted:false}];at(4,7).type='water';at(5,7).type='water';}
 if(kind==='promote'){units=[{x:3,y:7,team:0,hp:1,kills:3,acted:true}];}
 if(kind==='thirdkill'){units=[{x:3,y:7,team:0,hp:10,kills:2,acted:false},{x:4,y:7,team:1,hp:3,acted:false}];}
 if(kind==='assassin'){gold=100;researched=new Set(['scouting','stealth','assassination']);units=[{x:3,y:7,team:0,type:'assassin',hp:10,acted:false}];}
 if(kind==='fog'){units=[{x:3,y:7,team:0,hp:10,acted:false},{x:5,y:7,team:1,hp:10,acted:false}];}
 if(kind==='capture'){units=[{x:6,y:5,team:0,hp:10,acted:false}];at(6,5).type='grass';}
 reveal();if(kind!=='fog')for(const t of world.flat()){t.visible=true;t.seen=true;}update();draw();},vision(){for(const t of world.flat())t.seen=false;reveal();update();draw();},get snapshot(){return{night:isNight(turn),visible:world.flat().filter(t=>t.visible).length,seen:world.flat().filter(t=>t.seen).length,stats:units.map(u=>stats(u)),nation:selectedNation.id,homeCapital,enemyCapital,map:world.flat().map(t=>t.type).join(),units,gold,turn,over,zoom,pan,panelOpen,selected,animating,animation:animation&&{position:animation.position,projectile:animation.projectile,pose:animation.pose},effects,researched:[...researched],resources:world.flat().filter(t=>t.resource&&!t.developed).map(t=>({x:t.x,y:t.y,resource:t.resource})),cities:world.flat().filter(t=>t.city).map(t=>({x:t.x,y:t.y,...t.city})),developed:world.flat().filter(t=>t.developed).map(t=>({x:t.x,y:t.y})),owner:at(enemyCapital.x,enemyCapital.y).city?.owner,targets:world.flat().filter(t=>available(t)).map(t=>({x:t.x,y:t.y,action:available(t)}))}}};`,
    });
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      json: { user: { id: 1, email: "game@example.com", nickname: "테스트" } },
    }),
  );
  await page.route("**/api/rooms/current", (route) =>
    route.fulfill({ json: { room: null } }),
  );
  await page.goto(process.env.TEST_URL || "http://localhost:3000");
  await page.waitForFunction(() => window.__gameTest);
  const snapshot = () => page.evaluate(() => window.__gameTest.snapshot);
  const fixture = (kind) =>
    page.evaluate((kind) => window.__gameTest.fixture(kind), kind);
  async function point(x, y, head = undefined) {
    return page.locator("#map").evaluate(
      (c, { x, y, head }) => {
        const v = window.__gameTest.view,
          t = v.hit.find((p) => p.t.x === x && p.t.y === y),
          r = c.getBoundingClientRect();
        return {
          x: r.left + v.ox + t.x * v.scale,
          y:
            r.top +
            v.oy +
            (t.y -
              ((head ??
              window.__gameTest.snapshot.units.some(
                (u) => u.team === 0 && u.x === x && u.y === y,
              ))
                ? 20
                : 0)) *
              v.scale,
        };
      },
      { x, y, head },
    );
  }
  async function clickTile(x, y, head = undefined) {
    const p = await point(x, y, head);
    await page.mouse.click(p.x, p.y);
    await page.waitForFunction(() => !window.__gameTest.snapshot.animating);
    await page.waitForTimeout(60);
  }
  async function harvest(name) {
    const keys = {
      "열매 수확": "fruit",
      "곡물 수확": "grain",
      "광산 개발": "ore",
      "어장 개발": "fish",
      "동물 사냥": "game",
      "목재 수확": "wood",
    };
    const t = (await snapshot()).resources.find(
      (t) => t.resource === keys[name],
    );
    assert(t, "resource exists: " + name);
    await clickTile(t.x, t.y, false);
    await page.click("#develop");
    while (await page.locator("#cityRewardDialog").isVisible()) {
      const expand = page.locator('[data-reward="expand"]');
      if (await expand.count()) await expand.click();
      else await page.locator('[data-reward="stars"]').click();
    }
    await clickTile(3, 7, false);
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
  await page.selectOption("#singleTimer", "300");
  await page.click("#singleMode");
  assert.equal(await page.locator("#nationDialog").isVisible(), true);
  assert.equal(await page.locator(".nation-card").count(), 8);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#nationDialog").isVisible(), true);
  assert.equal(await page.locator(".nation-preview").count(), 8);
  const previewImages = await page
    .locator(".nation-preview")
    .evaluateAll((canvases) => canvases.map((c) => c.toDataURL()));
  assert.equal(
    new Set(previewImages).size,
    8,
    "each country has distinct visual art",
  );
  await page.click('[data-nation="goguryeo"]');
  await page.click("#startNation");
  assert.equal((await snapshot()).nation, "goguryeo");
  assert((await snapshot()).researched.includes("hunting"));
  assert.equal(await page.locator("#kingdomName").innerText(), "고구려");
  assert.equal(await page.locator("#turnBanner").textContent(),"내 턴입니다");
  assert.equal(await page.locator(".map-caption").count(),0);
  assert.equal(await page.locator("#logs").isVisible(),false);
  const firstMap = (await snapshot()).map;
  await page.evaluate(() => window.__gameTest.choose());
  await page.click('[data-nation="rome"]');
  await page.click("#cancelNation");
  assert.equal((await snapshot()).nation, "goguryeo");
  await page.evaluate(() => window.__gameTest.choose());
  await page.click('[data-nation="rome"]');
  await page.click("#startNation");
  assert.equal((await snapshot()).nation, "rome");
  assert((await snapshot()).researched.includes("gathering"));
  assert.notEqual((await snapshot()).map, firstMap);
  await fixture("base");
  assert.equal(await page.locator("#actionPanel").isVisible(), false);
  await clickTile(3, 7);
  assert((await snapshot()).targets.some((t) => t.x === 4 && t.y === 7));
  const p = await point(4, 7);
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => !window.__gameTest.snapshot.animating);
  assert.equal((await snapshot()).units[0].x, 4);
  assert.equal(await page.evaluate(() => window.__resetWasPrompted), false);
  assert.equal(await page.locator("#gameMenu").isVisible(), false);
  assert.equal((await snapshot()).units[0].moved, true);
  assert.deepEqual((await snapshot()).targets, []);
  assert(
    (await page.evaluate(() => window.__renderFrames)).some((f) => f.animating),
    "movement produced visual animation frames",
  );
  await fixture("base");
  await clickTile(3,7,false);
  await clickTile(3,7,false);
  assert.equal(await page.locator("#productionDock").isVisible(),true,"second click selects the city below its unit");
  assert.deepEqual((await snapshot()).targets,[]);
  await fixture("base");
  await clickTile(6, 6, false);
  assert.equal(await page.locator("#actionPanel").isVisible(), false);
  assert.equal(await page.locator("#inspectCity").isVisible(), false);
  await clickTile(3, 7, false);
  assert.equal(
    await page.locator("#productionDock").isVisible(),
    false,
    "unit has priority over occupied city",
  );
  assert.equal(await page.locator("#inspectCity").isVisible(), true);
  await page.click("#inspectCity");
  assert.equal(await page.locator("#actionPanel").isVisible(), false);
  assert.equal(await page.locator("#productionDock").isVisible(), true);
  assert.equal(await page.locator(".resource-option").count(), 0);
  assert.equal(
    await page.locator("#productionUnits .production-icon:visible").count(),
    7,
  );
  const rows = await page
    .locator("#productionUnits button:visible:not(.production-info)")
    .evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().top)),
    );
  assert.equal(
    new Set(rows).size,
    1,
    "all production icons stay in one horizontal row",
  );
  assert.equal(await page.locator("#zoomMax").count(), 0);
  for (let i = 0; i < 12; i++) await page.click("#zoomIn");
  assert.equal((await snapshot()).zoom, 4);
  for (let i = 0; i < 30; i++) await page.click("#zoomOut");
  assert.equal((await snapshot()).zoom, 0.25);
  await fixture("income");
  assert.equal(await page.locator("#income").innerText(), "+7");
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  assert.equal((await snapshot()).gold, 17);
  await fixture("reflect");
  await clickTile(3,7); await clickTile(4,7);
  assert.equal((await snapshot()).units[0].hp,4);
  assert.equal((await snapshot()).units[1].hp,9);
  await fixture("rangedReflect");
  await clickTile(3,7); await clickTile(4,7);
  assert.equal((await snapshot()).units[0].hp,8);
  assert.equal((await snapshot()).units[1].hp,10);
  await fixture("wounded");
  await clickTile(3, 7);
  await clickTile(4, 7);
  assert.equal((await snapshot()).units[1].hp, 7);
  assert.equal((await snapshot()).units[0].hp, 2);
  await fixture("fog");
  await clickTile(3, 7);
  await clickTile(4, 7, false);
  assert(
    (await snapshot()).targets.some(
      (t) => t.x === 5 && t.y === 7 && t.action === "attack",
    ),
  );
  await clickTile(5, 7);
  assert.equal((await snapshot()).units[1].hp, 4);
  await fixture("cluster");
  await page.click("#zoomIn");
  await page.click("#zoomIn");
  for (const [x, y] of [
    [3, 7],
    [4, 7],
    [4, 6],
    [4, 7],
  ]) {
    await clickTile(x, y, false);
    assert.deepEqual((await snapshot()).selected, { x, y });
  }
  await fixture("economy");
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruit").isEnabled(), true);

  await harvest("열매 수확");
  assert.match(
    await page.locator("#cityGrowthText").innerText(),
    /경험치 1 \/ 2/,
  );
  await harvest("열매 수확");
  let state = await snapshot();
  assert.equal(state.cities.find((c) => c.owner === 0).level, 2);
  assert.equal(state.cities.find((c) => c.owner === 0).population, 2);
  assert.equal(state.gold, 96);
  assert.equal(await page.locator("#income").innerText(), "+4");
  await page.click("#recruit");
  state = await snapshot();
  assert.equal(state.gold, 93);
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
  assert.equal(state.gold, 97);
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
  const closeBefore = await page.locator("#closeResearch").boundingBox();
  assert(closeBefore.width >= 44 && closeBefore.height >= 44);
  await page.locator(".research-content").evaluate(el => el.scrollTop = el.scrollHeight);
  const closeAfter = await page.locator("#closeResearch").boundingBox();
  assert.equal(closeAfter.y, closeBefore.y);
  await page.click("#closeResearch");
  await research("사냥");
  assert.equal((await snapshot()).gold, 95);
  assert((await snapshot()).researched.includes("hunting"));
  await research("도로");
  await research("기병");
  assert.equal((await snapshot()).gold, 80);
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruitRider").isDisabled(), true);
  await harvest("열매 수확");
  await harvest("열매 수확");
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
  await harvest("곡물 수확");
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
  await page.evaluate(() => window.__gameTest.vision());
  const beforeScout = Number(await page.locator("#land").innerText());
  await research("정찰");
  assert(Number(await page.locator("#land").innerText()) > beforeScout);
  await research("등산");
  await research("제련");
  await clickTile(3, 7);
  await harvest("광산 개발");
  assert((await snapshot()).cities.find((c) => c.owner === 0).level >= 2);
  await fixture("economy");
  await research("낚시");
  await clickTile(3, 7);
  await harvest("어장 개발");
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 2);
  await fixture("economy");
  await research("사냥");
  await clickTile(3, 7);
  await harvest("동물 사냥");
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
  assert.equal(state.cities.find((c) => c.x === 6 && c.y === 6).owner, -1);
  assert.equal(await page.locator("#claimVillage").isDisabled(), true);
  await page.locator("#endTurn").click();
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  await page.locator("#claimVillage").click();
  state = await snapshot();
  assert.equal(state.cities.find((c) => c.x === 6 && c.y === 6).owner, 0);
  assert.equal(state.units[0].acted, true);
  assert.deepEqual(state.targets, []);
  await fixture("win");
  await clickTile(8, 3);
  await clickTile(9, 3);
  assert.equal((await snapshot()).over, false);
  assert.equal((await snapshot()).owner, 1);
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  await page.click("#claimVillage");
  assert((await snapshot()).over);
  assert.equal((await snapshot()).units[0].x, 9);
  await fixture("lose");
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  assert.equal((await snapshot()).over, false);
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
  await clickTile(2, 6, false);
  assert.equal(await page.locator("#develop").isDisabled(), true);
  await research("사냥");
  await harvest("동물 사냥");
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 2);
  await research("벌목");
  await research("투석기");
  assert.equal(await page.locator("#recruitCatapult").isDisabled(), true);
  await harvest("목재 수확");
  await harvest("열매 수확");
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 3);
  await page.click("#recruitCatapult");
  assert.equal((await snapshot()).units[1].type, "catapult");
  await fixture("economy");
  await research("등산");
  await research("제련");
  await research("기사");
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruitKnight").isDisabled(), true);
  await harvest("광산 개발");
  await harvest("열매 수확");
  await harvest("열매 수확");
  assert.equal((await snapshot()).cities.find((c) => c.owner === 0).level, 3);
  await page.click("#recruitKnight");
  assert.equal((await snapshot()).units[1].type, "knight");
  await page.evaluate(() => window.__renderFrames = []);
  await fixture("siege");
  await clickTile(3, 7);
  assert(
    (await snapshot()).targets.some(
      (t) => t.x === 5 && t.y === 7 && t.action === "attack",
    ),
  );
  await clickTile(5, 7);
  state = await snapshot();
  assert(await page.evaluate(() => window.__renderFrames.some(f => f.projectile && !f.projectile.arrow)));
  assert.equal(state.units.length, 1);
  assert.equal(state.units[0].x, 3);
  assert.equal(state.units[0].hp, 8);
  await fixture("diagonal");
  await clickTile(3, 7);
  assert((await snapshot()).targets.some((t) => t.x === 4 && t.y === 8));
  await clickTile(4, 8);
  assert.deepEqual(
    { x: (await snapshot()).units[0].x, y: (await snapshot()).units[0].y },
    { x: 4, y: 8 },
  );
  await fixture("animals");
  await clickTile(4, 7);
  assert.match(await page.locator("#tileDescription").innerText(), /야생동물/);
  const countDeer = () =>
    page.locator("#map").evaluate((c) => {
      const { data } = c.getContext("2d").getImageData(0, 0, c.width, c.height);
      let count = 0;
      for (let i = 0; i < data.length; i += 4)
        if (
          Math.abs(data[i] - 224) < 3 &&
          Math.abs(data[i + 1] - 191) < 3 &&
          Math.abs(data[i + 2] - 141) < 3
        )
          count++;
      return count;
    });
  assert(
    (await countDeer()) > 5,
    "animal sprite is visible despite adjacent forest",
  );
  await page.click("#develop");
  assert((await countDeer()) < 5, "harvest removes the animal sprite (allow isolated antialias pixels)");
  assert(!(await snapshot()).resources.some(t => t.x === 4 && t.y === 7));
  await fixture("economy");
  await research("사냥");
  await research("궁술");
  await clickTile(3, 7);
  assert.equal(await page.locator("#recruitArcher").isDisabled(), true);
  await harvest("열매 수확");
  await harvest("열매 수확");
  await page.click("#recruitArcher");
  assert.equal((await snapshot()).units[1].type, "archer");
  assert.equal((await snapshot()).units[1].acted, true);
  await fixture("bow");
  await research("정밀 사격");
  await page.evaluate(() => {
    const t = window.__gameTest.view.hit.find(
      (p) => p.t.x === 5 && p.t.y === 7,
    ).t;
    t.visible = true;
    t.seen = true;
  });
  await clickTile(3, 7);
  await clickTile(5, 7);
  state = await snapshot();
  assert(await page.evaluate(() => window.__renderFrames.some(f => f.projectile?.arrow)));
  assert.equal(state.units[1].hp, 3);
  assert.equal(state.units[0].hp, 8);
  assert.equal(state.units[0].x, 3);
  await fixture("navy");
  await clickTile(3, 7);
  await clickTile(4, 7);
  state = await snapshot();
  assert.equal(state.units[0].boat, "transport");
  assert.equal(state.stats[0].attack, 0);
  await page.click("#upgradeScout");
  assert.equal((await snapshot()).units[0].boat, "scout");
  assert.equal((await snapshot()).gold, 97);
  await page.click("#upgradeWarship");
  assert.equal((await snapshot()).units[0].boat, "warship");
  assert.equal((await snapshot()).gold, 92);
  assert.equal((await snapshot()).stats[0].attack, 7);
  await fixture("thirdkill");
  await clickTile(3, 7);
  await clickTile(4, 7);
  assert.equal((await snapshot()).units[0].kills, 3);
  assert.equal(await page.locator("#promoteUnit").isVisible(), true);
  await page.click("#promoteUnit");
  state = await snapshot();
  assert.equal(state.units[0].veteran, true);
  assert.equal(state.units[0].hp, 15);
  assert.equal(state.stats[0].hp, 15);
  await fixture("assassin");
  assert.equal((await snapshot()).stats[0].attack, 1);
  assert.equal((await snapshot()).stats[0].moves, 1);
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  assert.equal((await snapshot()).night, true);
  assert.equal((await snapshot()).stats[0].attack, 10);
  assert.equal((await snapshot()).stats[0].moves, 3);
  assert.match(await page.locator("#phaseBadge").innerText(), /밤/);
  await fixture("fog");
  state = await snapshot();
  assert(state.seen < 20);
  assert.equal(state.visible, 9);
  assert.equal(
    await page
      .locator("#map")
      .evaluate(
        () =>
          window.__gameTest.view.hit.find((p) => p.t.x === 5 && p.t.y === 7)
            .unit,
      ),
    false,
  );
  await page.click("#endTurn");
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  assert((await snapshot()).visible < 9);
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
      y: r.top + v.oy + (p.y - 16) * v.scale,
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

  await fixture("base");
  await page.evaluate(() => window.__gameTest.expireTurn());
  await page.waitForFunction(() => window.__gameTest.snapshot.turn === 2);
  assert.equal(
    (await snapshot()).gold,
    6,
    "single-player timeout ends the turn and pays city income",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: eight unique nation art previews, sailing and ship upgrades, kill promotion, day/night assassins and fog, nation selection, movement/combat, research, victory/defeat and multi-touch",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
