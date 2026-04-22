'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Activity } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'skill' | 'interest' | 'fact';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Link {
  source: string;
  target: string;
}

export function MemoryCanvas({ skills = [], interests = [] }: { skills: string[], interests: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    // Initialize nodes
    const newNodes: Node[] = [
      ...skills.map(s => ({ id: s, label: s, type: 'skill' as const })),
      ...interests.map(i => ({ id: i, label: i, type: 'interest' as const }))
    ].map((node, i) => ({
      ...node,
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    }));

    // Create random links
    const newLinks: Link[] = [];
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        if (Math.random() > 0.8) {
          newLinks.push({ source: newNodes[i].id, target: newNodes[j].id });
        }
      }
    }

    setNodes(newNodes);
    setLinks(newLinks);
  }, [skills, interests]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update Physics
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
      });

      // Draw Links
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.lineWidth = 1;
      links.forEach(link => {
        const s = nodes.find(n => n.id === link.source);
        const t = nodes.find(n => n.id === link.target);
        if (s && t) {
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
      });

      // Draw Nodes
      nodes.forEach(node => {
        ctx.fillStyle = node.type === 'skill' ? '#00f0ff' : '#a855f7';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '8px Inter';
        ctx.fillText(node.label, node.x + 8, node.y + 4);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, links]);

  return (
    <div className="relative w-full h-[400px] glass-surface rounded-3xl border-white/5 overflow-hidden group">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={400} 
        className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity duration-1000"
      />
      
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan">
          <Brain size={16} />
        </div>
        <div>
          <h3 className="text-[10px] font-display font-bold text-white uppercase tracking-[0.2em]">Neural Memory Canvas</h3>
          <p className="text-[7px] text-text-muted uppercase tracking-widest flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-cyan animate-pulse" />
            Live Sync: Persona Alignment v4.2
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan" />
          <span className="text-[8px] text-text-muted uppercase tracking-widest font-bold">Skills</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-[8px] text-text-muted uppercase tracking-widest font-bold">Interests</span>
        </div>
      </div>
    </div>
  );
}
