import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { agentWiki } from './agent-wiki';

/**
 * src/lib/holding/workforce-tree.ts
 * Implements the "Workforce Wiki Tree" hierarchy.
 * Allows agents to hire sub-agents and manage their performance/budgets.
 */

export interface WorkforceNode {
  id: string;
  role: string;
  title: string;
  hiredBy: string;
  reportsTo: string;
  manages: string[];
  budget: {
    allocated: number;
    spent: number;
  };
  performance: {
    runs: number;
    successRate: number;
    revenueGenerated: number;
  };
  status: 'active' | 'on_leave' | 'terminated';
  created_at: string;
}

export class WorkforceTree {
  private static instance: WorkforceTree;
  private dbPath = join(process.cwd(), 'ventures', 'workforce.json');
  private nodes: Record<string, WorkforceNode> = {};

  private constructor() {
    this.load();
  }

  public static getInstance(): WorkforceTree {
    if (!WorkforceTree.instance) {
      WorkforceTree.instance = new WorkforceTree();
    }
    return WorkforceTree.instance;
  }

  private load() {
    if (existsSync(this.dbPath)) {
      this.nodes = JSON.parse(readFileSync(this.dbPath, 'utf8'));
    } else {
      // Initialize with Founder/Board
      const boardId = 'board-0';
      this.nodes[boardId] = {
        id: boardId,
        role: 'board',
        title: 'Founder / Board',
        hiredBy: 'system',
        reportsTo: 'user',
        manages: [],
        budget: { allocated: 1000, spent: 0 },
        performance: { runs: 0, successRate: 1, revenueGenerated: 0 },
        status: 'active',
        created_at: new Date().toISOString()
      };
      this.save();
    }
  }

  private save() {
    const dir = join(process.cwd(), 'ventures');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.dbPath, JSON.stringify(this.nodes, null, 2));
  }

  /**
   * Hire a new agent into the tree
   */
  public async hire(parentId: string, spec: { role: string; title: string; budget: number }): Promise<WorkforceNode> {
    const parent = this.nodes[parentId];
    if (!parent) throw new Error(`Parent node ${parentId} not found.`);

    // Check parent budget
    if (parent.budget.allocated - parent.budget.spent < spec.budget) {
      throw new Error(`Insufficient budget in ${parent.title} to hire ${spec.title}`);
    }

    const newNode: WorkforceNode = {
      id: `${spec.role}-${Date.now()}`,
      role: spec.role,
      title: spec.title,
      hiredBy: parentId,
      reportsTo: parentId,
      manages: [],
      budget: { allocated: spec.budget, spent: 0 },
      performance: { runs: 0, successRate: 0, revenueGenerated: 0 },
      status: 'active',
      created_at: new Date().toISOString()
    };

    this.nodes[newNode.id] = newNode;
    parent.manages.push(newNode.id);
    
    // Deduct from parent budget (as allocated)
    parent.budget.spent += spec.budget;

    this.save();
    agentWiki.updateWiki(newNode);
    return newNode;
  }

  /**
   * Recursive Performance Roll-up: Aggregates metrics from bottom-up.
   */
  public evaluatePerformance(nodeId: string): { successRate: number; totalRuns: number; revenue: number } {
    const node = this.nodes[nodeId];
    if (!node) return { successRate: 0, totalRuns: 0, revenue: 0 };

    if (node.manages.length === 0) {
      // Leaf agent: return own metrics
      return {
        successRate: node.performance.successRate,
        totalRuns: node.performance.runs,
        revenue: node.performance.revenueGenerated
      };
    }

    // Branch agent: aggregate from subordinates
    let totalRuns = node.performance.runs;
    let totalRevenue = node.performance.revenueGenerated;
    let weightedSuccessSum = node.performance.successRate * node.performance.runs;

    for (const subId of node.manages) {
      const subPerf = this.evaluatePerformance(subId);
      totalRuns += subPerf.totalRuns;
      totalRevenue += subPerf.revenue;
      weightedSuccessSum += subPerf.successRate * subPerf.totalRuns;
    }

    const avgSuccessRate = totalRuns > 0 ? weightedSuccessSum / totalRuns : node.performance.successRate;

    // Update node with rolled-up metrics (for visualization/caching)
    node.performance = {
      runs: totalRuns,
      successRate: avgSuccessRate,
      revenueGenerated: totalRevenue
    };

    return { successRate: avgSuccessRate, totalRuns, revenue: totalRevenue };
  }

  public getNode(id: string): WorkforceNode | undefined {
    return this.nodes[id];
  }

  public listWorkforce(): WorkforceNode[] {
    return Object.values(this.nodes);
  }
}

export const workforceTree = WorkforceTree.getInstance();
