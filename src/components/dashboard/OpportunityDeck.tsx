'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import type { OpportunityCard } from '@/lib/opportunity/types';

interface OpportunityDeckProps {
  repo?: string;
  focus?: string[];
  trends?: string[];
}

type Decision = 'approve' | 'park' | 'reject';

export default function OpportunityDeck({ repo, focus = [], trends = [] }: OpportunityDeckProps) {
  const [cards, setCards] = useState<OpportunityCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (repo) params.set('repo', repo);
      if (focus.length) params.set('focus', focus.join(','));
      if (trends.length) params.set('trends', trends.join(','));

      const response = await fetch(`/api/opportunities?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as { cards: OpportunityCard[] };
        setCards(data.cards ?? []);
      }
      setLoading(false);
    };

    void load();
  }, [repo, focus, trends]);

  const handleDecision = async (opportunity: OpportunityCard, action: Decision) => {
    const response = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, opportunity }),
    });

    if (response.ok) {
      setCards((prev) => prev.filter((item) => item.id !== opportunity.id));
    }
  };

  const quadrantLabel = useMemo(() => {
    return (card: OpportunityCard) => {
      const highImpact = card.estimated_value >= 6;
      const lowEffort = card.implementation_effort <= 4;
      if (highImpact && lowEffort) return 'Quick Win';
      if (highImpact) return 'Strategic Bet';
      if (lowEffort) return 'Fill-in Task';
      return 'Park';
    };
  }, []);

  return (
    <section className="glass border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.22em] text-cyan font-display">Opportunity Deck</h3>
        <span className="text-[10px] text-text-muted uppercase tracking-widest">Max 3/day</span>
      </div>

      {loading && <p className="text-xs text-text-muted">Scanning user signals + market + repo...</p>}

      {!loading && cards.length === 0 && (
        <p className="text-xs text-text-muted">No in-scope opportunities today. Noise guard active.</p>
      )}

      {!loading && cards.map((card) => (
        <article key={card.id} className="rounded-lg border border-white/10 bg-bg-void/40 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-cyan/80">{quadrantLabel(card)} · ROI {card.ROI_score.toFixed(1)}</p>
          <h4 className="text-sm font-semibold">{card.problem_statement}</h4>
          <p className="text-xs text-text-muted">Why now: {card.why_now}</p>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded border border-white/10 p-2">
              <p className="uppercase tracking-wider text-text-faint">Impact</p>
              <p>{card.estimated_value.toFixed(1)} / 10</p>
            </div>
            <div className="rounded border border-white/10 p-2">
              <p className="uppercase tracking-wider text-text-faint">Effort</p>
              <p>{card.implementation_effort.toFixed(1)} / 10</p>
            </div>
          </div>

          <ul className="text-[11px] text-text-muted list-disc pl-4">
            {card.first_PoC_steps.slice(0, 2).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>

          <div className="text-[10px] text-text-faint">
            Evidence: {card.evidence.map((item) => item.source).join(', ')}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => void handleDecision(card, 'approve')} className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 py-1.5 text-[10px] uppercase tracking-widest text-emerald-300">
              <CheckCircle2 size={12} /> Approve
            </button>
            <button onClick={() => void handleDecision(card, 'park')} className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 py-1.5 text-[10px] uppercase tracking-widest text-amber-200">
              <PauseCircle size={12} /> Park
            </button>
            <button onClick={() => void handleDecision(card, 'reject')} className="flex-1 inline-flex items-center justify-center gap-1 rounded border border-rose-400/40 bg-rose-500/10 py-1.5 text-[10px] uppercase tracking-widest text-rose-200">
              <XCircle size={12} /> Reject
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
