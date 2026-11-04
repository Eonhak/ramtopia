import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, basename } from "node:path";
import { createApp } from "../server/app.js";
test("self-hosted preview directories and animal media use their actual static files and MIME types", async () => {
  const dist = resolve("dist");
  mkdirSync(dist, { recursive: true });
  const folder = mkdtempSync(resolve(dist, "static-assets-test-"));
  const files = {
    "index.html": ["text/html; charset=utf-8", "<h1>Animal preview</h1>"],
    "guard.glb": ["model/gltf-binary", "glTF"],
    "guard.png": ["image/png", "PNG"],
    "walking.mp4": ["video/mp4", "movie"],
    "walking.gif": ["image/gif", "GIF89a"],
  };
  for (const [name, [, body]] of Object.entries(files))
    writeFileSync(resolve(folder, name), body);
  const server = createApp({ dbPath: ":memory:" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin =
    "http://127.0.0.1:" + server.address().port + "/" + basename(folder) + "/";
  try {
    for (const [name, [mime, body]] of Object.entries(files)) {
      const response = await fetch(
        origin + (name === "index.html" ? "" : name),
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), mime);
      assert.equal(await response.text(), body);
    }
    const missing = await fetch(origin + "missing.glb");
    assert.equal(missing.status, 404);
  } finally {
    await new Promise((r) => server.close(r));
    rmSync(folder, { recursive: true, force: true });
  }
});
