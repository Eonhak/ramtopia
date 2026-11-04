import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const nations = [
  "rome",
  "goguryeo",
  "egypt",
  "persia",
  "han",
  "greece",
  "mongol",
  "maurya",
];
const kinds = [
  "warrior",
  "guard",
  "archer",
  "rider",
  "knight",
  "assassin",
  "giant",
  "catapult",
];
for (const nation of nations)
  test(
    nation + " animal meshes include working idle, walking and attack tracks",
    async () => {
      for (const kind of kinds) {
        const buffer = await readFile(
          new URL(
            "../public/animal-preview/models/" + nation + "/" + kind + ".glb",
            import.meta.url,
          ),
        );
        const asset = await new GLTFLoader().parseAsync(
          buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ),
          "",
        );
        const mixer = new T.AnimationMixer(asset.scene);
        for (const clip of asset.animations) mixer.clipAction(clip).play();
        const bone = asset.scene.getObjectByName(
          kind === "catapult"
            ? "Weapon"
            : kind === "rider"
              ? "Pony_leg"
              : "HipL",
        );
        assert(bone, kind);
        if (kind !== "catapult") {
          mixer.setTime(0.2);
          const idle = bone.rotation.x;
          mixer.setTime(2.3);
          const a = bone.rotation.x;
          mixer.setTime(2.6);
          const b = bone.rotation.x;
          assert(Math.abs(a - b) > 0.3, kind + " has a real walking stride");
          assert(Math.abs(a - idle) > 0.1);
        }
        const weapon = asset.scene.getObjectByName(
          kind === "guard"
            ? "ShoulderL"
            : kind === "archer"
              ? "ShoulderR"
              : "Weapon",
        );
        mixer.setTime(4.4);
        const rest = weapon.quaternion.clone();
        mixer.setTime(4.9);
        assert(
          rest.angleTo(weapon.quaternion) > 0.4,
          kind + " has an attack motion",
        );
        if (kind === "guard") {
          assert(asset.scene.getObjectByName("Shield").scale.x > 1.6);
          assert(!asset.scene.getObjectByName("Shaped_bevel_sword"));
          assert(!asset.scene.getObjectByName("Rounded_breastplate"));
        }
        const sprite = await readFile(
          new URL(
            "../public/animal-preview/icons/" + nation + "/" + kind + ".png",
            import.meta.url,
          ),
        );
        assert.equal(sprite.readUInt32BE(16), 128 * 9);
        assert.equal(sprite.readUInt32BE(20), 160);
      }
    },
  );
