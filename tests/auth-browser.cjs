const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const { createApp } = await import("../server/app.js");
  const server = createApp({
    dbPath: ":memory:",
    allowedOrigins: "http://localhost:3000",
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : {}),
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({
        url: `http://127.0.0.1:${server.address().port}${url.pathname}`,
      });
      await route.fulfill({ response });
    });
    await page.goto("http://localhost:3000");
    await page.click('[data-nation="rome"]');
    await page.click("#startNation");
    assert.equal(await page.locator("#accountButton").textContent(), "로그인");
    await page.click("#accountButton");
    await page.click("#registerTab");
    await page.fill("#accountNickname", "테스트왕");
    await page.fill("#accountEmail", "browser@example.com");
    await page.fill("#accountPassword", "browser-password-123");
    await page.click("#submitAccount");
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "테스트왕",
    );
    assert.equal(await page.locator("#accountProfile").isVisible(), true);
    assert.equal(await page.locator("#accountPassword").inputValue(), "");
    const box = await page.locator("#accountDialog").boundingBox();
    assert(
      box.x >= 0 && box.x + box.width <= 390,
      "account dialog fits mobile screen",
    );
    await page.reload();
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "테스트왕",
    );
    await page.click('[data-nation="rome"]');
    await page.click("#startNation");
    await page.click("#accountButton");
    await page.click("#logoutAccount");
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "로그인",
    );
    await page.fill("#accountEmail", "browser@example.com");
    await page.fill("#accountPassword", "wrong-password");
    await page.click("#submitAccount");
    await page
      .getByText("이메일 또는 비밀번호를 확인하세요.", { exact: true })
      .waitFor();
    await page.fill("#accountPassword", "browser-password-123");
    await page.click("#submitAccount");
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "테스트왕",
    );
    console.log(
      "PASS: mobile registration, cookie session across reload, logout, failed and successful login",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
