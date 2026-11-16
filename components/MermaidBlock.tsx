'use client';
import { useEffect, useId, useRef, useState } from 'react';
export default function MermaidBlock({ source }: { source: string }) {
  const id = useId().replace(/[^a-z0-9]/gi, '');
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
        const rendered = await mermaid.render('mermaid' + id, source);
        if (active && ref.current) {
          ref.current.innerHTML = rendered.svg;
          setReady(true);
        }
      } catch {
        if (active) setReady(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [source, id]);
  return (
    <div>
      <pre hidden={ready}>
        <code>{source}</code>
      </pre>
      <div ref={ref} role="img" aria-label="Mermaid 图表" />
    </div>
  );
}
