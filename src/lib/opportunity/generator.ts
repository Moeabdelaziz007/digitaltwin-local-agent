import { fetchGitHubSignals } from '@/lib/opportunity/connectors/github';
import { fetchMarketSignals } from '@/lib/opportunity/connectors/market-news';
import { fetchUserSignals } from '@/lib/opportunity/connectors/user-signals';
import { rankAndSort } from '@/lib/opportunity/ranker';
import { ConnectorInput, OpportunityCard } from '@/lib/opportunity/types';

function makeId(seed: string, index: number): string {
  return `${seed.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 36)}-${index}`;
}

function buildPoCPlan(problem: string): string[] {
  return [
    `Day 1: validate scope and baseline metrics for ${problem}`,
    'Day 2: ship minimal data ingestion flow',
    'Day 3: build core automation with one success path',
    'Day 4: add monitoring and fallback behavior',
    'Day 5: pilot with one user or one internal workflow',
    'Day 6: analyze value vs effort delta',
    'Day 7: decision review with kill-or-scale recommendation',
  ];
}

/**
 * Orchestrates signal ingestion, candidate generation, and ranking.
 */
export async function generateDailyOpportunities(userId: string, input: ConnectorInput = {}): Promise<OpportunityCard[]> {
  const focus = input.userFocus ?? [];
  
  const [githubSignal, marketSignals, userSignals] = await Promise.all([
    fetchGitHubSignals(input.githubRepo),
    fetchMarketSignals(input.trendKeywords),
    fetchUserSignals(userId, focus),
  ]);

  const candidates: OpportunityCard[] = userSignals.slice(0, 10).map((signal, index) => {
    const relatedMarket = marketSignals[index % Math.max(marketSignals.length, 1)];
    const urgency = Math.min(1, signal.severity * 0.7 + (relatedMarket?.momentum ?? 0.5) * 0.3);
    const effort = Math.max(2, Math.round(8 - githubSignal.prVelocity * 3 - signal.confidence * 2));
    const value = Math.min(10, Math.round((signal.frequency * 1.7 + urgency * 5 + (relatedMarket?.momentum ?? 0.5) * 3) * 10) / 10);

    return {
      id: makeId(signal.painPoint, index + 1),
      problem_statement: signal.painPoint,
      target_user: 'Operators and power users in active workflows',
      urgency_score: urgency,
      implementation_effort: effort,
      estimated_value: value,
      ROI_score: 0,
      moat_hint: 'Workflow + feedback data loop compounding over time',
      first_PoC_steps: [
        'Instrument the current manual baseline',
        'Automate one highest-frequency repetitive step',
        'Add evidence capture and explicit success metrics',
      ],
      why_now: `User pain frequency is rising while market momentum for "${relatedMarket?.keyword ?? 'workflow automation'}" is accelerating.`,
      kill_criteria: [
        'If setup takes >2 days with no user activation',
        'If measured value uplift <20% by day 7',
        'If legal/privacy blocker remains unresolved after mitigation review',
      ],
      dependency_risk: Math.min(1, 0.2 + githubSignal.issueVelocity * 0.4),
      legal_privacy_uncertainty: 0.2,
      data_confidence: Math.min(1, (signal.confidence + (relatedMarket?.confidence ?? 0.5)) / 2),
      evidence: [
        {
          source: 'user',
          summary: `Pain point repeated ${signal.frequency}x in recent conversations`,
          traceUrl: signal.sourceRef,
          confidence: signal.confidence,
        },
        {
          source: 'market',
          summary: relatedMarket?.headline ?? 'Workflow category trend holding positive momentum',
          traceUrl: relatedMarket?.sourceUrl,
          confidence: relatedMarket?.confidence ?? 0.5,
        },
        {
          source: 'github',
          summary: `${githubSignal.openIssues} open issues and ${githubSignal.openPRs} open PRs indicate delivery pressure`,
          traceUrl: githubSignal.sourceUrl,
          confidence: githubSignal.confidence,
        },
      ],
      fit_score: focus.length === 0 || focus.some((tag) => signal.painPoint.includes(tag.toLowerCase())) ? 1 : 0,
    };
  });

  const filtered = candidates.filter((card) => card.fit_score >= 1 || focus.length === 0);
  const ranked = rankAndSort(filtered);

  return ranked.map((opportunity) => ({
    ...opportunity,
    first_PoC_steps: buildPoCPlan(opportunity.problem_statement),
  }));
}
