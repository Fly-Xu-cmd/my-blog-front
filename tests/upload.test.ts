import { it, expect } from 'vitest';
import { validateImage } from '@/lib/upload';
it('rejects SVG, forged MIME, wrong extension and oversized images', async () => {
  for (const file of [
    new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }),
    new File(['<svg/>'], 'x.png', { type: 'image/png' }),
    new File(['GIF89a'], 'x.jpg', { type: 'image/gif' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png', { type: 'image/png' }),
  ])
    await expect(validateImage(file)).rejects.toMatchObject({ status: 400 });
  const png = new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], 'x.png', {
    type: 'image/png',
  });
  expect((await validateImage(png)).length).toBe(8);
});
