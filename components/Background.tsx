"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

interface TwinkleStar {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  tint: string;
}

interface StarLayer {
  shadows: string;
  size: number;
  duration: number;
}

interface Meteor {
  id: number;
  left: string;
  top: string;
}

interface GlowOrb {
  id: number;
  left: number;
  top: number;
  size: number; // vh 直径
  tint: string;
  peak: number; // 最大不透明度
  duration: number; // 单次显隐周期（s）
  delay: number; // 起步延迟（s）
  repeatDelay: number; // 隐去后的间歇（s）
  driftX: number; // 横向漂移（px）
  driftY: number; // 纵向漂移（px）
}

// 暗星沿宽松的斜向星带分布；亮星留在上方和两侧，避开正文中央。
function starPosition(peripheral = false) {
  if (peripheral) {
    const zone = Math.random();
    if (zone < 0.4)
      return { x: 3 + Math.random() * 94, y: 3 + Math.random() * 20 };
    return {
      x: zone < 0.7 ? 3 + Math.random() * 14 : 83 + Math.random() * 14,
      y: 23 + Math.random() * 72,
    };
  }
  const x = Math.random() * 100;
  const y =
    Math.random() < 0.65
      ? Math.max(2, Math.min(98, 85 - x * 0.75 + (Math.random() - 0.5) * 45))
      : Math.random() * 100;
  return { x, y };
}

// 浅色光晕色板：5 种不同的柔和色，每团光晕各用一种
const GLOW_TINTS = [
  "#93c5fd", // 蓝
  "#67e8f9", // 青
  "#c4b5fd", // 紫
  "#f9a8d4", // 粉
  "#a5b4fc", // 靛
];

// 光晕分布区域：避开正中内容区，集中在上方与三个角落
const GLOW_ZONES: { left: [number, number]; top: [number, number] }[] = [
  { left: [4, 16], top: [8, 24] },
  { left: [70, 86], top: [8, 24] },
  { left: [70, 86], top: [62, 80] },
  { left: [28, 50], top: [10, 26] },
  { left: [6, 16], top: [55, 75] },
];

/**
 * 单团光晕：外层负责“时隐时现 + 漂移”的无限循环动画；
 * 内层叠加鼠标“吹拂”偏移（光标越近影响越大，弹性跟随、平滑回位）。
 */
function GlowOrbView({
  orb,
  mouseX,
  mouseY,
  animated,
}: {
  orb: GlowOrb;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  animated: boolean;
}) {
  const offset = useTransform([mouseX, mouseY], (latest) => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const [mx, my] = latest as [number, number];
    const cx = (orb.left / 100) * window.innerWidth;
    const cy = (orb.top / 100) * window.innerHeight;
    const dx = cx - mx;
    const dy = cy - my;
    const dist = Math.hypot(dx, dy);
    const f = Math.max(0, 1 - dist / 340); // 340px 内开始受影响
    const s = f * f * 46; // 平方衰减，最大偏移约 46px
    return dist > 1
      ? { x: (dx / dist) * s, y: (dy / dist) * s }
      : { x: 0, y: 0 };
  });
  const springCfg = { stiffness: 110, damping: 16, mass: 0.7 };
  const ox = useSpring(
    useTransform(offset, (o) => o.x),
    springCfg,
  );
  const oy = useSpring(
    useTransform(offset, (o) => o.y),
    springCfg,
  );

  return (
    <div
      className="absolute"
      style={{
        left: `${orb.left}%`,
        top: `${orb.top}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <motion.div
        initial={false}
        animate={
          animated
            ? {
                opacity: [0, orb.peak, orb.peak * 0.45, 0],
                scale: [0.7, 1.12, 0.96, 0.72],
                x: [0, orb.driftX * 0.35, orb.driftX * 0.7, orb.driftX],
                y: [0, orb.driftY * 0.4, orb.driftY * 0.75, orb.driftY],
              }
            : { opacity: orb.peak * 0.45, scale: 1, x: 0, y: 0 }
        }
        transition={
          animated
            ? {
                duration: orb.duration,
                delay: orb.delay,
                times: [0, 0.32, 0.68, 1],
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: orb.repeatDelay,
              }
            : { duration: 0 }
        }
      >
        <motion.div
          style={{
            width: `${orb.size}vh`,
            height: `${orb.size}vh`,
            borderRadius: "9999px",
            background: `radial-gradient(circle, ${orb.tint} 0%, ${orb.tint}59 45%, transparent 72%)`,
            filter: "blur(18px)",
            x: animated ? ox : 0,
            y: animated ? oy : 0,
          }}
        />
      </motion.div>
    </div>
  );
}

/**
 * 全局背景层：暗色分层星空与低频流星，浅色保留柔和光晕。
 * 随机值都在客户端 useEffect 里生成，避免 SSR 与客户端不一致触发 hydration 报错。
 */
export default function Background() {
  const { resolvedTheme } = useTheme();
  const [starLayers, setStarLayers] = useState<StarLayer[]>([]);
  const [twinkleStars, setTwinkleStars] = useState<TwinkleStar[]>([]);
  const [meteor, setMeteor] = useState<Meteor | null>(null);
  const [glowOrbs, setGlowOrbs] = useState<GlowOrb[]>([]);
  const [motionActive, setMotionActive] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionActive(!media.matches && !document.hidden);
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    setMeteor(null);
    if (!motionActive || resolvedTheme !== "dark") return;
    let next: ReturnType<typeof setTimeout>;
    let finish: ReturnType<typeof setTimeout>;
    const schedule = () => {
      next = setTimeout(
        () => {
          setMeteor({
            id: Date.now(),
            left: `${45 + Math.random() * 50}%`,
            top: `${3 + Math.random() * 22}%`,
          });
          finish = setTimeout(() => setMeteor(null), 1100);
          schedule();
        },
        20000 + Math.random() * 20000,
      );
    };
    schedule();
    return () => {
      clearTimeout(next);
      clearTimeout(finish);
    };
  }, [motionActive, resolvedTheme]);

  // 鼠标位置（供光晕“吹拂”联动）
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    if (!motionActive || resolvedTheme !== "light") return;
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY, motionActive, resolvedTheme]);

  useEffect(() => {
    // 三层细星点使用零扩散阴影，避免原先的大圆点和大量 DOM。
    setStarLayers(
      [
        { count: 140, size: 0.8, alpha: 0.22, duration: 260 },
        { count: 28, size: 1.1, alpha: 0.38, duration: 210 },
        { count: 6, size: 1.5, alpha: 0.55, duration: 160 },
      ].map(({ count, size, alpha, duration }, layer) => ({
        size,
        duration,
        shadows: Array.from({ length: count }, () => {
          const { x, y } = starPosition(layer === 2);
          const opacity = (alpha + Math.random() * 0.16).toFixed(2);
          return `${x.toFixed(2)}vw ${y.toFixed(2)}vh 0 0 rgba(218,230,245,${opacity})`;
        }).join(","),
      })),
    );

    // 少量会闪烁的亮星（单独 DOM）
    setTwinkleStars(
      Array.from({ length: 6 }, (_, i) => {
        const { x, y } = starPosition(true);
        return {
          id: i,
          left: `${x.toFixed(2)}vw`,
          top: `${y.toFixed(2)}vh`,
          size: Math.random() < 0.75 ? 1.5 : 2,
          delay: (-Math.random() * 14).toFixed(2),
          duration: (9 + Math.random() * 5).toFixed(2),
          tint: Math.random() < 0.3 ? "#b7cce8" : "#d5e0ef",
        };
      }),
    );

    // 浅色模糊光晕：随机位置/大小/颜色/节奏，各自无限“时隐时现”
    setGlowOrbs(
      GLOW_ZONES.map((zone, i) => {
        const left =
          zone.left[0] + Math.random() * (zone.left[1] - zone.left[0]);
        const top = zone.top[0] + Math.random() * (zone.top[1] - zone.top[0]);
        return {
          id: i,
          left,
          top,
          size: 12 + Math.random() * 20, // 12~32vh
          tint: GLOW_TINTS[i % GLOW_TINTS.length], // 每团各用一色
          peak: 0.35 + Math.random() * 0.3, // 最大不透明度 0.35~0.65
          duration: 8 + Math.random() * 5, // 单周期 8~13s
          delay: Math.random() * 6, // 起步错峰
          repeatDelay: 1.5 + Math.random() * 3, // 隐去后间歇 1.5~4.5s
          driftX: (Math.random() * 2 - 1) * 70,
          driftY: (Math.random() * 2 - 1) * 40,
        };
      }),
    );
  }, []);

  return (
    <div
      aria-hidden="true"
      className="site-background pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      data-motion={motionActive ? "active" : "paused"}
    >
      {/* 阅读区压淡星光，保留上方与两侧的纵深。 */}
      <div className="night-sky hidden dark:block absolute inset-0">
        <div className="star-field absolute inset-0">
          {starLayers.map((layer, i) => (
            <div
              key={i}
              className={`star-layer star-layer-${i}`}
              style={{ animationDuration: `${layer.duration}s` }}
            >
              <span
                className="absolute left-0 top-0 rounded-full"
                style={{
                  width: layer.size,
                  height: layer.size,
                  boxShadow: layer.shadows,
                }}
              />
            </div>
          ))}
          {twinkleStars.map((s) => (
            <div
              key={s.id}
              className="twinkle-star absolute rounded-full"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                background: s.tint,
                boxShadow: `0 0 5px ${s.tint}33`,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>

        {motionActive && resolvedTheme === "dark" && meteor && (
          <span
            key={meteor.id}
            className="meteor"
            style={{
              top: meteor.top,
              left: meteor.left,
            }}
          />
        )}
      </div>

      {/* 浅色模糊光晕（仅浅色模式）：各自不同颜色，时隐时现 + 鼠标吹拂联动 */}
      <div className="block dark:hidden">
        {glowOrbs.map((g) => (
          <GlowOrbView
            key={g.id}
            orb={g}
            mouseX={mouseX}
            mouseY={mouseY}
            animated={motionActive && resolvedTheme === "light"}
          />
        ))}
      </div>
    </div>
  );
}
