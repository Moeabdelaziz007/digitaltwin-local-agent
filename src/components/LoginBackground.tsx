'use client';

import { useEffect, useRef } from 'react';

export const LoginBackground = ({ children }: { children?: React.ReactNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // ── Setup Dimensions ──
    const setDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setDimensions();
    window.addEventListener('resize', setDimensions);

    // ── Layer A: Matrix Rain ──
    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const alphabet = katakana + latin + nums;
    const fontSize = 16;
    const columns = Math.ceil(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1).map(() => Math.random() * -100);

    // ── Layer B: Particle Grid ──
    const particleCount = window.innerWidth < 768 ? 40 : 100;
    const particles = Array(particleCount).fill(0).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));

    // ── Layer C: Scan Lines State ──
    let scanPos = 0;

    // ── Main Render Loop (60fps) ──
    const render = (time: number) => {
      // 1. Clear Background (Void)
      ctx.fillStyle = 'rgba(10, 10, 15, 0.2)'; // Fading trail
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Layer D: Neon Wireframe Grid (Pulsing) ──
      const pulse = Math.sin(time / 1500) * 0.05 + 0.05;
      ctx.strokeStyle = `rgba(0, 240, 255, ${pulse})`;
      ctx.lineWidth = 1;
      const gridSize = 60;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // ── Layer A: Matrix Rain ──
      ctx.fillStyle = '#00f0ff';
      ctx.font = `${fontSize}px JetBrains Mono`;
      drops.forEach((y, i) => {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });

      // ── Layer B: Particle Grid ──
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      // ── Layer C: Scan line ──
      scanPos = (scanPos + 2) % canvas.height;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.03)';
      ctx.fillRect(0, scanPos, canvas.width, 2);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', setDimensions);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none -z-10 bg-bg-void"
      />
      {children}
    </main>
  );
};
