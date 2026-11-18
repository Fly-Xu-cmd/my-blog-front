"use client";
import { useEffect, useRef } from "react";

export interface SkyMeteor {
  id: number;
  left: string;
  top: string;
  createdAt: number;
  interactive: boolean;
}

const sources = [
  [0.81, 0.16],
  [0.68, 0.39],
  [0.35, 0.73],
  [0.09, 0.32],
  [0.92, 0.54],
  [0.22, 0.88],
];
const excluded =
  'a,button,input,textarea,select,label,summary,form,details,nav,header,footer,[role="button"],[role="link"],[role="combobox"],[role="dialog"],[contenteditable],[data-sky-no-interaction],.ant-select,.ant-popover,.ant-dropdown,.ant-modal,.ant-drawer,.ant-pagination';
const overlays =
  ".ant-popover,.ant-select-dropdown,.ant-dropdown,.ant-modal,.ant-drawer-open,dialog[open]";

function hitsText(target: Element, x: number, y: number) {
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    if (
      Array.from(range.getClientRects()).some(
        (r) =>
          x >= r.left - 2 &&
          x <= r.right + 2 &&
          y >= r.top - 2 &&
          y <= r.bottom + 2,
      )
    )
      return true;
  }
  return false;
}

export default function ResponsiveSky({
  active,
  interactive,
  onMeteor,
}: {
  active: boolean;
  interactive: boolean;
  onMeteor: (point: { x: number; y: number }) => boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const meteor = useRef(onMeteor);
  useEffect(() => {
    meteor.current = onMeteor;
  }, [onMeteor]);

  useEffect(() => {
    const element = root.current,
      picture = scene.current;
    if (!element || !picture) return;
    element.dataset.field = "idle";
    picture.style.transform = "translate3d(0,0,0)";
    if (!active || !interactive) return;

    let frame = 0;
    let press: {
      x: number;
      y: number;
      moved: boolean;
      blocked: boolean;
    } | null = null;
    const entryAt = (x: number, y: number) => {
      const box = document
        .querySelector("[data-sky-entry]")
        ?.getBoundingClientRect();
      return box &&
        x >= box.left &&
        x <= box.right &&
        y >= box.top &&
        y <= box.bottom
        ? box
        : null;
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      picture.style.transform = "translate3d(0,0,0)";
      element.dataset.field = "idle";
      press = null;
    };
    const move = (event: PointerEvent) => {
      if (
        press &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8
      )
        press.moved = true;
      if (event.pointerType === "touch") return;
      const box = entryAt(event.clientX, event.clientY);
      if (!box) {
        reset();
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        picture.style.transform = `translate3d(${-x * 16}px,${-y * 10}px,0)`;
        element.dataset.field = "parallax";
      });
    };
    const down = (event: PointerEvent) => {
      press =
        event.isPrimary &&
        event.button === 0 &&
        entryAt(event.clientX, event.clientY)
          ? {
              x: event.clientX,
              y: event.clientY,
              moved: false,
              blocked:
                getSelection()?.isCollapsed === false ||
                Array.from(document.querySelectorAll(overlays)).some(
                  (node) =>
                    node.getClientRects().length > 0 &&
                    getComputedStyle(node).visibility !== "hidden",
                ),
            }
          : null;
    };
    const click = (event: MouseEvent) => {
      const gesture = press;
      press = null;
      const target = event.target;
      if (
        !gesture ||
        gesture.moved ||
        gesture.blocked ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.detail === 0 ||
        !(target instanceof Element) ||
        !entryAt(event.clientX, event.clientY) ||
        target.closest(excluded) ||
        hitsText(target, event.clientX, event.clientY) ||
        getSelection()?.isCollapsed === false
      )
        return;
      meteor.current({ x: event.clientX, y: event.clientY });
    };
    const out = (event: PointerEvent) => {
      if (!event.relatedTarget && event.pointerType !== "touch") reset();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointercancel", reset);
    window.addEventListener("pointerout", out);
    window.addEventListener("blur", reset);
    window.addEventListener("scroll", reset, { passive: true });
    document.addEventListener("click", click);
    return () => {
      reset();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("pointerout", out);
      window.removeEventListener("blur", reset);
      window.removeEventListener("scroll", reset);
      document.removeEventListener("click", click);
    };
  }, [active, interactive]);

  return (
    <div
      ref={root}
      className="responsive-sky absolute inset-0"
      data-renderer="image"
      data-field="idle"
      data-active={active ? "true" : "false"}
      data-interaction={interactive ? "entry" : "none"}
    >
      <div ref={scene} className="sky-scene">
        <div className="sky-picture">
          {sources.map(([x, y], i) => (
            <span
              key={i}
              className="sky-glimmer"
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                animationDuration: `${11 + i * 2}s`,
                animationDelay: `${-i * 3}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
