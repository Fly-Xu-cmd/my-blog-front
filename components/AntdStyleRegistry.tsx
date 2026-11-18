'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { createCache, extractStyle, StyleProvider } from '@ant-design/cssinjs';

export default function AntdStyleRegistry({ children }: { children: ReactNode }) {
  const [cache] = useState(() => createCache());
  const previousStyles = useRef('');
  useServerInsertedHTML(() => {
    if (!cache.cache.size) return null;
    // Streaming can render additional controls after the first style flush.
    const styles = extractStyle(cache, { plain: true });
    if (styles === previousStyles.current) return null;
    previousStyles.current = styles;
    return <style data-antd-ssr dangerouslySetInnerHTML={{ __html: styles }} />;
  });
  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
