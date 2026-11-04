process.chdir(require("node:path").resolve(__dirname, ".."));
const fs = require("node:fs");
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage();
    await p.goto(
      (process.env.TEST_URL || "http://localhost:3000") +
        "/tools/render-animal-icons.html",
    );
    await p.waitForFunction(() => window.renderAnimalIcon);
    for (const nation of [
      "rome",
      "goguryeo",
      "egypt",
      "persia",
      "han",
      "greece",
      "mongol",
      "maurya",
    ]) {
      fs.mkdirSync("public/animal-preview/icons/" + nation, {
        recursive: true,
      });
      for (const kind of [
        "warrior",
        "guard",
        "archer",
        "rider",
        "knight",
        "assassin",
        "giant",
        "catapult",
      ]) {
        if (
          process.env.UNIT_ICON_KINDS &&
          !process.env.UNIT_ICON_KINDS.split(",").includes(kind)
        )
          continue;
        const data = await p.evaluate(
          ([n, k]) => window.renderAnimalIcon(n, k),
          [nation, kind],
        );
        fs.writeFileSync(
          "public/animal-preview/icons/" + nation + "/" + kind + ".png",
          Buffer.from(data, "base64"),
        );
      }
      console.log("Rendered animal sprites", nation);
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
