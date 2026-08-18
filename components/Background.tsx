"use client";
import { useEffect, useState } from "react";
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

interface Meteor {
  id: number;
  left: string;
  top: string;
  delay: string;
  duration: string;
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
}: {
  orb: GlowOrb;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  const offset = useTransform([mouseX, mouseY], (latest) => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const mx = latest[0];
    const my = latest[1];
    const cx = (orb.left / 100) * window.innerWidth;
    const cy = (orb.top / 100) * window.innerHeight;
    const dx = cx - mx;
    const dy = cy - my;
    const dist = Math.hypot(dx, dy);
    const f = Math.max(0, 1 - dist / 340); // 340px 内开始受影响
    const s = f * f * 46; // 平方衰减，最大偏移约 46px
    return dist > 1 ? { x: (dx / dist) * s, y: (dy / dist) * s } : { x: 0, y: 0 };
  });
  const springCfg = { stiffness: 110, damping: 16, mass: 0.7 };
  const ox = useSpring(useTransform(offset, (o) => o.x), springCfg);
  const oy = useSpring(useTransform(offset, (o) => o.y), springCfg);

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
        initial={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
        animate={{
          opacity: [0, orb.peak, orb.peak * 0.45, 0],
          scale: [0.7, 1.12, 0.96, 0.72],
          x: [0, orb.driftX * 0.35, orb.driftX * 0.7, orb.driftX],
          y: [0, orb.driftY * 0.4, orb.driftY * 0.75, orb.driftY],
        }}
        transition={{
          duration: orb.duration,
          delay: orb.delay,
          times: [0, 0.32, 0.68, 1],
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: orb.repeatDelay,
        }}
      >
        <motion.div
          style={{
            width: `${orb.size}vh`,
            height: `${orb.size}vh`,
            borderRadius: "9999px",
            background: `radial-gradient(circle, ${orb.tint} 0%, ${orb.tint}59 45%, transparent 72%)`,
            filter: "blur(18px)",
            x: ox,
            y: oy,
          }}
        />
      </motion.div>
    </div>
  );
}

/**
 * 全局背景层：星空 + 极光（暗色模式更明显）+ 浅色模糊光晕
 * 随机值都在客户端 useEffect 里生成，避免 SSR 与客户端不一致触发 hydration 报错。
 */
export default function Background() {
  const [staticStars, setStaticStars] = useState<string>("");
  const [twinkleStars, setTwinkleStars] = useState<TwinkleStar[]>([]);
  const [meteors, setMeteors] = useState<Meteor[]>([]);
  const [glowOrbs, setGlowOrbs] = useState<GlowOrb[]>([]);

  // 鼠标位置（供光晕“吹拂”联动）
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    // 静态星点（box-shadow 批量绘制，避免大量 DOM）
    const shadows: string[] = [];
    for (let i = 0; i < 140; i++) {
      const x = (Math.random() * 100).toFixed(2);
      const y = (Math.random() * 100).toFixed(2);
      const size = Math.random() < 0.75 ? 1 : 2;
      const alpha = (0.3 + Math.random() * 0.6).toFixed(2);
      shadows.push(`${x}vw ${y}vh 0 ${size}px rgba(255,255,255,${alpha})`);
    }
    setStaticStars(shadows.join(","));

    // 少量会闪烁的亮星（单独 DOM）
    setTwinkleStars(
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(Math.random() * 100).toFixed(2)}vw`,
        top: `${(Math.random() * 100).toFixed(2)}vh`,
        size: Math.random() < 0.5 ? 1.5 : 2.5,
        delay: (Math.random() * 4).toFixed(2),
        duration: (2 + Math.random() * 3).toFixed(2),
        tint: Math.random() < 0.3 ? "#67e8f9" : "#ffffff",
      })),
    );

    // 流星：集中在画面上半部分，随机起落
    setMeteors(
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        left: `${(10 + Math.random() * 75).toFixed(2)}%`,
        top: `${(Math.random() * 30).toFixed(2)}%`,
        delay: `${(Math.random() * 9).toFixed(2)}s`,
        duration: `${(3.5 + Math.random() * 3).toFixed(2)}s`,
      })),
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
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 静态星点层（客户端生成） */}
      {staticStars && (
        <div
          className="absolute left-0 top-0 h-0.5 w-0.5 rounded-full bg-white opacity-30 dark:opacity-70"
          style={{ boxShadow: staticStars }}
        />
      )}

      {/* 闪烁星（客户端生成） */}
      {twinkleStars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: s.tint,
            boxShadow: `0 0 ${s.size * 3}px ${s.tint}`,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            opacity: 0.5,
          }}
        />
      ))}

      {/* 极光光斑（仅暗色模式显示，无随机数，可安全 SSR） */}
      <div className="hidden dark:block">
        <div
          className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]"
          style={{ animation: "float1 14s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-violet-500/20 blur-[120px]"
          style={{ animation: "float2 16s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-[120px]"
          style={{ animation: "float3 18s ease-in-out infinite" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#05060a_78%)]" />
      </div>

      {/* 流星层（仅暗色模式） */}
      <div className="hidden dark:block">
        {meteors.map((m) => (
          <span
            key={`meteor-${m.id}`}
            className="meteor"
            style={{
              top: m.top,
              left: m.left,
              animationDelay: m.delay,
              animationDuration: m.duration,
            }}
          />
        ))}
      </div>

      {/* 浅色模糊光晕（仅浅色模式）：各自不同颜色，时隐时现 + 鼠标吹拂联动 */}
      <div className="block dark:hidden">
        {glowOrbs.map((g) => (
          <GlowOrbView key={g.id} orb={g} mouseX={mouseX} mouseY={mouseY} />
        ))}
      </div>
    </div>
  );
}
