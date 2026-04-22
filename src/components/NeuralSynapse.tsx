'use client';

import { useEffect, useRef } from 'react';

export function NeuralSynapse({ count = 100 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      pulse: number;
      pulseSpeed: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        pulse: Math.random() * Math.PI,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    let animationFrameId: number;

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 18, 0.15)'; // Deep space background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, i) => {
        // Subtle drift
        p.x += p.vx;
        p.y += p.vy;

        // Interaction with mouse (gentle attraction)
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distToMouse < 250) {
          p.x += dx * 0.005;
          p.y += dy * 0.005;
        }

        // Bounce
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        p.pulse += p.pulseSpeed;
        const radius = 1 + Math.sin(p.pulse) * 0.8;
        const opacity = 0.3 + Math.sin(p.pulse) * 0.2;

        ctx.fillStyle = `rgba(0, 240, 255, ${opacity})`;
        ctx.shadowBlur = radius * 4;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Connect to neighbors
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            
            const lineOpacity = (1 - (dist / 150)) * 0.25;
            
            // Random pulse along lines
            const isPulsing = Math.sin(p.pulse + j) > 0.95;
            ctx.strokeStyle = isPulsing 
              ? `rgba(255, 255, 255, ${lineOpacity * 2})` 
              : `rgba(0, 240, 255, ${lineOpacity})`;
              
            ctx.lineWidth = isPulsing ? 1.5 : 0.8;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [count]);
  
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10 pointer-events-none" />;
}
