import pb from '@/lib/pocketbase-client';

export type SkillStatus = 'experimental' | 'verified' | 'deprecated';

export interface AgentSkill {
  id: string;           // 'web-scraper@2.1.0'
  name: string;
  version: string;      // semver
  author: string;       // 'community' | 'system' | 'user'
  description: string;
  successRate: number;  // 0-1
  totalEarnings: number;
  lastUsed: string;
  status: SkillStatus;
  tags: string[];
  requiredEnvVars: string[];
  cost: 'free' | 'paid';
  stats: {
    totalRuns: number;
    avgDurationMs: number;
  };
  metadata?: Record<string, any>;
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, AgentSkill> = new Map();

  private constructor() {
    this.registerLocal({
      id: 'arbitrage-logic-v1',
      name: 'Deterministic Arbitrage',
      version: '1.0.0',
      author: 'system',
      description: 'Calculates cross-chain spreads with high precision.',
      successRate: 0.95,
      totalEarnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'verified',
      tags: ['crypto', 'arbitrage', 'finance'],
      requiredEnvVars: [],
      cost: 'free',
      stats: {
        totalRuns: 0,
        avgDurationMs: 0
      }
    });

    this.registerLocal({
      id: 'freelance-applicant@1.0.0',
      name: 'Freelance Applicant',
      version: '1.0.0',
      author: 'system',
      description: 'Automates job applications on Upwork/Contra using digital twin voice.',
      successRate: 0,
      totalEarnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'experimental',
      tags: ['revenue', 'freelance', 'automation'],
      requiredEnvVars: ['OLLAMA_BASE_URL'],
      cost: 'free',
      stats: {
        totalRuns: 0,
        avgDurationMs: 0
      }
    });

    this.registerLocal({
      id: 'content-arbitrage@1.0.0',
      name: 'Content Arbitrage Machine',
      version: '1.0.0',
      author: 'system',
      description: 'Monitors trending topics and auto-publishes monetized technical content.',
      successRate: 0,
      totalEarnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'experimental',
      tags: ['revenue', 'content', 'affiliate', 'seo'],
      requiredEnvVars: ['MEDIUM_API_KEY', 'HASHNODE_TOKEN', 'DEVTO_API_KEY'],
      cost: 'free',
      stats: {
        totalRuns: 0,
        avgDurationMs: 0
      }
    });

    this.registerLocal({
      id: 'micro-saas-builder@1.0.0',
      name: 'Micro-SaaS Builder',
      version: '1.0.0',
      author: 'system',
      description: 'Automatically validates and builds minimal SaaS tools from high-ROI opportunities.',
      successRate: 0,
      totalEarnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'experimental',
      tags: ['revenue', 'saas', 'automation', 'launch'],
      requiredEnvVars: ['VERCEL_TOKEN', 'GUMROAD_TOKEN'],
      cost: 'free',
      stats: {
        totalRuns: 0,
        avgDurationMs: 0
      }
    });

    this.registerLocal({
      id: 'pr-submitter@1.0.0',
      name: 'Bounty PR Submitter',
      version: '1.0.0',
      author: 'system',
      description: 'Solves GitHub issues and submits pull requests autonomously for bounties.',
      successRate: 0,
      totalEarnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'experimental',
      tags: ['revenue', 'github', 'coding', 'bounty'],
      requiredEnvVars: ['GITHUB_TOKEN', 'OLLAMA_BASE_URL'],
      cost: 'free',
      stats: {
        totalRuns: 0,
        avgDurationMs: 0
      }
    });

    this.registerLocal({
      id: 'product-factory@1.0.0',
      name: 'Digital Product Factory',
      version: '1.0.0',
      author: 'system',
      description: 'Audits memory for reusable solutions and packages them as sellable digital products.',
      successRate: 0,
      totalEarnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'experimental',
      tags: ['revenue', 'gumroad', 'knowledge-monetization'],
      requiredEnvVars: ['GUMROAD_TOKEN', 'OLLAMA_BASE_URL'],
      cost: 'free',
      stats: {
        totalRuns: 0,
        avgDurationMs: 0
      }
    });
  }

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  public registerLocal(skill: AgentSkill): void {
    this.skills.set(skill.id, skill);
  }

  /**
   * The "Secret Weapon": Exponential Moving Average Evaluation Loop
   */
  public async evaluateSkill(skillId: string, outcome: 'success' | 'fail', value: number = 0) {
    let skill = this.skills.get(skillId);
    
    // If not in local memory, try to fetch from PB (or initialize)
    if (!skill) {
      try {
        const record = await pb.collection('agent_skills').getOne(skillId);
        skill = record as unknown as AgentSkill;
      } catch {
        return; // Skill unknown
      }
    }

    // Exponential moving average: 0.9 * past + 0.1 * new outcome
    const outcomeScore = outcome === 'success' ? 1 : 0;
    skill.successRate = (0.9 * skill.successRate) + (0.1 * outcomeScore);
    
    if (value > 0) {
      skill.totalEarnings += value;
    }
    
    skill.lastUsed = new Date().toISOString();
    this.registerLocal(skill);

    // Persist the "Intelligence"
    try {
      await pb.collection('agent_skills').update(skillId, skill);
      console.log(`[SkillRegistry] Skill ${skillId} evolved: Success Rate -> ${(skill.successRate * 100).toFixed(1)}% | Total Earnings: $${skill.totalEarnings}`);
    } catch (e) {
      // Fallback: Create if not exists in PB
      try {
        await pb.collection('agent_skills').create(skill);
      } catch (err) {
        console.warn(`[SkillRegistry] Persistence failed for ${skillId}, kept in memory.`);
      }
    }
  }

  public listSkills(): AgentSkill[] {
    return Array.from(this.skills.values());
  }
}

export const skillRegistry = SkillRegistry.getInstance();
