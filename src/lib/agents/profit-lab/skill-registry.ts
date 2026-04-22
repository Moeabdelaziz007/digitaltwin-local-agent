import pb from '@/lib/pocketbase-client';

export type SkillStatus = 'experimental' | 'verified' | 'deprecated';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  successRate: number; // 0-1
  earnings: number;    // Track real $ value generated
  lastUsed: string;    // ISO Date
  status: SkillStatus;
  metadata?: Record<string, any>;
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, AgentSkill> = new Map();

  private constructor() {
    this.registerLocal({
      id: 'arbitrage-logic-v1',
      name: 'Deterministic Arbitrage',
      description: 'Calculates cross-chain spreads with high precision.',
      successRate: 0.95,
      earnings: 0,
      lastUsed: new Date().toISOString(),
      status: 'verified'
    });
  }

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  private registerLocal(skill: AgentSkill): void {
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

    // Weighted update: 90% past, 10% new outcome
    const outcomeScore = outcome === 'success' ? 1 : 0;
    skill.successRate = (0.9 * skill.successRate) + (0.1 * outcomeScore);
    
    if (value > 0) {
      skill.earnings += value;
    }
    
    skill.lastUsed = new Date().toISOString();
    this.registerLocal(skill);

    // Persist the "Intelligence"
    try {
      await pb.collection('agent_skills').update(skillId, skill);
      console.log(`[SkillRegistry] Skill ${skillId} evolved: Success Rate -> ${(skill.successRate * 100).toFixed(1)}%`);
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
