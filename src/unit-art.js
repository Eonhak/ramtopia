// One canonical set of GLB models and rendered sprite sheets for every game surface.
export const ANIMAL_NATIONS = [
  "rome",
  "goguryeo",
  "egypt",
  "persia",
  "han",
  "greece",
  "mongol",
  "maurya",
];
export const UNIT_KINDS = [
  "warrior",
  "guard",
  "archer",
  "rider",
  "knight",
  "assassin",
  "giant",
  "catapult",
];
export function animalURL(nation, kind, icons = false) {
  const n = ANIMAL_NATIONS.includes(nation) ? nation : "rome",
    k = UNIT_KINDS.includes(kind) ? kind : "warrior";
  return new URL(
    "animal-preview/" +
      (icons ? "icons/" : "models/") +
      n +
      "/" +
      k +
      (icons ? ".png" : ".glb") +
      "?v=3.3.0",
    document.baseURI,
  ).href;
}
const sprites = new Map();
let notify = null;
export function animalSprite(nation, kind) {
  const url = animalURL(nation, kind, true);
  let image = sprites.get(url);
  if (!image) {
    image = new Image();
    sprites.set(url, image);
    image.onload = () => {
      if (!notify)
        notify = requestAnimationFrame(() => {
          notify = null;
          window.dispatchEvent(new Event("unit-art-ready"));
        });
    };
    image.src = url;
  }
  return image.complete && image.naturalWidth ? image : null;
}
