const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const { createApp } = await import("../server/app.js");
  const server = createApp({
    dbPath: ":memory:",
    allowedOrigins: "http://localhost:3000",
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const backend = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      headless: true,
      args: ["--no-sandbox"],
    });
    const pages = [],
      errors = [];
    for (let i = 0; i < 4; i++) {
      const signup = await fetch(backend + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `multi${i}@example.com`,
          password: "multiplayer-password",
          nickname: `왕국${i + 1}`,
        }),
      });
      assert.equal(signup.status, 201);
      const cookie = signup.headers.get("set-cookie").split(";")[0].split("=");
      const context = await browser.newContext({
        viewport: { width: i === 0 ? 390 : 1100, height: 844 },
      });
      await context.addCookies([
        { name: cookie[0], value: cookie[1], url: "http://localhost:3000" },
      ]);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("response", async (r) => {
        if (r.url().includes("/api/") && r.status() >= 400)
          console.log(
            "API failure",
            new URL(r.url()).pathname,
            r.status(),
            await r.text(),
          );
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/api/**", async (route) => {
        const u = new URL(route.request().url());
        const response = await route.fetch({
          url: backend + u.pathname + u.search,
        });
        await route.fulfill({ response });
      });
      await context.route(/\/src\/main\.js(?:\?.*)?$/, async (route) => {
        const res = await route.fetch();
        await route.fulfill({
          response: res,
          body:
            (await res.text()) +
            "\nwindow.__multiView=()=>({view,units,gold,busy,world,multiGame});",
        });
      });
      pages.push(page);
    }
    const host = pages[0];
    await host.goto("http://localhost:3000");
    await host.locator("#modeDialog").waitFor({ state: "visible" });
    await host.screenshot({ path: "/tmp/ramtopia-mode.png" });
    await host.fill("#newRoomTitle", "네 왕국의 대결");
    await host.selectOption("#newRoomTimer", "600");
    await host.click("#createRoom");
    await host.locator("#roomDialog").waitFor({ state: "visible" });
    const link = await host.locator("#inviteLink").inputValue();
    assert(link.includes("?room="));
    assert.equal(await host.locator("#startRoom").isDisabled(), true);
    for (const page of pages.slice(1)) {
      await page.goto(link);
      await page.locator("#roomDialog").waitFor({ state: "visible" });
    }
    await host.waitForFunction(
      () => document.getElementById("roomCount").textContent === "4 / 8명",
    );
    await host
      .locator(".room-player")
      .filter({ hasText: "왕국1" })
      .locator("select")
      .selectOption("greece");
    for (let i = 0; i < 4; i++) {
      await pages[i].click("#readyRoom");
      await pages[i]
        .locator(".room-player")
        .filter({ hasText: `왕국${i + 1}` })
        .locator(".ready")
        .waitFor();
    }
    await host.screenshot({ path: "/tmp/ramtopia-room.png" });
    await host.waitForFunction(
      () => !document.getElementById("startRoom").disabled,
    );
    await host.click("#startRoom");
    for (const page of pages) {
      await page.waitForFunction(() => window.__multiView()?.multiGame);
      assert.equal(await page.locator("#roomDialog").isVisible(), false);
    }
    await host.screenshot({ path: "/tmp/ramtopia-multi.png" });
    assert.equal(await host.locator("#endTurn").isDisabled(), false);
    assert.equal(await pages[1].locator("#endTurn").isDisabled(), true);
    assert.equal(await host.locator("#turnBanner").textContent(),"내 턴입니다");
    assert.equal(await pages[1].locator("#turnBanner").textContent(),"왕국1님의 턴입니다");
    for (const p of pages) {
      assert.equal(await p.locator("#logs").isVisible(),false);
      assert.deepEqual(await p.evaluate(() => window.__multiView().multiGame.logs),[]);
    }
    assert.match(
      await host.locator("#turnClock").textContent(),
      /^(10:00|9:5\d)$/,
    );
    // Move through the actual canvas, then check stars/turn synchronization across all four clients.
    const actor = await host.evaluate(() =>
      window.__multiView().units.find((u) => u.team === 0),
    );
    async function click(page, x, y) {
      const p = await page.locator("#map").evaluate(
        (c, { x, y }) => {
          const v = window.__multiView().view,
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
    await click(host, actor.x, actor.y);
    const target = await host.evaluate(
      () =>
        window
          .__multiView()
          .view.hit.find((p) => p.available === "move" && !p.t.city)?.t,
    );
    assert(target, "initial unit has a walkable tile");
    await click(host, target.x, target.y);
    await host.waitForFunction(
      ({ x, y }) =>
        window
          .__multiView()
          .units.some((u) => u.team === 0 && u.x === x && u.y === y),
      target,
    );
    await host.click("#endTurn");
    for (const page of pages)
      await page.waitForFunction(
        () => window.__multiView().multiGame.activeSeat === 1,
      );
    assert.equal(await pages[1].locator("#endTurn").isDisabled(), false);
    assert.equal(await pages[1].locator("#turnBanner").textContent(),"내 턴입니다");
    assert.equal(await host.locator("#turnBanner").textContent(),"왕국2님의 턴입니다");
    assert.equal(await host.locator("#gold").textContent(), "6");
    await host.click("#newGame");
    assert.equal(await host.locator("#gameMenu").isVisible(), true);
    await host.click("#menuMain");
    assert.equal(await host.locator("#modeDialog").isVisible(), true);
    await host.waitForTimeout(1500);
    assert.equal(await host.locator("#modeDialog").isVisible(), true,"background polling keeps main menu open");
    await host.click("#continueMatch");
    assert.equal(await host.locator("#modeDialog").isVisible(), false);
    const context = pages[2].context();
    await pages[2].close();
    pages[2] = await context.newPage();
    pages[2].on("pageerror", e => errors.push(e.message));
    await pages[2].goto(process.env.TEST_URL || "http://localhost:3000");
    await pages[2].waitForFunction(
      () => window.__multiView()?.multiGame?.activeSeat === 1,
    );
    assert.equal(
      await pages[2].locator("#modeDialog").isVisible(),
      false,
      "reloading rejoins existing game",
    );
    for (const page of pages.slice(1)) {
      await page.click("#endTurn");
      const expected = (pages.indexOf(page) + 1) % 4;
      for (const p of pages)
        await p.waitForFunction(
          (s) => window.__multiView().multiGame.activeSeat === s,
          expected,
        );
    }
    assert.equal(await host.locator("#endTurn").isDisabled(), false);
    assert.equal(
      await host.evaluate(() => window.__multiView().multiGame.round),
      2,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: four authenticated browsers, invitation, nation selection, ready/start, canvas movement, turn sync, stars and reconnect",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
