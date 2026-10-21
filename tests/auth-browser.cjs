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
        url: `http://127.0.0.1:${server.address().port}${url.pathname}${url.search}`,
      });
      await route.fulfill({ response });
    });
    await page.goto("http://localhost:3000");
    await page.locator("#accountDialog").waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#nationDialog").isVisible(),
      false,
      "login precedes nation selection",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#accountDialog").isVisible(),
      true,
      "login cannot be skipped",
    );
    assert.equal(await page.locator("#accountButton").textContent(), "로그인");
    await page.click("#registerTab");
    await page.fill("#accountNickname", "테스트왕");
    await page.fill("#accountEmail", "browser@example.com");
    await page.fill("#accountPassword", "browser-password-123");
    await page.click("#submitAccount");
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "테스트왕",
    );
    assert.equal(await page.locator("#accountDialog").isVisible(), false);
    assert.equal(
      await page.locator("#modeDialog").isVisible(),
      true,
      "signup advances to mode selection",
    );
    assert.equal(await page.locator("#accountPassword").inputValue(), "");
    // Logout immediately after signup, before a reload resets the form mode.
    await page.click("#singleMode");
    await page.click('[data-nation="rome"]');
    await page.click("#startNation");
    await page.click("#accountButton");
    await page.click("#logoutAccount");
    await page.waitForFunction(
      () => document.getElementById("submitAccount").textContent === "로그인",
    );
    assert.equal(await page.locator("#nicknameField").isVisible(), false);
    assert.equal(await page.locator("#nationDialog").isVisible(), false);
    await page.fill("#accountEmail", "browser@example.com");
    await page.fill("#accountPassword", "browser-password-123");
    await page.click("#submitAccount");
    await page.locator("#modeDialog").waitFor({ state: "visible" });
    await page.reload();
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "테스트왕",
    );
    await page.click("#singleMode");
    await page.click('[data-nation="rome"]');
    await page.click("#startNation");
    await page.click("#accountButton");
    await page.click("#logoutAccount");
    await page.waitForFunction(
      () => document.getElementById("accountButton").textContent === "로그인",
    );
    assert.equal(await page.locator("#accountDialog").isVisible(), true);
    assert.equal(await page.locator("#nationDialog").isVisible(), false);
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
      "PASS: mandatory login before game mode and nation selection, signup, session restore, logout and failed login",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
