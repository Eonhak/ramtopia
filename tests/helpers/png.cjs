// Decode browser PNG screenshots without adding an image dependency.
const { inflateSync } = require("node:zlib");
exports.pixels = function (buffer) {
  let width, height, channels;
  const chunks = [];
  for (let pos = 8; pos < buffer.length;) {
    const size = buffer.readUInt32BE(pos),
      type = buffer.toString("ascii", pos + 4, pos + 8),
      data = buffer.subarray(pos + 8, pos + 8 + size);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || ![2, 6].includes(data[9]))
        throw Error("Expected an 8-bit RGB/RGBA screenshot");
      channels = data[9] === 6 ? 4 : 3;
    }
    if (type === "IDAT") chunks.push(data);
    pos += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)),
    stride = width * channels,
    pixels = Buffer.alloc(stride * height);
  let source = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c,
      da = Math.abs(p - a),
      db = Math.abs(p - b),
      dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[source++];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x,
        left = x >= channels ? pixels[i - channels] : 0,
        up = y ? pixels[i - stride] : 0,
        upperLeft = y && x >= channels ? pixels[i - stride - channels] : 0;
      pixels[i] =
        (raw[source++] +
          (filter === 0
            ? 0
            : filter === 1
              ? left
              : filter === 2
                ? up
                : filter === 3
                  ? Math.floor((left + up) / 2)
                  : filter === 4
                    ? paeth(left, up, upperLeft)
                    : (() => {
                        throw Error("Unknown PNG filter");
                      })())) &
        255;
    }
  }
  return { width, height, channels, pixels };
};
