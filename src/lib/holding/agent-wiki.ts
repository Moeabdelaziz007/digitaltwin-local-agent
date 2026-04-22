import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { WorkforceNode, workforceTree } from './workforce-tree';

/**
 * src/lib/holding/agent-wiki.ts
 * Generates and updates Agent Wiki pages in Markdown.
 */

export class AgentWiki {
  private wikiDir = join(process.cwd(), 'docs', 'workforce');

  constructor() {
    if (!existsSync(this.wikiDir)) {
      mkdirSync(this.wikiDir, { recursive: true });
    }
  }

  /**
   * Update or create a Wiki page for an agent
   */
  public updateWiki(node: WorkforceNode) {
    const parent = workforceTree.getNode(node.hiredBy);
    const content = `
# Agent Wiki: ${node.title} (${node.id})

## 📋 Role Definition | تعريف الدور
- **Title:** ${node.title}
- **Role Type:** ${node.role}
- **Status:** ${node.status}
- **Hired By:** ${parent ? parent.title : 'System'}
- **Reports To:** ${parent ? parent.title : 'System'}
- **Manages:** ${node.manages.length > 0 ? node.manages.join(', ') : 'None (Individual Contributor)'}

## 🎯 Authority | الصلاحيات
- **Budget Allocated:** $${node.budget.allocated}
- **Budget Spent:** $${node.budget.spent}
- **Remaining:** $${node.budget.allocated - node.budget.spent}

## 📊 Performance Metrics | مقاييس الأداء
- **Total Runs:** ${node.performance.runs}
- **Success Rate:** ${Math.round(node.performance.successRate * 100)}%
- **Revenue Generated:** $${node.performance.revenueGenerated} (simulated)
- **Efficiency Score:** ${this.calculateEfficiency(node)}

## 🛡️ Boundaries | الخطوط الحمراء
- Cannot exceed $${node.budget.allocated} monthly budget.
- Must escalate any single transaction over $${node.budget.allocated * 0.1}.
- Required approval for sub-agent termination.

## 📝 Audit Log | سجل التدقيق
- ${node.created_at}: Hired into MAS-ZERO workforce.
- ${new Date().toISOString()}: Wiki page updated with latest performance data.

---
*Last Updated: ${new Date().toLocaleString()}*
*MAS-ZERO v1.2.0 (Workforce Engine)*
    `.trim();

    writeFileSync(join(this.wikiDir, `${node.id}.md`), content);
    console.log(`[Wiki] Updated page for ${node.title}`);
  }

  private calculateEfficiency(node: WorkforceNode): string {
    if (node.performance.runs === 0) return 'N/A';
    const score = (node.performance.successRate * 10) + (node.performance.revenueGenerated / 100);
    return score.toFixed(1);
  }
}

export const agentWiki = new AgentWiki();
