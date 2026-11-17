"use client";
import { useEffect, useRef } from "react";
import {
  createCloudRenderer,
  type SkyMeteor,
  type SkyFrame,
} from "./cloud-renderer";

interface Star {
  u: number;
  v: number;
  size: number;
  alpha: number;
  depth: number;
  phase: number;
  dx: number;
  dy: number;
}
const excluded =
  'a,button,input,textarea,select,label,summary,form,details,nav,header,footer,article,[role="button"],[role="link"],[role="combobox"],[role="listbox"],[role="option"],[role="menu"],[role="menuitem"],[role="dialog"],[role="tab"],[contenteditable],[data-sky-no-interaction],.ant-select,.ant-select-dropdown,.ant-popover,.ant-dropdown,.ant-picker,.ant-modal,.ant-drawer,.ant-pagination,.ant-segmented,.ant-input-affix-wrapper,.ant-input-group,.ant-upload,.ant-message,.ant-notification';
const blankTags = new Set(["BODY", "DIV", "MAIN", "SECTION", "UL"]);
const overlays =
  ".ant-popover,.ant-select-dropdown,.ant-dropdown,.ant-picker-dropdown,.ant-modal,.ant-drawer-open,dialog[open]";
const pulseDuration = 4800;
const pulseExpansion = 800;

function createStars(): Star[] {
  return Array.from({ length: 180 }, (_, i) => {
    let u = Math.random();
    let v =
      Math.random() < 0.65
        ? 0.78 - u * 0.6 + (Math.random() - 0.5) * 0.3
        : Math.random();
    if (i >= 168) {
      const zone = Math.random();
      u =
        zone < 0.4
          ? Math.random()
          : zone < 0.7
            ? Math.random() * 0.17
            : 0.83 + Math.random() * 0.17;
      v = zone < 0.4 ? 0.03 + Math.random() * 0.2 : Math.random();
    }
    return {
      u,
      v,
      size: i < 140 ? 0.8 : i < 168 ? 1.1 : 1.7,
      alpha: i < 140 ? 0.28 : i < 168 ? 0.46 : 0.65,
      depth: i < 140 ? 0.6 : i < 168 ? 1 : 1.5,
      phase: Math.random() * Math.PI * 2,
      dx: 0,
      dy: 0,
    };
  });
}

export default function ResponsiveSky({
  active,
  meteor,
  onMeteor,
}: {
  active: boolean;
  meteor: SkyMeteor | null;
  onMeteor: (point: { x: number; y: number }) => boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const cloudCanvas = useRef<HTMLCanvasElement>(null);
  const starCanvas = useRef<HTMLCanvasElement>(null);
  const stars = useRef<Star[]>([]);
  const sceneTime = useRef(0);
  const meteorRef = useRef(meteor);
  const onMeteorRef = useRef(onMeteor);
  useEffect(() => {
    meteorRef.current = meteor;
    onMeteorRef.current = onMeteor;
  }, [meteor, onMeteor]);

  useEffect(() => {
    const element = root.current;
    const clouds = cloudCanvas.current;
    const canvas = starCanvas.current;
    if (!element || !clouds || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!stars.current.length) stars.current = createStars();
    let disposed = false;
    let raf = 0;
    let width = element.clientWidth || innerWidth,
      height = element.clientHeight || innerHeight,
      ratio = 1;
    let cloudRenderer: ReturnType<typeof createCloudRenderer> = null;
    let lastFrame = performance.now();
    let lastScroll = scrollY,
      scrollTarget = 0,
      scrollOffset = 0;
    let press: {
      x: number;
      y: number;
      moved: boolean;
      pointerType: string;
      selected: boolean;
      overlayOpen: boolean;
    } | null = null;
    let pulse: { u: number; v: number; createdAt: number } | null = null;
    const pointer = {
      x: width / 2,
      y: height / 2,
      inside: false,
      quiet: 1,
      movedAt: 0,
    };
    const fast = { x: pointer.x, y: pointer.y, strength: 0 };
    const slow = { ...fast };
    const image = new Image();
    const setRenderer = (value: string) => {
      element.dataset.renderer = value;
    };
    const initializeClouds = () => {
      if (disposed || !active || !image.complete || !image.naturalWidth) return;
      cloudRenderer?.dispose();
      try {
        cloudRenderer = createCloudRenderer(clouds, image);
      } catch {
        cloudRenderer = null;
      }
      setRenderer(cloudRenderer ? "webgl" : "fallback");
      clouds.style.opacity = cloudRenderer ? "1" : "0";
    };
    const resize = () => {
      width = element.clientWidth || innerWidth;
      height = element.clientHeight || innerHeight;
      ratio = Math.min(
        devicePixelRatio || 1,
        1.5,
        Math.sqrt(3000000 / (width * height)),
      );
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const cloudRatio = Math.min(
        ratio,
        1.25,
        Math.sqrt(2000000 / (width * height)),
      );
      clouds.width = Math.round(width * cloudRatio);
      clouds.height = Math.round(height * cloudRatio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!active) draw(0);
    };
    const draw = (dt: number) => {
      const time = sceneTime.current;
      const hoverAge = Date.now() - pointer.movedAt;
      const target =
        active && pointer.inside
          ? pointer.quiet * (hoverAge < 600 ? 0.65 : hoverAge < 4000 ? 1 : 0.45)
          : 0;
      const follow = (field: typeof fast, speed: number) => {
        const amount = active ? 1 - Math.exp(-dt * speed) : 1;
        field.x += (pointer.x - field.x) * amount;
        field.y += (pointer.y - field.y) * amount;
        field.strength += (target - field.strength) * amount;
      };
      follow(fast, 12);
      follow(slow, 3);
      scrollOffset += (scrollTarget - scrollOffset) * (1 - Math.exp(-dt * 5));
      scrollTarget *= Math.exp(-dt * 3);
      const wind: [number, number] = active
        ? [Math.sin(time * 0.07) * 11, Math.cos(time * 0.05) * 7 + scrollOffset]
        : [0, 0];
      let flash: [number, number, number] = [0, 0, 0];
      const current = active ? meteorRef.current : null;
      if (current) {
        const age = (Date.now() - current.createdAt) / 1000;
        const travel = Math.min(1, Math.max(0, age - 0.18));
        flash = [
          (parseFloat(current.left) / 100) * width - 295 * travel,
          (parseFloat(current.top) / 100) * height + 206 * travel,
          Math.max(0, Math.sin(Math.min(1, age / 1.3) * Math.PI)),
        ];
      }
      const pulseRadius = Math.min(320, Math.min(width, height) * 0.65);
      let pulseFrame: SkyFrame["pulse"] = [0, 0, 0, pulseRadius];
      let pulsePhase = "idle";
      if (active && pulse) {
        const age = Math.max(0, Date.now() - pulse.createdAt);
        if (age >= pulseDuration) pulse = null;
        else {
          const expanding = age < pulseExpansion;
          const progress = expanding
            ? age / pulseExpansion
            : (age - pulseExpansion) / (pulseDuration - pulseExpansion);
          const eased = progress * progress * (3 - 2 * progress);
          pulseFrame = [
            pulse.u * width,
            pulse.v * height,
            expanding ? eased : 1 - eased,
            pulseRadius,
          ];
          pulsePhase = expanding ? "expanding" : "gathering";
        }
      }
      if (element.dataset.pulse !== pulsePhase)
        element.dataset.pulse = pulsePhase;
      ctx.clearRect(0, 0, width, height);
      for (const star of stars.current) {
        const x = star.u * width + wind[0] * star.depth;
        const y = star.v * height + wind[1] * star.depth;
        const rx = x - fast.x,
          ry = y - fast.y;
        const distance = Math.hypot(rx, ry);
        const influence =
          Math.exp(-((distance / 220) ** 2) * 2) * fast.strength;
        const px = x - pulseFrame[0],
          py = y - pulseFrame[1];
        const pulseField =
          Math.exp(-((Math.hypot(px, py) / pulseRadius) ** 2) * 2.4) *
          pulseFrame[2];
        const amount = active ? 1 - Math.exp(-dt * 7) : 1;
        const tx =
          distance > 1
            ? ((rx / distance) * 13 - (ry / distance) * 6) *
              influence *
              star.depth
            : 0;
        const ty =
          distance > 1
            ? ((ry / distance) * 13 + (rx / distance) * 6) *
              influence *
              star.depth
            : 0;
        star.dx += (tx - star.dx) * amount;
        star.dy += (ty - star.dy) * amount;
        const illumination =
          Math.exp(
            (-(Math.hypot(x - flash[0], y - flash[1]) ** 2) / 22500) * 2,
          ) * flash[2];
        const quiet =
          0.35 +
          Math.min(1, Math.hypot((star.u - 0.5) * 2, (star.v - 0.58) * 1.7)) *
            0.65;
        const twinkle = active
          ? 0.92 + Math.sin(time * 0.55 + star.phase) * 0.08
          : 1;
        const alpha = Math.min(
          0.95,
          star.alpha * quiet * twinkle +
            influence * 0.4 +
            illumination * 0.4 +
            pulseField * 0.12,
        );
        ctx.fillStyle = `rgba(218,230,245,${alpha})`;
        ctx.shadowColor = `rgba(183,204,232,${alpha * 0.5})`;
        ctx.shadowBlur = star.size > 1.5 || influence > 0.25 ? 4 : 0;
        ctx.beginPath();
        ctx.arc(
          x + star.dx + px * pulseField * 0.65 * star.depth,
          y + star.dy + py * pulseField * 0.65 * star.depth,
          star.size / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      const frame: SkyFrame = {
        width,
        height,
        time,
        wind,
        focus: [slow.x, slow.y, slow.strength],
        flash,
        pulse: pulseFrame,
      };
      cloudRenderer?.draw(frame);
      const field = fast.strength > 0.05 ? "responding" : "idle";
      if (element.dataset.field !== field) element.dataset.field = field;
    };
    const tick = (now: number) => {
      if (disposed) return;
      const elapsed = now - lastFrame;
      if (elapsed >= 1000 / 30) {
        const dt = Math.min(elapsed / 1000, 0.1);
        lastFrame = now;
        sceneTime.current += dt;
        draw(dt);
      }
      raf = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      if (
        press &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8
      )
        press.moved = true;
      if (event.pointerType === "touch") return;
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 2)
        pointer.movedAt = Date.now();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      pointer.quiet =
        event.target instanceof Element &&
        event.target.closest("article,header,nav,footer")
          ? 0.5
          : 1;
    };
    const down = (event: PointerEvent) => {
      press =
        event.isPrimary && event.button === 0
          ? {
              x: event.clientX,
              y: event.clientY,
              moved: false,
              pointerType: event.pointerType,
              selected: window.getSelection()?.isCollapsed === false,
              overlayOpen: Array.from(document.querySelectorAll(overlays)).some(
                (node) =>
                  node.getClientRects().length > 0 &&
                  getComputedStyle(node).visibility !== "hidden",
              ),
            }
          : null;
    };
    const reset = () => {
      pointer.inside = false;
      press = null;
    };
    const out = (event: PointerEvent) => {
      if (!event.relatedTarget) {
        if (event.pointerType === "touch") pointer.inside = false;
        else reset();
      }
    };
    const scroll = () => {
      if (press) press.moved = true;
      scrollTarget = Math.max(-8, Math.min(8, (scrollY - lastScroll) / 12));
      lastScroll = scrollY;
    };
    const click = (event: MouseEvent) => {
      const gesture = press;
      press = null;
      const target = event.target;
      if (
        !gesture ||
        gesture.moved ||
        gesture.selected ||
        gesture.overlayOpen ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.detail === 0 ||
        !(target instanceof Element) ||
        !blankTags.has(target.tagName) ||
        target.closest(excluded) ||
        Array.from(target.childNodes).some(
          (node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ) ||
        window.getSelection()?.isCollapsed === false
      )
        return;
      const now = Date.now();
      if (!pulse || now - pulse.createdAt >= pulseDuration) {
        pulse = {
          u: event.clientX / width,
          v: event.clientY / height,
          createdAt: now,
        };
        element.dataset.pulse = "expanding";
        onMeteorRef.current({ x: event.clientX, y: event.clientY });
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.inside = gesture.pointerType !== "touch";
        pointer.movedAt = Date.now();
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cloudRenderer?.dispose();
      cloudRenderer = null;
      clouds.style.opacity = "0";
      setRenderer("fallback");
    };
    resize();
    draw(0);
    setRenderer(active ? "loading" : "static");
    clouds.style.opacity = "0";
    window.addEventListener("resize", resize);
    if (active) {
      image.onload = initializeClouds;
      image.onerror = () => {
        if (!disposed) setRenderer("fallback");
      };
      image.src = "/backgrounds/nebula-dust.webp";
      clouds.addEventListener("webglcontextlost", lost);
      clouds.addEventListener("webglcontextrestored", initializeClouds);
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", down, { passive: true });
      window.addEventListener("pointercancel", reset);
      window.addEventListener("pointerout", out);
      window.addEventListener("blur", reset);
      window.addEventListener("scroll", scroll, { passive: true });
      document.addEventListener("click", click);
      raf = requestAnimationFrame(tick);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      image.onload = null;
      image.onerror = null;
      cloudRenderer?.dispose();
      clouds.style.opacity = "0";
      window.removeEventListener("resize", resize);
      clouds.removeEventListener("webglcontextlost", lost);
      clouds.removeEventListener("webglcontextrestored", initializeClouds);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointercancel", reset);
      window.removeEventListener("pointerout", out);
      window.removeEventListener("blur", reset);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("click", click);
    };
  }, [active]);

  return (
    <div
      ref={root}
      className="responsive-sky absolute inset-0"
      data-field="idle"
      data-pulse="idle"
    >
      <canvas
        ref={cloudCanvas}
        className="responsive-cloud absolute inset-0 h-full w-full"
      />
      <canvas
        ref={starCanvas}
        className="responsive-stars absolute inset-0 h-full w-full"
      />
    </div>
  );
}
