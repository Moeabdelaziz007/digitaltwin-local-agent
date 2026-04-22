/**
 * src/lib/consensus/dag-executor.ts
 * محرك تنفيذ سير العمل المعتمد على الرسم البياني الموجه غير الدوري (DAG)
 */

export interface WorkflowNode {
  id: string;
  agent: string;
  task: string;
  dependencies: string[];
  parallel: boolean;
  result?: any;
}

export class DAGExecutor {
  private nodes: Map<string, WorkflowNode>;

  constructor(nodes: WorkflowNode[]) {
    this.nodes = new Map(nodes.map(node => [node.id, node]));
  }

  /**
   * تنفيذ سير العمل بالكامل بأقصى توازي ممكن
   */
  public async execute(runAgentFn: (node: WorkflowNode) => Promise<any>): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const completed = new Set<string>();

    while (completed.size < this.nodes.size) {
      // 1. تحديد العقد الجاهزة للتنفيذ (التي اكتملت اعتماداتها)
      const readyNodes = Array.from(this.nodes.values()).filter(node => {
        return !completed.has(node.id) && node.dependencies.every(depId => completed.has(depId));
      });

      if (readyNodes.length === 0 && completed.size < this.nodes.size) {
        throw new Error('[DAG] Circular dependency detected or stuck execution!');
      }

      // 2. تشغيل العقد الجاهزة بالتوازي
      await Promise.all(readyNodes.map(async (node) => {
        console.log(`[DAG] Executing Node: ${node.id} (Agent: ${node.agent})...`);
        const result = await runAgentFn(node);
        results.set(node.id, result);
        completed.add(node.id);
      }));
    }

    return results;
  }
}
