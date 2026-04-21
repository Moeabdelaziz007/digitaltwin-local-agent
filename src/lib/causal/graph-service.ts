/**
 * /src/lib/causal/graph-service.ts
 * High-level API for managing and querying the Causal Knowledge Graph.
 */

import PocketBase from 'pocketbase';
import { CausalNode, CausalEdge } from '@/types/twin';

export interface GraphData {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export class CausalGraphService {
  constructor(private pb: PocketBase) {}

  /**
   * Get the full graph for a user (useful for visualization).
   */
  async getFullGraph(userId: string): Promise<GraphData> {
    const nodes = await this.pb.collection('causal_nodes').getFullList<CausalNode>({
      filter: `user_id = "${userId}"`,
    });
    const edges = await this.pb.collection('causal_edges').getFullList<CausalEdge>({
      filter: `user_id = "${userId}"`,
    });

    return { nodes, edges };
  }

  /**
   * Find all nodes that are directly or indirectly causing a specific target label.
   * Useful for "Why did this profit/loss happen?"
   */
  async findCausesFor(userId: string, targetLabel: string): Promise<GraphData> {
    const targetNode = await this.pb.collection('causal_nodes').getFirstListItem<CausalNode>(
      `user_id = "${userId}" && normalized_label = "${targetLabel.toLowerCase()}"`
    ).catch(() => null);

    if (!targetNode) return { nodes: [], edges: [] };

    // Simple 1-level deep search for now (can be expanded to BFS/DFS)
    const incomingEdges = await this.pb.collection('causal_edges').getFullList<CausalEdge>({
      filter: `user_id = "${userId}" && target = "${targetNode.id}"`,
    });

    const sourceIds = incomingEdges.map(e => e.source);
    const sourceNodes = await this.pb.collection('causal_nodes').getFullList<CausalNode>({
      filter: sourceIds.map(id => `id = "${id}"`).join(' || ') || 'id = "none"',
    });

    return {
      nodes: [targetNode, ...sourceNodes],
      edges: incomingEdges,
    };
  }

  /**
   * Identifies successful patterns by looking at paths leading to 'profit' nodes.
   */
  async identifySuccessfulPatterns(userId: string): Promise<string[]> {
    const profitNodes = await this.pb.collection('causal_nodes').getFullList<CausalNode>({
      filter: `user_id = "${userId}" && node_type = "profit"`,
      sort: '-importance',
    });

    if (profitNodes.length === 0) return [];

    const insights: string[] = [];
    for (const node of profitNodes) {
      const { nodes, edges } = await this.findCausesFor(userId, node.label);
      if (nodes.length > 1) {
        const causes = nodes.filter(n => n.id !== node.id).map(n => n.label).join(', ');
        insights.push(`Profit from "${node.label}" was driven by: ${causes}`);
      }
    }

    return insights;
  }
}
