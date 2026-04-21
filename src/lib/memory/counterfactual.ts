import { scoreCausalEdge } from '@/lib/causal/scoring';
import { getServerPB } from '@/lib/pb-server';

interface SimInput {
  userId: string;
  change: string;
  goal?: string;
  constraints?: string[];
  maxHops?: number;
}

interface Outcome {
  node: string;
  confidenceRange: [number, number];
  path: string[];
  risk?: string;
}

interface SimResult {
  summary: string;
  topOutcomes: Outcome[];
  risks: string[];
  recommendedAction: string;
  confidence: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function isConstraintHit(label: string, constraints: string[]): boolean {
  return constraints.some((constraint) => label.toLowerCase().includes(constraint.toLowerCase()));
}

export async function simulateWhatIf(input: SimInput): Promise<SimResult | null> {
  const pb = getServerPB();
  const maxHops = Math.max(1, Math.min(4, input.maxHops ?? 3));
  const constraints = input.constraints ?? [];

  const nodes = await pb.collection('causal_nodes').getFullList({
    filter: `user_id = "${input.userId}"`,
  });

  if (nodes.length === 0) return null;

  const matchingStart = nodes.find((n) =>
    String(n.label || '').toLowerCase().includes(input.change.toLowerCase())
  );
  if (!matchingStart?.id) return null;

  const edges = await pb.collection('causal_edges').getFullList({
    filter: `user_id = "${input.userId}"`,
  });

  const nodeById = new Map<string, string>(nodes.map((n) => [String(n.id), String(n.label || 'unknown')]));
  const outgoing = new Map<string, Array<Record<string, unknown>>>();

  for (const edge of edges) {
    const source = String(edge.source || '');
    if (!outgoing.has(source)) outgoing.set(source, []);
    outgoing.get(source)?.push(edge as Record<string, unknown>);
  }

  const queue: Array<{ nodeId: string; score: number; path: string[]; hop: number }> = [{
    nodeId: String(matchingStart.id),
    score: 0.85,
    path: [String(matchingStart.label)],
    hop: 0,
  }];

  const outcomes: Outcome[] = [];
  const risks: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current.hop >= maxHops) {
      outcomes.push({
        node: current.path[current.path.length - 1],
        confidenceRange: [clamp01(current.score * 0.8), clamp01(current.score)],
        path: current.path,
      });
      continue;
    }

    const nextEdges = outgoing.get(current.nodeId) ?? [];
    if (nextEdges.length === 0) {
      outcomes.push({
        node: current.path[current.path.length - 1],
        confidenceRange: [clamp01(current.score * 0.75), clamp01(current.score)],
        path: current.path,
      });
      continue;
    }

    for (const edge of nextEdges) {
      const relation = String(edge.relation_type || 'causes');
      const targetId = String(edge.target || '');
      const targetLabel = nodeById.get(targetId) || 'unknown outcome';
      const scored = scoreCausalEdge({
        baseWeight: Number(edge.weight ?? 0.5),
        evidenceCount: Number(edge.evidence_count ?? 1),
        contradictionCount: Number(edge.contradiction_count ?? 0),
        lastObservedAt: String(edge.last_observed_at || ''),
      });

      let relationFactor = 1;
      if (relation === 'amplifies') relationFactor = 1.08;
      if (relation === 'reduces' || relation === 'blocks') relationFactor = 0.72;

      const nextScore = clamp01(current.score * scored.finalScore * relationFactor);
      const nextPath = [...current.path, targetLabel];

      if (isConstraintHit(targetLabel, constraints)) {
        risks.push(`قد يتعارض المسار مع القيد: ${targetLabel}`);
      }

      queue.push({
        nodeId: targetId,
        score: nextScore,
        path: nextPath,
        hop: current.hop + 1,
      });
    }
  }

  const topOutcomes = outcomes
    .sort((a, b) => b.confidenceRange[1] - a.confidenceRange[1])
    .slice(0, 3);

  const confidence = topOutcomes.length === 0
    ? 0.3
    : clamp01(topOutcomes.reduce((sum, item) => sum + item.confidenceRange[1], 0) / topOutcomes.length);

  const summaryPath = topOutcomes[0]?.path.join(' -> ') || input.change;
  const summary = `إذا غيّرت "${input.change}" فالأرجح (مع عدم يقين) أن المسار سيكون: ${summaryPath}.`;
  const recommendedAction = confidence >= 0.6
    ? 'جرّب خطوة صغيرة قابلة للقياس ثم راقب النتائج قبل التوسّع.'
    : 'المعطيات غير كافية؛ اجمع أدلة إضافية قبل اتخاذ قرار نهائي.';

  const simulationPayload = {
    scenario: input.change,
    assumptions: {
      goal: input.goal || null,
      constraints,
      maxHops,
    },
    predicted_outcomes: topOutcomes,
    confidence,
  };

  await pb.collection('sim_runs').create(simulationPayload);

  return {
    summary,
    topOutcomes,
    risks,
    recommendedAction,
    confidence,
  };
}

export function shouldRunCounterfactual(message: string): boolean {
  return /(should i|what if|if i|recommend|decision|plan|best option|اختار|قرار|ماذا لو|هل)/i.test(message);
}

export function buildCausalSnippet(result: SimResult): string {
  const best = result.topOutcomes[0];
  const chain = best?.path.join(' -> ') || 'مسار سببي غير مكتمل';
  const uncertainty = `نطاق الثقة التقريبي ${Math.round((best?.confidenceRange[0] ?? 0.2) * 100)}%-${Math.round((best?.confidenceRange[1] ?? 0.5) * 100)}%`;
  return `تحليل سببي موجز: إذا فعلت هذا التغيير فغالباً سيؤدي إلى ${best?.node ?? 'نتيجة محتملة'} بسبب ${chain}. ${uncertainty}.`;
}

export function runRecommendationGuardian(text: string): string {
  if (/definitely|certainly|guaranteed|مؤكد|حتماً/i.test(text)) {
    return `${text}\n\nتنبيه: هذه توقعات احتمالية وليست حقائق يقينية.`;
  }
  return text;
}
