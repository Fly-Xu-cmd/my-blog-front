// Offline, deterministic artwork; browsers only download the finished WebP.
// Run with: node scripts/generate-nebula.mjs
import { mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Use the image encoder already shipped with our declared Next dependency.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const width = 1800;
const height = 1200;
const pixels = Buffer.alloc(width * height * 3);

function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy, seed) * (1 - sx) + hash(ix + 1, iy, seed) * sx;
  const bottom =
    hash(ix, iy + 1, seed) * (1 - sx) + hash(ix + 1, iy + 1, seed) * sx;
  return top * (1 - sy) + bottom * sy;
}

function fbm(x, y, seed, octaves = 6) {
  let value = 0;
  let weight = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise(x, y, seed + i * 1013) * weight;
    total += weight;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.2;
    weight *= 0.52;
  }
  return value / total;
}

const clamp = (n) => Math.max(0, Math.min(1, n));
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const u = x / width;
    const v = y / height;
    // Domain warping bends clouds and dust lanes into irregular filaments.
    const wx = fbm(u * 3.2, v * 2.8, 741, 4) - 0.5;
    const wy = fbm(u * 3.2 + 31, v * 2.8 + 13, 927, 4) - 0.5;
    const cloud = fbm(u * 6 + wx * 3.4, v * 4 + wy * 3.4, 1827);
    const detail = fbm(u * 15 + wx * 6, v * 10 + wy * 6, 4237, 5);
    const dust = fbm(u * 9 - wy * 4, v * 6 + wx * 4, 8721, 5);
    // A broad, broken diagonal cloud leaves the upper-left reading area calm.
    const path = 1.04 - u * 1.04 + wx * 0.3;
    const distance = (v - path) / (0.18 + cloud * 0.12);
    const band = Math.exp(-distance * distance * 1.8);
    const envelope = band * (0.32 + cloud * 0.9);
    const gas = Math.pow(clamp((cloud - 0.27) * 2.3), 1.6);
    const wisps = Math.pow(clamp(1 - Math.abs(detail - 0.5) * 5), 4);
    const darkLane = Math.pow(clamp((dust - 0.43) * 4), 1.3);
    const light =
      envelope * (gas * 0.7 + wisps * gas * 0.65) * (1 - darkLane * 0.9);
    const halo = band * gas * 0.17;
    const grain = (hash(x, y, 11939) - 0.5) * 0.8;
    const index = (y * width + x) * 3;
    pixels[index] = Math.round(5 + light * 60 + halo * 18 + grain);
    pixels[index + 1] = Math.round(7 + light * 78 + halo * 31 + grain);
    pixels[index + 2] = Math.round(12 + light * 105 + halo * 49 + grain);
  }
}

const directory = new URL("../public/backgrounds/", import.meta.url);
const output = new URL("nebula-dust.webp", directory);
await mkdir(directory, { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 3 } })
  .webp({ quality: 88, effort: 6 })
  .toFile(fileURLToPath(output));
console.log(
  `nebula-dust.webp: ${width}x${height}, ${(await stat(output)).size} bytes`,
);
