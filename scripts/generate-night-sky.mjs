// A composed stellar landscape. Generation runs offline, never in the browser.
// Run: node scripts/generate-night-sky.mjs
import { mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const width = 1920,
  height = 1200;
const pixels = new Float32Array(width * height * 3);
const clamp = (n) => Math.max(0, Math.min(1, n));
function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed),
    b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed),
    d = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}
function fbm(x, y, seed, octaves = 5) {
  let value = 0,
    scale = 0.5,
    total = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise(x, y, seed + i * 1031) * scale;
    total += scale;
    scale *= 0.5;
    x *= 2.02;
    y *= 2.02;
  }
  return value / total;
}
function field(u, v) {
  const path = 1.09 - u * 0.87 + Math.sin(u * 5.1) * 0.045;
  const detail = fbm(u * 12, v * 10, 4127);
  const clusters = fbm(u * 8, v * 8, 9257);
  const distance = v - path + (detail - 0.5) * 0.1;
  const broad = Math.exp(-((distance / (0.12 + clusters * 0.1)) ** 2));
  const spine = Math.exp(-((distance / (0.045 + clusters * 0.055)) ** 2));
  const dust = fbm(u * 21 + detail, v * 16, 7251, 6);
  const lane =
    Math.exp(-(((distance - 0.008 + (detail - 0.5) * 0.04) / 0.026) ** 2)) *
    clamp((dust - 0.4) * 2.8);
  const extinction = 1 - lane * 0.83;
  return { broad, spine, clusters, extinction };
}
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const u = x / width,
      v = y / height;
    const { broad, spine, clusters, extinction } = field(u, v);
    const grains = hash(x, y, 19023);
    const stellar =
      (broad * 13 + spine * (12 + clusters ** 2 * 88)) * extinction;
    // Unresolved stars supply granular light, rather than smooth smoke edges.
    const grain = (grains - 0.5) * stellar * 0.45;
    const warm = Math.exp(-(((u - 0.68) / 0.27) ** 2)) * spine;
    const index = (y * width + x) * 3;
    pixels[index] = 4 + stellar * (0.88 + warm * 0.14) + grain;
    pixels[index + 1] = 7 + stellar * (0.9 + warm * 0.05) + grain;
    pixels[index + 2] = 13 + stellar * (1.08 - warm * 0.11) + grain;
  }
}
function star(u, v, radius, light, tint = [0.8, 0.88, 1]) {
  const px = u * width,
    py = v * height;
  const reach = Math.ceil(radius * 3);
  for (let y = Math.floor(py) - reach; y <= Math.ceil(py) + reach; y++)
    for (let x = Math.floor(px) - reach; x <= Math.ceil(px) + reach; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const d = ((x - px) ** 2 + (y - py) ** 2) / (radius * radius);
      const value = Math.exp(-d * 2) * light;
      const index = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) pixels[index + c] += value * tint[c];
    }
}
// Many unresolved stars in the Milky Way, a restrained number across dark sky.
for (let i = 0; i < 42000; i++) {
  const u = hash(i, 17, 19471),
    v = hash(i, 31, 31591);
  const f = field(u, v);
  const chance = (0.035 + f.spine * 0.76 + f.broad * 0.2) * f.extinction;
  if (hash(i, 71, 12587) > chance) continue;
  star(u, v, 0.45 + hash(i, 57, 15791) * 0.3, 15 + hash(i, 89, 48187) * 33);
}
for (let i = 0; i < 390; i++) {
  const u = hash(i, 11, 7817),
    v = hash(i, 23, 32879);
  const f = field(u, v);
  const light =
    (75 + hash(i, 17, 23981) ** 2 * 175) * (0.65 + f.extinction * 0.35);
  const radius = 0.95 + hash(i, 29, 9773) ** 2 * 0.5;
  star(u, v, radius, light, i % 11 === 0 ? [1, 0.87, 0.7] : [0.8, 0.88, 1]);
  if (light > 160) star(u, v, radius * 2.5, light * 0.045);
}
// These sources also anchor the few CSS glimmers on the same image plane.
for (const [u, v] of [
  [0.81, 0.16],
  [0.68, 0.39],
  [0.35, 0.73],
  [0.09, 0.32],
  [0.92, 0.54],
  [0.22, 0.88],
]) {
  star(u, v, 1.25, 205, [0.9, 0.94, 1]);
  star(u, v, 3.5, 9, [0.72, 0.84, 1]);
}
const output = new URL("../public/backgrounds/milky-way.webp", import.meta.url);
await mkdir(new URL(".", output), { recursive: true });
const bytes = Buffer.from(
  pixels.map((value) => Math.round(Math.max(0, Math.min(255, value)))),
);
await sharp(bytes, { raw: { width, height, channels: 3 } })
  .webp({ quality: 88, effort: 6 })
  .toFile(fileURLToPath(output));
console.log(
  `milky-way.webp: ${width}x${height}, ${(await stat(output)).size} bytes`,
);
