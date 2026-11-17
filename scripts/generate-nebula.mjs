// Offline, deterministic artwork; browsers only download the finished WebP.
// Run with: node scripts/generate-nebula.mjs
import { mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Use the image encoder already shipped with our declared Next dependency.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
// Three different depth sheets, packed below WebGL's 2048px minimum limit.
const width = 640;
const height = 426;
const atlasWidth = width * 3;
const colors = Buffer.alloc(atlasWidth * height * 3);
const surfaces = Buffer.alloc(atlasWidth * height * 3);
const preview = Buffer.alloc(width * height * 3);
const layers = [];

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
for (let layer = 0; layer < 3; layer++) {
  const density = new Float32Array(width * height);
  const radiance = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      // Domain warping bends clouds and dust lanes into irregular filaments.
      const seed = layer * 3701;
      const wx = fbm(u * 3.2, v * 2.8, 741 + seed, 4) - 0.5;
      const wy = fbm(u * 3.2 + 31, v * 2.8 + 13, 927 + seed, 4) - 0.5;
      const cloud = fbm(
        u * (4 + layer * 2) + wx * 4,
        v * (3 + layer) + wy * 4,
        1827 + seed,
      );
      const detail = fbm(u * 19 + wx * 6, v * 13 + wy * 6, 4237 + seed, 5);
      const dust = fbm(u * 9 - wy * 4, v * 6 + wx * 4, 8721 + seed, 5);
      const path = 1.02 - u * 1.04 + wx * (0.3 + layer * 0.15);
      const distance = (v - path) / (0.28 - layer * 0.035 + cloud * 0.09);
      const band = Math.exp(-distance * distance * 1.6);
      const gas = Math.pow(clamp((cloud - 0.25) * 2.1), 1.4);
      const wisps = Math.pow(clamp(1 - Math.abs(detail - 0.5) * 5), 3);
      const darkLane = Math.pow(clamp((dust - 0.4) * 4), 1.4);
      const index = y * width + x;
      const optical =
        band *
        (layer === 2
          ? darkLane * (0.22 + gas * 0.6)
          : gas * (0.24 + wisps * 0.33) * (1 - darkLane * 0.65));
      density[index] = clamp(optical * (layer === 0 ? 1.35 : layer === 1 ? 1.9 : 1.5));
      // Luminous distant gas, finer middle filaments, dark foreground dust.
      const light = layer === 2 ? wisps * 0.4 : 0.48 + gas * 0.42 + wisps * 0.1;
      const tint =
        layer === 0
          ? [65, 85, 122]
          : layer === 1
            ? [83, 107, 148]
            : [25, 30, 39];
      for (let c = 0; c < 3; c++)
        radiance[index * 3 + c] =
          tint[c] * (layer === 2 ? 0.65 + light : light);
    }
  layers.push({ density, radiance });
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const packed = (y * atlasWidth + layer * width + x) * 3;
      const left = density[y * width + Math.max(0, x - 1)],
        right = density[y * width + Math.min(width - 1, x + 1)];
      const above = density[Math.max(0, y - 1) * width + x],
        below = density[Math.min(height - 1, y + 1) * width + x];
      const nx = Math.max(-0.8, Math.min(0.8, -(right - left) * width * 0.08));
      const ny = Math.max(-0.8, Math.min(0.8, (below - above) * height * 0.08));
      surfaces[packed] = Math.round((nx * 0.5 + 0.5) * 255);
      surfaces[packed + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      surfaces[packed + 2] = Math.round(density[index] * 255);
      for (let c = 0; c < 3; c++)
        colors[packed + c] = Math.round(radiance[index * 3 + c]);
    }
}

// Static/no-WebGL composition follows the same front-over-back ordering.
for (let i = 0; i < width * height; i++) {
  const pixel = [5, 6, 10];
  for (const layer of layers)
    for (let c = 0; c < 3; c++) {
      pixel[c] =
        pixel[c] * (1 - layer.density[i]) +
        layer.radiance[i * 3 + c] * layer.density[i];
    }
  for (let c = 0; c < 3; c++) preview[i * 3 + c] = Math.round(pixel[c]);
}

const directory = new URL("../public/backgrounds/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const [name, pixels, w, lossless] of [
  ["nebula-layers.webp", colors, atlasWidth, false],
  ["nebula-surfaces.webp", surfaces, atlasWidth, true],
  ["nebula-dust.webp", preview, width, false],
]) {
  const output = new URL(name, directory);
  let input = pixels,
    outputWidth = w,
    outputHeight = height;
  if (lossless) {
    // Surface relief is low-frequency; quantize a smaller data atlas. Unlike
    // lossy RGB WebP, lossless storage does not mix unrelated data channels.
    outputWidth = Math.round(w * 0.375);
    outputHeight = Math.round(height * 0.375);
    input = await sharp(pixels, { raw: { width: w, height, channels: 3 } })
      .resize(outputWidth, outputHeight)
      .raw()
      .toBuffer();
    for (let i = 0; i < input.length; i++) {
      const step = i % 3 === 2 ? 4 : 16;
      input[i] = Math.min(255, Math.round(input[i] / step) * step);
    }
  }
  await sharp(input, {
    raw: { width: outputWidth, height: outputHeight, channels: 3 },
  })
    .webp({ quality: 90, effort: 6, lossless })
    .toFile(fileURLToPath(output));
  console.log(
    `${name}: ${outputWidth}x${outputHeight}, ${(await stat(output)).size} bytes`,
  );
}
