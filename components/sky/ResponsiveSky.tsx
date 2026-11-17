"use client";
import { useEffect, useRef } from "react";
import {
  createCloudRenderer,
  type SkyMeteor,
  type SkyFrame,
} from "./cloud-renderer";
import { SkyMotion, ambientDrift } from "./sky-motion";

interface Star {
  u: number;
  v: number;
  size: number;
  alpha: number;
  depth: number;
  phase: number;
  tint: string;
}
const excluded =
  'a,button,input,textarea,select,label,summary,form,details,nav,header,footer,[role="button"],[role="link"],[role="combobox"],[role="listbox"],[role="option"],[role="menu"],[role="menuitem"],[role="dialog"],[role="tab"],[contenteditable],[data-sky-no-interaction],.ant-select,.ant-select-dropdown,.ant-popover,.ant-dropdown,.ant-picker,.ant-modal,.ant-drawer,.ant-pagination,.ant-segmented,.ant-input-affix-wrapper,.ant-input-group,.ant-upload,.ant-message,.ant-notification';
const blankTags = new Set([
  "BODY",
  "DIV",
  "MAIN",
  "SECTION",
  "UL",
  "LI",
  "ARTICLE",
  "P",
  "SPAN",
  "TIME",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
]);
const overlays =
  ".ant-popover,.ant-select-dropdown,.ant-dropdown,.ant-picker-dropdown,.ant-modal,.ant-drawer-open,dialog[open]";

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
      depth: i < 140 ? 0.025 : i < 168 ? 0.04 : 0.06,
      phase: Math.random() * Math.PI * 2,
      tint:
        i % 9 === 0
          ? "235,219,194"
          : i % 4 === 0
            ? "232,235,239"
            : "205,222,242",
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
  const dustCanvas = useRef<HTMLCanvasElement>(null);
  const stars = useRef<Star[]>([]);
  const dust = useRef<Star[]>([]);
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
    const particles = dustCanvas.current;
    if (!element || !clouds || !canvas || !particles) return;
    const ctx = canvas.getContext("2d");
    const dustContext = particles.getContext("2d");
    if (!ctx || !dustContext) return;
    if (!stars.current.length) stars.current = createStars();
    // Two restrained stellar sources are shared with the cloud lighting.
    Object.assign(stars.current[0], {
      u: 0.73,
      v: 0.3,
      size: 2.1,
      alpha: 0.85,
      tint: "205,222,242",
      depth: 0.04,
    });
    Object.assign(stars.current[1], {
      u: 0.25,
      v: 0.7,
      size: 1.8,
      alpha: 0.7,
      tint: "235,219,194",
      depth: 0.04,
    });
    if (!dust.current.length)
      dust.current = Array.from({ length: 22 }, () => ({
        u: Math.random(),
        v: Math.random(),
        size: 0.8 + Math.random() * 0.6,
        alpha: 0.12 + Math.random() * 0.14,
        depth: 0.7 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        tint: "181,194,213",
      }));
    let disposed = false;
    let raf = 0;
    let width = element.clientWidth || innerWidth,
      height = element.clientHeight || innerHeight,
      ratio = 1;
    let cloudRenderer: ReturnType<typeof createCloudRenderer> = null;
    let lastFrame = performance.now();
    let nextFrame = lastFrame;
    let farDirty = true;
    let farView: [number, number] = [0, 0];
    const motion = new SkyMotion(width, height);
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
    let lastKick = -Infinity;
    let kickCount = 0;
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
    const surfaceImage = new Image();
    let cloudQuality = 1;
    let slowFrames = 0;
    const setRenderer = (value: string) => {
      element.dataset.renderer = value;
    };
    const initializeClouds = () => {
      if (
        disposed ||
        !active ||
        !image.complete ||
        !image.naturalWidth ||
        !surfaceImage.complete ||
        !surfaceImage.naturalWidth
      )
        return;
      cloudRenderer?.dispose();
      try {
        cloudRenderer = createCloudRenderer(clouds, image, surfaceImage);
      } catch {
        cloudRenderer = null;
      }
      setRenderer(cloudRenderer ? "webgl" : "fallback");
      clouds.style.opacity = cloudRenderer ? "1" : "0";
    };
    const resizeClouds = () => {
      const cloudRatio = Math.min(
        ratio,
        cloudQuality,
        Math.sqrt(700000 / (width * height)) * cloudQuality,
      );
      clouds.width = Math.round(width * cloudRatio);
      clouds.height = Math.round(height * cloudRatio);
      element.dataset.quality = cloudQuality.toFixed(2);
    };
    const resize = () => {
      width = element.clientWidth || innerWidth;
      height = element.clientHeight || innerHeight;
      motion.resize(width, height);
      ratio = Math.min(
        devicePixelRatio || 1,
        1.5,
        Math.sqrt(3000000 / (width * height)),
      );
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const particleRatio = Math.min(1, Math.sqrt(800000 / (width * height)));
      particles.width = Math.round(width * particleRatio);
      particles.height = Math.round(height * particleRatio);
      resizeClouds();
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      dustContext.setTransform(particleRatio, 0, 0, particleRatio, 0, 0);
      farDirty = true;
      if (!active) draw(0);
    };
    const draw = (dt: number) => {
      const time = sceneTime.current;
      motion.advance(dt);
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
      const wind: [number, number] = active ? [0, scrollOffset] : [0, 0];
      const voyage = active ? ambientDrift(time, 0.3) : [0, 0];
      const view: [number, number] = active
        ? [
            (slow.x / width - 0.5) * 18 * slow.strength + voyage[0] * 0.07,
            (slow.y / height - 0.5) * 12 * slow.strength + voyage[1] * 0.07,
          ]
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
      const pulsePhase =
        !active || motion.energy < 0.12
          ? "idle"
          : Date.now() - lastKick < 800
            ? "expanding"
            : "gathering";
      if (element.dataset.pulse !== pulsePhase)
        element.dataset.pulse = pulsePhase;
      if (
        farDirty ||
        Math.hypot(view[0] - farView[0], view[1] - farView[1]) > 0.4
      ) {
        farDirty = false;
        farView = view;
        ctx.clearRect(0, 0, width, height);
        for (const star of stars.current) {
          const x = star.u * width + view[0] * star.depth;
          const y = star.v * height + view[1] * star.depth;
          const quiet =
            0.35 +
            Math.min(1, Math.hypot((star.u - 0.5) * 2, (star.v - 0.58) * 1.7)) *
              0.65;
          const alpha = star.alpha * quiet;
          ctx.fillStyle = `rgba(${star.tint},${alpha})`;
          ctx.shadowColor = `rgba(${star.tint},${alpha * 0.4})`;
          ctx.shadowBlur = star.size > 1.5 ? 3 : 0;
          ctx.beginPath();
          ctx.arc(x, y, star.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      dustContext.clearRect(0, 0, width, height);
      const nearTravel = active ? ambientDrift(time, 1.4) : [0, 0];
      for (const particle of dust.current) {
        const x =
          particle.u * width + view[0] * particle.depth + nearTravel[0] * 0.18;
        const y =
          particle.v * height +
          view[1] * particle.depth +
          nearTravel[1] * 0.18 +
          wind[1];
        const drift = motion.sample(x / width, y / height);
        const illumination =
          Math.exp(-((Math.hypot(x - slow.x, y - slow.y) / 220) ** 2)) *
          slow.strength;
        dustContext.fillStyle = `rgba(${particle.tint},${particle.alpha + illumination * 0.12})`;
        dustContext.shadowColor = `rgba(${particle.tint},0.1)`;
        dustContext.shadowBlur = 2;
        dustContext.beginPath();
        dustContext.arc(
          x + drift[0] * particle.depth,
          y + drift[1] * particle.depth,
          particle.size / 2,
          0,
          Math.PI * 2,
        );
        dustContext.fill();
      }
      const frame: SkyFrame = {
        width,
        height,
        time,
        wind,
        focus: [slow.x, slow.y, slow.strength],
        flash,
        motion,
        view,
      };
      cloudRenderer?.draw(frame);
      const field = fast.strength > 0.05 ? "responding" : "idle";
      if (element.dataset.field !== field) element.dataset.field = field;
    };
    const tick = (now: number) => {
      if (disposed) return;
      if (now >= nextFrame - 0.5) {
        const dt = Math.max(0, (now - lastFrame) / 1000);
        // Keep the flow smooth on slower GPUs by reducing only cloud pixels.
        // Click count never increases simulation or shader work per frame.
        slowFrames =
          dt > 0.022 && dt < 2 ? slowFrames + 1 : Math.max(0, slowFrames - 0.3);
        if (slowFrames >= 18 && cloudQuality > 0.55) {
          cloudQuality = Math.max(0.55, cloudQuality * 0.82);
          slowFrames = 0;
          resizeClouds();
        }
        lastFrame = now;
        nextFrame += 1000 / 60;
        if (nextFrame < now) nextFrame = now + 1000 / 60;
        sceneTime.current += Math.min(dt, 0.1);
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
        hitsText(target, event.clientX, event.clientY) ||
        window.getSelection()?.isCollapsed === false
      )
        return;
      const now = Date.now();
      motion.kick(event.clientX, event.clientY);
      lastKick = now;
      element.dataset.pulse = "expanding";
      element.dataset.pulseCount = String(++kickCount);
      onMeteorRef.current({ x: event.clientX, y: event.clientY });
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = gesture.pointerType !== "touch";
      pointer.movedAt = now;
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
    element.dataset.pulseCount = "0";
    setRenderer(active ? "loading" : "static");
    clouds.style.opacity = "0";
    window.addEventListener("resize", resize);
    if (active) {
      image.onload = initializeClouds;
      surfaceImage.onload = initializeClouds;
      const failed = () => {
        if (!disposed) setRenderer("fallback");
      };
      image.onerror = failed;
      surfaceImage.onerror = failed;
      image.src = "/backgrounds/nebula-layers.webp";
      surfaceImage.src = "/backgrounds/nebula-surfaces.webp";
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
      surfaceImage.onload = null;
      surfaceImage.onerror = null;
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
      data-pulse-count="0"
    >
      <canvas
        ref={starCanvas}
        className="responsive-stars absolute inset-0 h-full w-full"
      />
      <canvas
        ref={cloudCanvas}
        className="responsive-cloud absolute inset-0 h-full w-full"
      />
      <canvas
        ref={dustCanvas}
        className="responsive-dust absolute inset-0 h-full w-full"
      />
    </div>
  );
}
