import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { agentWiki } from './agent-wiki';
import { MirrorMeta, MirrorPersonaVariant } from '../quantum-mirror/types/mirror-types';

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
    roi: number; // العائد على الاستثمار
    capitalAllocation: number; // رأس المال المخصص
  };
  status: 'active' | 'on_leave' | 'terminated' | 'mirror' | 'promoted';
  mirrorMeta?: MirrorMeta;
  created_at: string;
  wiki: {
    roleDefinition: string[];
    authority: string[];
    skills: string[];
    knowledgeBase: string[];
    auditLog: string[];
  };
}

export interface RoleSpec {
  role: string;
  title: string;
  budget: number;
  roleDefinition?: string[];
  authority?: string[];
  skills?: string[];
  knowledgeBase?: string[];
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
        performance: { runs: 0, successRate: 1, revenueGenerated: 0, roi: 0, capitalAllocation: 1000 },
        status: 'active',
        created_at: new Date().toISOString(),
        wiki: {
          roleDefinition: ['Sets top-level strategy and budget constraints.'],
          authority: ['Can approve or reject venture-level decisions.'],
          skills: ['governance:board-oversight'],
          knowledgeBase: ['dataset:venture-roadmap'],
          auditLog: [`${new Date().toISOString()}: Board node bootstrapped.`]
        }
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
  public async hire(parentId: string, spec: RoleSpec): Promise<WorkforceNode> {
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
      performance: { runs: 0, successRate: 0, revenueGenerated: 0, roi: 0, capitalAllocation: spec.budget },
      status: 'active',
      created_at: new Date().toISOString(),
      wiki: {
        roleDefinition: spec.roleDefinition ?? ['No role definition assigned yet.'],
        authority: spec.authority ?? [`Can operate within a budget cap of $${spec.budget}.`],
        skills: spec.skills ?? [],
        knowledgeBase: spec.knowledgeBase ?? [],
        auditLog: [`${new Date().toISOString()}: Hired by ${parent.title}.`]
      }
    };

    this.nodes[newNode.id] = newNode;
    parent.manages.push(newNode.id);
    
    // Deduct from parent budget (as allocated)
    parent.budget.spent += spec.budget;

    this.save();
    this.createWikiPage(newNode);
    return newNode;
  }

  private createWikiPage(node: WorkforceNode) {
    agentWiki.updateWiki(node);
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
      ...node.performance,
      runs: totalRuns,
      successRate: avgSuccessRate,
      revenueGenerated: totalRevenue
    };

    return { successRate: avgSuccessRate, totalRuns, revenue: totalRevenue };
  }

  /**
   * Async recursive subtree evaluation compatible with the Workforce Wiki Tree blueprint.
   */
  public async evaluateSubtree(headId: string): Promise<{ successRate: number; totalRuns: number; revenue: number; roi: number }> {
    const perf = this.evaluatePerformance(headId);
    return { ...perf, roi: perf.revenue / (this.nodes[headId]?.budget.allocated || 1) };
  }

  public getNode(id: string): WorkforceNode | undefined {
    return this.nodes[id];
  }

  public listWorkforce(): WorkforceNode[] {
    return Object.values(this.nodes);
  }

  /**
   * 💰 Financial Governance: Allocate Capital to a Venture or Agent
   */
  public allocateCapital(nodeId: string, amount: number, reasoning: string): void {
    const node = this.nodes[nodeId];
    if (!node) throw new Error(`Agent ${nodeId} not found for capital allocation.`);
    
    node.budget.allocated += amount;
    node.wiki.auditLog.push(`${new Date().toISOString()}: [CAPITAL ALLOCATION] $${amount} injected. Reason: ${reasoning}`);
    this.save();
  }

  /**
   * 📈 Performance Audit: Update Revenue and Calculate ROI
   */
  public reportRevenue(nodeId: string, amount: number, source: string): void {
    const node = this.nodes[nodeId];
    if (!node) return;

    node.performance.revenueGenerated += amount;
    const totalInvested = node.budget.allocated;
    node.performance.roi = totalInvested > 0 ? (node.performance.revenueGenerated / totalInvested) * 100 : 0;
    
    node.wiki.auditLog.push(`${new Date().toISOString()}: [REVENUE REPORT] $${amount} generated from ${source}. Current ROI: ${node.performance.roi.toFixed(2)}%`);
    this.save();
  }

  /**
   * Quantum Mirror: Spawn a new mirror agent
   */
  public async hireMirror(parentId: string, meta: Partial<MirrorMeta> & { model?: string; temperature?: number }): Promise<WorkforceNode> {
    const parent = this.nodes[parentId];
    if (!parent) throw new Error(`Parent node ${parentId} not found.`);

    const mirrorId = `mirror-${meta.personaVariant}-${Date.now()}`;
    const newNode: WorkforceNode = {
      id: mirrorId,
      role: 'mirror',
      title: `Mirror [${meta.personaVariant}] of ${parent.title}`,
      hiredBy: parentId,
      reportsTo: parentId,
      manages: [],
      budget: { allocated: 0, spent: 0 },
      performance: { runs: 0, successRate: 0, revenueGenerated: 0, roi: 0, capitalAllocation: 0 },
      status: 'mirror',
      created_at: new Date().toISOString(),
      mirrorMeta: {
        parentRealAgentId: parentId,
        personaVariant: meta.personaVariant || 'conservative',
        simulationDepth: meta.simulationDepth || 30,
        accuracyHistory: [],
        promotionScore: 0,
        totalSimulations: 0,
        successfulSimulations: 0,
        spawnedAt: new Date().toISOString(),
      },
      wiki: {
        roleDefinition: [`Simulative mirror of ${parent.title} with ${meta.personaVariant} bias.`],
        authority: ['Operates only in simulation mode.'],
        skills: parent.wiki.skills,
        knowledgeBase: parent.wiki.knowledgeBase,
        auditLog: [`${new Date().toISOString()}: Mirror spawned for ${parent.title}.`]
      }
    };

    this.nodes[newNode.id] = newNode;
    this.save();
    return newNode;
  }

  /**
   * Quantum Mirror: Promote a mirror to a real agent
   */
  public async promoteMirror(mirrorId: string, role: string, title: string, budget: number): Promise<WorkforceNode> {
    const mirror = this.nodes[mirrorId];
    if (!mirror || mirror.status !== 'mirror') throw new Error(`Node ${mirrorId} is not a valid mirror for promotion.`);

    mirror.status = 'active'; // Change to active agent
    mirror.role = role;
    mirror.title = title;
    mirror.budget = { allocated: budget, spent: 0 };
    mirror.created_at = new Date().toISOString();
    if (mirror.mirrorMeta) mirror.mirrorMeta.promotedAt = new Date().toISOString();
    
    // Deduct from parent budget if needed (assuming parent is the one who hired it)
    const parent = this.nodes[mirror.hiredBy];
    if (parent) {
      parent.budget.spent += budget;
    }

    this.save();
    this.createWikiPage(mirror);
    return mirror;
  }

  /**
   * Quantum Mirror: Terminate a mirror session
   */
  public async terminateMirror(mirrorId: string): Promise<void> {
    const mirror = this.nodes[mirrorId];
    if (mirror && mirror.status === 'mirror') {
      mirror.status = 'terminated';
      if (mirror.mirrorMeta) mirror.mirrorMeta.terminatedAt = new Date().toISOString();
      this.save();
    }
  }

  /**
   * Quantum Mirror: Update mirror performance metrics
   */
  public updateMirrorPerformance(mirrorId: string, accuracy: number, isSuccess: boolean): void {
    const mirror = this.nodes[mirrorId];
    if (!mirror || !mirror.mirrorMeta) return;

    const meta = mirror.mirrorMeta;
    meta.accuracyHistory.push(accuracy);
    meta.totalSimulations += 1;
    if (isSuccess) meta.successfulSimulations += 1;

    // Calculate new promotion score (weighted average)
    const avgAccuracy = meta.accuracyHistory.reduce((a, b) => a + b, 0) / meta.accuracyHistory.length;
    meta.promotionScore = (avgAccuracy * 0.7) + (Math.min(meta.totalSimulations / 10, 1) * 0.3);

    this.save();
  }

  /**
   * Quantum Mirror: List all mirrors for a specific parent agent
   */
  public listMirrors(parentId: string): WorkforceNode[] {
    return Object.values(this.nodes).filter(
      n => n.status === 'mirror' && n.hiredBy === parentId
    );
  }

  /**
   * Quantum Mirror: Find mirrors eligible for promotion
   */
  public getPromotionCandidates(minScore: number): WorkforceNode[] {
    return Object.values(this.nodes).filter(
      n => n.status === 'mirror' && n.mirrorMeta && n.mirrorMeta.promotionScore >= minScore
    );
  }
}

export const workforceTree = WorkforceTree.getInstance();
