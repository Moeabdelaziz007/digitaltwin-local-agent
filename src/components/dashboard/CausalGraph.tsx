'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CausalNode, CausalEdge } from '@/types/twin';

interface Props {
  graph?: {
    nodes: Partial<CausalNode>[];
    edges: Partial<CausalEdge>[];
  };
  className?: string;
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

export const CausalGraph: React.FC<Props> = ({ graph, className }) => {
  // Basic layout logic: Categorize nodes into columns
  const columns = useMemo(() => {
    if (!graph?.nodes) return [];
    const cols: Record<string, Partial<CausalNode>[]> = {
      event: [],
      context: [],
      decision: [],
      outcome: [],
      profit: [],
    };

    graph.nodes.forEach(node => {
      const type = node.node_type || 'context';
      if (cols[type]) cols[type].push(node);
      else cols.context.push(node);
    });

    return Object.entries(cols).filter(([_, nodes]) => nodes.length > 0);
  }, [graph?.nodes]);

  // Map nodes to coordinates
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const colWidth = 180;
    const rowHeight = 70;

    columns.forEach(([type, nodes], colIdx) => {
      nodes.forEach((node, rowIdx) => {
        if (node.id) {
          positions[node.id] = {
            x: colIdx * colWidth + 20,
            y: rowIdx * rowHeight + 60,
          };
        }
      });
    });

    return positions;
  }, [columns]);

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 border border-white/10 rounded-xl bg-black/20 ${className}`}>
        <p className="text-white/40 text-sm font-mono uppercase tracking-widest">No Causal Data</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black/40 border border-white/10 rounded-2xl p-4 ${className}`}>
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        <span className="text-[9px] font-mono text-white/50 tracking-[0.2em] uppercase">Reasoning Spine v1.0</span>
      </div>

      <div className="relative w-full h-full min-h-[300px]">
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.2)" />
            </marker>
          </defs>

          {/* Render Edges */}
          {graph.edges.map((edge, i) => {
            const start = nodePositions[edge.source || ''];
            const end = nodePositions[edge.target || ''];
            if (!start || !end) return null;

            const isPositive = (edge.weight || 0) > 0;
            const strokeColor = isPositive ? 'rgba(34, 211, 238, 0.25)' : 'rgba(244, 63, 94, 0.25)';

            // Draw curved lines
            const midX = (start.x + NODE_WIDTH + end.x) / 2;
            const path = `M ${start.x + NODE_WIDTH} ${start.y + NODE_HEIGHT / 2} 
                          C ${midX} ${start.y + NODE_HEIGHT / 2}, 
                            ${midX} ${end.y + NODE_HEIGHT / 2}, 
                            ${end.x} ${end.y + NODE_HEIGHT / 2}`;

            return (
              <motion.path
                key={`edge-${i}`}
                d={path}
                stroke={strokeColor}
                strokeWidth="1.5"
                fill="none"
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            );
          })}
        </svg>

        {/* Render Nodes as HTML for better styling */}
        {graph.nodes.map((node, i) => {
          const pos = nodePositions[node.id || ''];
          if (!pos) return null;

          const typeColors: Record<string, string> = {
            event: 'border-blue-500/30 text-blue-300 shadow-blue-500/10',
            decision: 'border-purple-500/30 text-purple-300 shadow-purple-500/10',
            outcome: 'border-orange-500/30 text-orange-300 shadow-orange-500/10',
            profit: 'border-emerald-500/30 text-emerald-300 shadow-emerald-500/10',
            context: 'border-white/10 text-white/60 shadow-white/5',
          };

          return (
            <motion.div
              key={`node-${node.id || i}`}
              style={{ 
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15, delay: i * 0.03 }}
              className={`flex items-center justify-center px-2 py-1 rounded-md border bg-black/80 backdrop-blur-sm shadow-lg z-20 ${typeColors[node.node_type || 'context']}`}
            >
              <span className="text-[9px] font-bold font-mono text-center leading-[1.1] truncate overflow-hidden">
                {node.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
