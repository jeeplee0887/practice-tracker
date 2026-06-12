// Generates placeholder PWA icons (indigo rounded square + white quarter note)
// as valid PNGs, with zero image dependencies. Replace public/icon-*.png with
// real artwork anytime; rerun with: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

const BG = [99, 102, 241]; // indigo #6366f1
const FG = [255, 255, 255];

function makePng(size) {
  const px = (x, y, c) => {
    const i = (y * size + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = 255;
  };
  const data = new Uint8Array(size * size * 4);

  const radius = size * 0.18;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      px(x, y, insideRoundedRect(x, y, size, radius) ? BG : BG);
    }
  }
  // Quarter note: filled note head (ellipse) + vertical stem.
  const headCx = size * 0.42;
  const headCy = size * 0.68;
  const rx = size * 0.13;
  const ry = size * 0.1;
  const stemW = size * 0.045;
  const stemX = headCx + rx - stemW;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - headCx) / rx;
      const dy = (y - headCy) / ry;
      const inHead = dx * dx + dy * dy <= 1;
      const inStem =
        x >= stemX &&
        x <= stemX + stemW &&
        y <= headCy &&
        y >= size * 0.26;
      const inFlag =
        x >= stemX &&
        x <= stemX + size * 0.16 &&
        y >= size * 0.26 &&
        y <= size * 0.26 + (x - stemX) * 0.9;
      if (inHead || inStem || inFlag) px(x, y, FG);
    }
  }
  return encodePng(size, size, data);
}

function insideRoundedRect(x, y, size, r) {
  const minX = r,
    minY = r,
    maxX = size - r,
    maxY = size - r;
  if (x >= minX && x <= maxX) return true;
  if (y >= minY && y <= maxY) return true;
  const cx = x < minX ? minX : maxX;
  const cy = y < minY ? minY : maxY;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw image: one filter byte (0) per row
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

for (const size of [192, 512]) {
  writeFileSync(join(publicDir, `icon-${size}.png`), makePng(size));
  console.log(`wrote icon-${size}.png`);
}
