"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import pb from "@/lib/pocketbase-client";
import FactNodeComponent from "@/components/memory-canvas/FactNode";
import NodeDetailPanel from "@/components/memory-canvas/NodeDetailPanel";
import CanvasToolbar from "@/components/memory-canvas/CanvasToolbar";
import { useUser } from "@clerk/nextjs";
import { GitBranch, Network } from "lucide-react";

/* ── Custom node type registration ── */
const NODE_TYPES = { factNode: FactNodeComponent };

interface FactNodeData {
  label: string;
  category: string;
  confidence: number;
  tags: string[];
}

export default function MemoryCanvasPage() {
  const [viewMode, setViewMode] = useState<"facts" | "causal">("facts");
  const { user, isLoaded: userLoaded } = useUser();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeData, setSelectedNodeData] =
    useState<FactNodeData | null>(null);

  /* ── Load facts + edges from PocketBase ── */
  useEffect(() => {
    async function loadCanvasMap() {
      if (!userLoaded) return;
      
      try {
        const userId = user?.id;
        if (!userId) {
          setLoading(false);
          return;
        }

        const relationColor: Record<string, string> = {
          causes: "#60A5FA",
          amplifies: "#A78BFA",
          reduces: "#34D399",
          blocks: "#F87171",
          depends_on: "#FBBF24",
        };

        if (viewMode === "causal") {
          const nodesRes = await pb.collection("causal_nodes").getFullList({
            filter: `user_id = "${userId}"`,
            sort: "-created",
          });
          const edgesRes = await pb.collection("causal_edges").getFullList({
            filter: `user_id = "${userId}"`,
          });

          const newNodes: Node[] = nodesRes.map((node, index) => ({
            id: node.id,
            type: "factNode",
            position: {
              x: (index % 4) * 280 + Math.random() * 40,
              y: Math.floor(index / 4) * 180 + Math.random() * 30,
            },
            data: {
              label: node.label,
              category: node.node_type,
              confidence: 0.8,
              tags: [],
            },
          }));

          const newEdges: Edge[] = edgesRes.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: `${edge.relation_type} (${Number(edge.weight || 0).toFixed(2)})`,
            animated: Number(edge.weight || 0) > 0.65,
            style: {
              stroke: relationColor[edge.relation_type] || "var(--color-brand-primary)",
              strokeWidth: 1 + Number(edge.weight || 0) * 2.5,
              strokeOpacity: 0.8,
            },
          }));
          setNodes(newNodes);
          setEdges(newEdges);
          return;
        }

        const factsRes = await pb.collection("facts").getFullList({
          filter: `user_id = "${userId}" && is_active = true`,
          sort: "-created",
        });

        const edgesRes = await pb.collection("memory_edges").getFullList({
          filter: `user_id = "${userId}"`,
        });

        const newNodes: Node[] = factsRes.map((fact, index) => ({
          id: fact.id,
          type: "factNode",
          position: {
            x: (index % 4) * 280 + Math.random() * 40,
            y: Math.floor(index / 4) * 180 + Math.random() * 30,
          },
          data: {
            label: fact.fact_text,
            category: fact.category,
            confidence: fact.confidence,
            tags:
              typeof fact.tags === "string"
                ? JSON.parse(fact.tags || "[]")
                : fact.tags || [],
          },
        }));

        const newEdges: Edge[] = edgesRes.map((edge) => ({
          id: edge.id,
          source: edge.source_fact,
          target: edge.target_fact,
          label: edge.relationship_type,
          animated: true,
          style: {
            stroke: "var(--color-brand-primary)",
            strokeOpacity: 0.5,
          },
        }));

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        console.error("Canvas Load Error:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadCanvasMap();
  }, [setEdges, setNodes, user?.id, userLoaded, viewMode]);

  /* ── Node click → show detail panel ── */
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data as unknown as FactNodeData);
  }, []);

  /* ── Memoize node types to prevent re-registration ── */
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-svh min-h-dvh bg-bg-app text-[var(--foreground)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          <span className="text-sm font-mono text-primitive-text-muted">
            Loading Knowledge Graph...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh min-h-dvh bg-bg-app text-[var(--foreground)]">
      {/* ── Canvas Area ── */}
      <main className="flex-1 relative">
        <CanvasToolbar />
        <div className="absolute top-4 right-4 z-10 glass-surface rounded-xl p-1.5 flex items-center gap-1">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1 ${viewMode === "facts" ? "bg-white/10 text-white" : "text-primitive-text-muted"}`}
            onClick={() => setViewMode("facts")}
          >
            <Network size={14} />
            Memory Facts
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1 ${viewMode === "causal" ? "bg-white/10 text-white" : "text-primitive-text-muted"}`}
            onClick={() => setViewMode("causal")}
          >
            <GitBranch size={14} />
            Causal View
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          minZoom={0.3}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            className="!bg-surface-panel !border-border-subtle !rounded-lg !shadow-none [&>button]:!bg-surface-panel [&>button]:!border-border-subtle [&>button]:!text-primitive-text-muted [&>button:hover]:!bg-white/10"
          />
          <MiniMap
            nodeStrokeColor="var(--color-border-subtle)"
            nodeColor="var(--color-surface-panel)"
            maskColor="rgba(0,0,0,0.4)"
            className="!bg-surface-panel !border-border-subtle !rounded-lg"
          />
          <Background
            gap={24}
            size={1}
            color="var(--color-primitive-text-muted)"
            style={{ opacity: 0.12 }}
          />
        </ReactFlow>
      </main>

      {/* ── Detail Panel ── */}
      <NodeDetailPanel
        data={selectedNodeData}
        onClose={() => setSelectedNodeData(null)}
      />
    </div>
  );
}
