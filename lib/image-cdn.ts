// Preserve signed URLs, existing rules, GIFs, SVGs and other hosts.
export function supportsImageCdn(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.host === "image.xylxf.xyz" &&
      !url.username &&
      !url.password &&
      !src.includes("?") &&
      !src.includes("#") &&
      !/\.(gif|svg)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function cdnImage(src: string, width: number): string {
  if (!supportsImageCdn(src)) return src;
  const size = Math.min(1920, Math.max(64, Math.round(width)));
  if (!Number.isFinite(size)) return src;
  return `${src}?imageView2/2/w/${size}/q/80/format/webp`;
}

export function cdnSrcSet(src: string, widths: number[]): string | undefined {
  if (!supportsImageCdn(src)) return undefined;
  return widths.map((width) => `${cdnImage(src, width)} ${width}w`).join(", ");
}
