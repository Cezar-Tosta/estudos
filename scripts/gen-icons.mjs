// Gera os ícones PNG do PWA sem dependências: node scripts/gen-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // profundidade
  header[9] = 2; // RGB
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgb.copy(raw, y * stride + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const CHECK = [
  [0.38, 0.51],
  [0.47, 0.6],
  [0.63, 0.41],
];

// Cobertura (0..1) do glifo branco (anel + check) no ponto (x, y) em coords 0..1.
function glyph(x, y) {
  const ring = Math.abs(Math.hypot(x - 0.5, y - 0.5) - 0.3) <= 0.025;
  const check =
    distToSegment(x, y, ...CHECK[0], ...CHECK[1]) <= 0.045 ||
    distToSegment(x, y, ...CHECK[1], ...CHECK[2]) <= 0.045;
  return ring || check ? 1 : 0;
}

function render(size) {
  const rgb = Buffer.alloc(size * size * 3);
  const ss = 3; // supersampling p/ suavizar bordas
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          cover += glyph((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size);
        }
      }
      cover /= ss * ss;
      const t = (x + y) / (2 * size);
      const bg = [0x63 + (0x43 - 0x63) * t, 0x66 + (0x38 - 0x66) * t, 0xf1 + (0xca - 0xf1) * t];
      const i = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) rgb[i + c] = Math.round(bg[c] + (255 - bg[c]) * cover);
    }
  }
  return encodePng(size, rgb);
}

mkdirSync("public/icons", { recursive: true });
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(`public/icons/${name}`, render(size));
  console.log(`public/icons/${name}`);
}
