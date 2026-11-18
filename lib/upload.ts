import { ApiError } from './api';
const types: Record<string, { ext: string[]; check: (b: Buffer) => boolean }> = {
  'image/jpeg': {
    ext: ['.jpg', '.jpeg'],
    check: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255,
  },
  'image/png': {
    ext: ['.png'],
    check: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  'image/gif': {
    ext: ['.gif'],
    check: (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString()),
  },
  'image/webp': {
    ext: ['.webp'],
    check: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
};
export async function validateImage(file: File) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new ApiError(400, 'INVALID_IMAGE');
  const rule = types[file.type];
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!rule || !ext || !rule.ext.includes(ext) || file.size === 0 || file.size > 5 * 1024 * 1024)
    throw new ApiError(400, 'INVALID_IMAGE');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!rule.check(bytes)) throw new ApiError(400, 'INVALID_IMAGE_CONTENT');
  return bytes;
}
