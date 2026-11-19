"use client";
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { cdnImage, cdnSrcSet } from "@/lib/image-cdn";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string;
  variant?: "thumbnail" | "feature" | "body";
};

function ImageContent({
  src,
  variant = "body",
  alt = "",
  onError,
  ...props
}: Props) {
  const [original, setOriginal] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  const widths =
    variant === "thumbnail" ? [100, 160, 240, 320] : [480, 768, 1200, 1600];
  const srcSet = original ? undefined : cdnSrcSet(src, widths);
  useEffect(() => {
    // An SSR image can fail before React attaches its error handler.
    const element = image.current;
    if (srcSet && element?.currentSrc && element.complete && !element.naturalWidth) {
      setOriginal(true);
    }
  }, [srcSet]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Qiniu serves responsive variants directly; no server image processing.
    <img
      {...props}
      ref={image}
      alt={alt}
      src={original ? src : cdnImage(src, variant === "thumbnail" ? 320 : 1200)}
      srcSet={srcSet}
      sizes={props.sizes ?? "(max-width: 800px) calc(100vw - 32px), 768px"}
      loading={props.loading ?? "lazy"}
      decoding="async"
      onError={(event) => {
        if (srcSet) setOriginal(true);
        onError?.(event);
      }}
    />
  );
}

export default function CdnImage(props: Props) {
  return <ImageContent key={props.src} {...props} />;
}
