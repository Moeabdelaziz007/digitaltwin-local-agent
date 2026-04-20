'use client';

import { useEffect, useRef } from 'react';
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// ── Particle Background Component ──
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number }> = [];
    const particleCount = typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : 80;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2,
        });
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(animate);
    };

    init();
    animate();
    window.addEventListener('resize', init);
    return () => window.removeEventListener('resize', init);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

// ── Hologram Avatar Components ──
const Hologram = () => (
  <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center perspective-1000">
    {/* Inner Hexagon Shadow */}
    <div className="absolute w-24 h-24 bg-violet/20 blur-3xl rounded-full" />
    
    {/* Concentric Rotating Rings */}
    <div className="absolute inset-0 border-2 border-cyan/40 rounded-full animate-[hologram-spin_8s_linear_infinite]" 
         style={{ transformStyle: 'preserve-3d', transform: 'rotateX(75deg)' }} />
    <div className="absolute inset-4 border-2 border-cyan/60 rounded-full animate-[hologram-spin_12s_linear_infinite_reverse]" 
         style={{ transformStyle: 'preserve-3d', transform: 'rotateX(75deg)' }} />
    <div className="absolute inset-8 border border-cyan/80 rounded-full animate-[hologram-spin_15s_linear_infinite]" 
         style={{ transformStyle: 'preserve-3d', transform: 'rotateX(75deg)' }} />
    
    {/* Hexagon Silhouette */}
    <motion.div 
      animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 4, repeat: Infinity }}
      className="z-10 text-violet"
    >
      <svg width="80" height="80" viewBox="0 0 100 100" fill="currentColor">
        <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
      </svg>
    </motion.div>
  </div>
);

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="relative min-h-svh bg-bg-void text-text-primary font-body overflow-x-hidden scan-overlay">
      <ParticleCanvas />
      
      {/* ── Navigation ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 pointer-events-auto">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 100 100" className="text-cyan animate-pulse">
            <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="8" />
            <circle cx="50" cy="50" r="10" fill="currentColor" />
          </svg>
          <span className="font-display font-bold tracking-tighter text-xl hidden sm:inline">DIGITAL TWIN</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Show when="signed-in">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-sm font-display text-cyan hover:text-white transition-all uppercase tracking-widest"
            >
              System Dashboard
            </button>
            <UserButton afterSignOutUrl="/" />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-sm font-display uppercase tracking-widest text-text-muted hover:text-cyan transition-all">
                Login
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="neon-border px-6 py-2 rounded-sm text-xs font-display font-bold uppercase tracking-widest glass hover:scale-105 transition-all">
                Initialize Twin
              </button>
            </SignUpButton>
          </Show>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 flex flex-col-reverse lg:flex-row items-center justify-center min-h-[calc(100vh-80px)] px-6 md:px-12 py-12 gap-16 lg:gap-0">
        <div className="flex-1 max-w-2xl text-center lg:text-left">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-text-muted text-xs md:text-sm tracking-[0.3em] uppercase mb-6"
          >
            Cognitive Twin System v2.1
          </motion.p>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-display font-bold text-4xl md:text-6xl lg:text-8xl leading-tight mb-8 glitch-text"
          >
            YOUR DIGITAL <br />
            <span className="text-cyan glow-text">CONSCIOUSNESS</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-text-muted text-lg md:text-xl leading-relaxed mb-12 max-w-xl mx-auto lg:mx-0"
          >
            An AI that learns, remembers, and evolves with every conversation. Your private, local-first intellectual backup.
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
            <SignUpButton mode="modal">
              <button className="group relative px-12 py-5 font-display font-bold uppercase tracking-[0.2em] text-sm overflow-hidden transition-all hover:scale-105">
                <div className="absolute inset-0 bg-cyan opacity-10 group-hover:opacity-20 transition-all" />
                <div className="absolute inset-0 border border-cyan/50 glow-text" />
                <span className="relative z-10 text-cyan group-hover:text-white">── Initialize Twin ──</span>
              </button>
            </SignUpButton>
          </div>

          <div className="mt-16 flex items-center justify-center lg:justify-start gap-8">
            {[
              { label: 'Memory Active', active: true },
              { label: 'Learning Enabled', active: true },
              { label: 'Voice Ready', active: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-cyan animate-pulse' : 'bg-text-faint'}`} />
                <span className="text-[10px] font-display text-text-faint uppercase tracking-tighter">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center pt-12 lg:pt-0">
          <Hologram />
        </div>
      </section>

      {/* ── Features Strip ── */}
      <section className="relative z-10 px-6 md:px-12 py-24 border-t border-white/5 bg-bg-surface/50 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            { tag: '⬡ LEARNS', text: 'Extracts facts from every conversation automatically and identifies emerging patterns.' },
            { tag: '⬡ REMEMBERS', text: 'Builds a persistent memory matrix that grows over time, ensuring context is never lost.' },
            { tag: '⬡ EVOLVES', text: 'Adapts personality and knowledge base through deep cognitive refinement layers.' }
          ].map((f, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="glass p-8 group border-t-2 border-t-violet/30 hover:border-t-cyan/100 transition-all"
            >
              <h3 className="font-display font-bold text-cyan mb-4 tracking-wider">{f.tag}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 px-6 md:px-12 py-24 text-center">
        <h2 className="font-display font-bold text-2xl mb-16 uppercase tracking-widest text-text-muted">Lifecycle Architecture</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 relative max-w-4xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan/20 to-transparent hidden md:block" />
          
          {[
            { num: '01', title: 'INITIALIZE', desc: 'Secure Your Identity' },
            { num: '02', title: 'CONVERSE', desc: 'Interactive Training' },
            { num: '03', title: 'EVOLVE', desc: 'Cognitive Refinement' }
          ].map((s, i) => (
            <div key={i} className="relative z-10">
              <div className="w-16 h-16 rounded-full glass border border-cyan/20 flex items-center justify-center mb-6 mx-auto group hover:border-cyan transition-all">
                <span className="font-display text-xs text-cyan opacity-50 group-hover:opacity-100">{s.num}</span>
              </div>
              <h4 className="font-display text-sm font-bold mb-2 uppercase tracking-widest">{s.title}</h4>
              <p className="text-[10px] text-text-faint font-display uppercase tracking-widest">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 text-center">
        <p className="font-display text-[10px] text-text-faint tracking-[0.5em] uppercase">
          Digital Twin System // Private Cognitive Layer Active // Local-Host Intelligence
        </p>
      </footer>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        @keyframes hologram-spin {
          from { transform: rotateY(0) rotateX(75deg); }
          to { transform: rotateY(360deg) rotateX(75deg); }
        }
      `}</style>
    </div>
  );
}
