import { callOllama } from '../ollama-client';
import { skillRegistry } from './registry';
import { ExecutionResult } from './types';
import { TicketEngine } from '../holding/ticket-engine';
import { ventureRegistry } from '../holding/venture-registry';
import { Venture, Role, Ticket } from '../holding/types';
import { tieredMemory } from '../memory/tiered-store';

/**
 * MAS-ZERO Mercor Bridge Skill
 * 
 * Architecture:
 * Layer 1: Opportunity Detection (ما الذي يحتاج خبيراً؟)
 * Layer 2: Expert Matching (من هو الخبير المناسب؟)
 * Layer 3: Verification Orchestration (كيف نُدير العملية؟)
 * Layer 4: Affiliate Revenue Tracking (كيف نربح؟)
 * Layer 5: Knowledge Harvesting (ماذا نتعلم؟)
 */

interface MercorExpert {
  id: string;
  name: string;
  expertise: string[];
  hourlyRate: number;
  rating: number;
  availability: 'available' | 'busy' | 'offline';
  affiliateCode: string;
}

interface VerificationTask {
  id: string;
  type: 'pricing_validation' | 'code_review' | 'strategy_review' | 'legal_check';
  context: string;
  maxBudget: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class MercorBridgeSkill {
  static id = 'mercor-bridge';

  async execute(venture: Venture, role: Role): Promise<ExecutionResult> {
    console.log('[MercorBridge] Analyzing venture needs for Mercor Vouching & Referrals...');

    // 1. اكتشاف ما يحتاج خبيراً (Vouching Logic)
    const needs = await this.detectVerificationNeeds(venture);
    
    if (needs.length === 0) {
      return { success: true, output: 'no_vouching_opportunities_found' };
    }

    // 2. إنشاء تذاكر "التزكية" (Vouching Tickets)
    // Note: Since no API exists, we provide direct dashboard links
    const tickets = await this.createVouchingTickets(venture, role, needs);

    return {
      success: true,
      output: `Identified ${needs.length} vouching/referral opportunities on Mercor. Dashboard links generated.`,
      ticketId: tickets[0]?.id
    };
  }

  private async detectVerificationNeeds(venture: Venture): Promise<VerificationTask[]> {
    const needs: VerificationTask[] = [];
    const ventures = ventureRegistry.listVentures();
    
    for (const v of ventures) {
      // Logic: If venture is in high-stakes phase, it needs a Vouched Expert
      if (v.metadata?.stage === 'scaling' || v.budget.monthly_limit_usd > 1000) {
        needs.push({
          id: `vouch-${v.id}`,
          type: 'strategy_review',
          context: `High-stakes scaling for ${v.name} requires an expert vouch.`,
          maxBudget: 200,
          urgency: 'high'
        });
      }
    }

    return needs;
  }

  private async createVouchingTickets(
    venture: Venture,
    role: Role,
    needs: VerificationTask[]
  ): Promise<Ticket[]> {
    const tickets: Ticket[] = [];

    for (const need of needs) {
      const ticket = await TicketEngine.createTicket(venture, role, {
        title: `[MERCOR] Action Required: Expert Vouching`,
        context: `
## Opportunity Detected
The venture **${venture.name}** has reached a critical stage that requires human expertise verification.

## Instructions
1. Log in to [work.mercor.com](https://work.mercor.com)
2. Go to the **Referrals** tab.
3. Identify a candidate matching: **${need.context}**.
4. Use the **"Vouch"** feature to provide a professional endorsement.
5. Record the Referral Link here once generated.

## Strategic Value
Vouching increases candidate hireability and secures our **20% lifetime affiliate revenue**.
        `,
        priority: 'high',
        metadata: {
          type: 'mercor_vouch',
          dashboard_url: 'https://work.mercor.com',
          action: 'manual_vouching_required'
        }
      });

      tickets.push(ticket);
    }

    return tickets;
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 4: Affiliate Revenue Tracking
  // ═══════════════════════════════════════════════════════
  
  private async trackAffiliateOpportunities(experts: MercorExpert[]): Promise<void> {
    for (const expert of experts) {
      const currentRevenue = this.affiliateTracker.get(expert.id) || 0;
      const estimatedLifetimeValue = expert.hourlyRate * 100 * 0.2; 
      
      this.affiliateTracker.set(expert.id, currentRevenue + estimatedLifetimeValue);
      console.log(`[MercorBridge] Affiliate opportunity: ${expert.name} | LTV: $${estimatedLifetimeValue}`);
    }
  }

  // ═══════════════════════════════════════════════════════
  // LAYER 5: Knowledge Harvesting
  // ═══════════════════════════════════════════════════════
  
  async harvestKnowledge(verificationResult: {
    expertId: string;
    feedback: string;
    ventureId: string;
  }): Promise<void> {
    const lessons = await this.extractLessons(verificationResult.feedback);
    
    await tieredMemory.add(
      `[Expert Lesson] From Mercor Expert ${verificationResult.expertId}: ${lessons.join(' ')}`,
      'observation'
    );

    console.log(`[MercorBridge] Knowledge harvested from expert: ${verificationResult.expertId}`);
  }

  private async extractLessons(feedback: string): Promise<string[]> {
    const prompt = `Extract 3 actionable lessons from this expert feedback. Format as bullet points.\n\nFeedback: ${feedback}`;
    const raw = await callOllama(prompt, [
      { role: 'system', content: 'You are a Knowledge Distillation Engine.' }
    ]);
    return raw.split('\n').filter(line => line.trim().startsWith('-'));
  }
}

// Register in Registry
skillRegistry.registerSkill({
  id: MercorBridgeSkill.id,
  metadata: {
    name: 'Mercor Human Bridge',
    version: '1.0.0',
    description: 'Bridges AI operations with human experts via Mercor for critical verification.',
    category: 'governance',
    revenue_impact: 'high',
    permissions: ['network', 'governance'],
    required_tools: ['ollama', 'mercor-api']
  },
  instructions: 'Identify tasks needing expert oversight and match with Mercor experts.'
});
