"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  baseAlpha: number;
  delay: number;
  revealed: boolean;
}

export default function DotBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DOT_SPACING = 30;
    let dots: Dot[] = [];
    let animFrame: number;
    let startTime = 0;

    function buildDots(w: number, h: number) {
      dots = [];
      const cols = Math.ceil(w / DOT_SPACING) + 1;
      const rows = Math.ceil(h / DOT_SPACING) + 1;
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * DOT_SPACING;
          const y = r * DOT_SPACING;
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // reveal outward from center
          const delay = (dist / maxDist) * 1400;
          const baseAlpha = 0.12 + Math.random() * 0.1;
          dots.push({ x, y, alpha: 0, targetAlpha: 0, baseAlpha, delay, revealed: false });
        }
      }
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildDots(canvas.width, canvas.height);
      startTime = performance.now();
    }

    function draw(now: number) {
      if (!ctx || !canvas) return;
      const elapsed = now - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const dot of dots) {
        if (!dot.revealed && elapsed >= dot.delay) {
          dot.revealed = true;
          dot.targetAlpha = dot.baseAlpha;
        }
        // Ease toward target
        dot.alpha += (dot.targetAlpha - dot.alpha) * 0.04;

        if (dot.alpha > 0.004) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${dot.alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      animFrame = requestAnimationFrame(draw);
    }

    resize();
    animFrame = requestAnimationFrame(draw);

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
