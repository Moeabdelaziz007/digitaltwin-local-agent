'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import pb from '@/lib/pocketbase-client';
import { Check, X, ShieldAlert, History, Diff, Play } from 'lucide-react';
import { runEvaluationSuite } from '@/lib/eval/runner';
import { motion, AnimatePresence } from 'framer-motion';

interface Proposal {
  id: string;
  subsystem: string;
  proposal_type: string;
  hypothesis: string;
  proposed_change: any;
  status: string;
  created: string;
}

export default function ImprovementsPage() {
  const { user } = useUser();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isRunningEval, setIsRunningEval] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  async function fetchProposals() {
    try {
      const records = await pb.collection('improvement_proposals').getFullList({
        filter: 'status = "pending_approval"',
        sort: '-created'
      });
      setProposals(records as any);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    }
  }

  async function handleAction(action: 'approve' | 'reject') {
    if (!selectedProposal || !reason.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Update Proposal status
      await pb.collection('improvement_proposals').update(selectedProposal.id, {
        status: action === 'approve' ? 'approved' : 'rejected'
      });

      // 2. Create Audit Log
      await pb.collection('audit_log').create({
        proposal_id: selectedProposal.id,
        actor: user?.primaryEmailAddress?.emailAddress || 'unknown_admin',
        action,
        reason: reason.trim(),
        before_config: {}, // In production, current config would be fetched here
        after_config: action === 'approve' ? selectedProposal.proposed_change : {}
      });

      // 3. If approved, apply change to app_config (Phase 1 simplicity)
      if (action === 'approve') {
        const change = selectedProposal.proposed_change;
        await pb.collection('app_config').create({
          key: change.key,
          value: change.value,
          category: selectedProposal.subsystem,
          is_active: true,
          version: Date.now()
        });
      }

      setReason('');
      setSelectedProposal(null);
      fetchProposals();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRunEval() {
    setIsRunningEval(true);
    try {
      const summary = await runEvaluationSuite();
      setEvalResult(summary);
    } catch (err) {
      console.error('Eval failed:', err);
    } finally {
      setIsRunningEval(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-void text-text-primary p-8">
      <header className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tighter flex items-center gap-3 italic">
            <ShieldAlert className="text-cyan animate-pulse" />
            Improvement Hub
          </h1>
          <p className="text-text-muted text-sm uppercase tracking-widest mt-2">Self-Adaptive Governance Layer</p>
        </div>
        <div className="flex gap-4">
           {evalResult && (
             <div className="glass border border-cyan/20 px-4 py-2 rounded-lg flex items-center gap-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-cyan">Latest Accuracy: {evalResult.accuracy}%</span>
             </div>
           )}
           <button 
             onClick={handleRunEval}
             disabled={isRunningEval}
             className="glass border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2 hover:border-cyan/50 transition-all text-xs uppercase font-bold"
           >
             <Play size={14} className={isRunningEval ? 'animate-spin' : ''} />
             {isRunningEval ? 'Running Evals...' : 'Run Eval Suite'}
           </button>
           <div className="glass border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
             <History size={14} className="text-violet" />
             <span className="text-[10px] font-bold uppercase tracking-widest">Audit Trails Active</span>
           </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* List of Proposals */}
        <section className="space-y-4">
          <h2 className="text-xs font-display uppercase tracking-widest text-text-muted mb-6">Pending Proposals</h2>
          <AnimatePresence>
            {proposals.length === 0 ? (
              <div className="p-12 glass border border-dashed border-white/10 rounded-2xl text-center opacity-40">
                <p className="text-xs uppercase tracking-widest">No pending improvements detected.</p>
              </div>
            ) : (
              proposals.map(p => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedProposal(p)}
                  className={`p-6 glass border rounded-2xl cursor-pointer transition-all ${
                    selectedProposal?.id === p.id ? 'border-cyan bg-cyan/5' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-1 bg-violet/20 text-violet text-[9px] font-bold uppercase rounded">
                      {p.subsystem}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(p.created).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mb-2">{p.hypothesis}</h3>
                  <div className="flex items-center gap-2 text-cyan">
                    <Diff size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">View Changeset</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </section>

        {/* Detailed Review View */}
        <section className="relative">
          {selectedProposal ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass border border-white/10 rounded-2xl p-8 sticky top-8"
            >
              <h2 className="text-xl font-bold mb-6">Review Proposal</h2>
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-2">Hypothesis</label>
                  <p className="text-sm border-l-2 border-cyan pl-4 italic">{selectedProposal.hypothesis}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-2">Technical Change</label>
                  <pre className="bg-black/30 p-4 rounded-xl text-[11px] overflow-x-auto border border-white/5 font-mono text-cyan/80">
                    {JSON.stringify(selectedProposal.proposed_change, null, 2)}
                  </pre>
                </div>

                <div className="h-[1px] bg-white/5" />

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-2 italic">
                    Reason for Decision (MANDATORY)
                  </label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide justification for this approval or rejection based on feedback analysis..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-cyan/50 h-32"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  disabled={!reason.trim() || isSubmitting}
                  onClick={() => handleAction('approve')}
                  className="flex-1 bg-cyan text-bg-void py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-30 disabled:grayscale"
                >
                  <Check size={16} /> Approve & Deploy
                </button>
                <button 
                  disabled={!reason.trim() || isSubmitting}
                  onClick={() => handleAction('reject')}
                  className="flex-1 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all py-3 rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-30"
                >
                  <X size={16} /> Reject
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
               <ShieldAlert size={64} className="mb-4" />
               <p className="font-display text-sm uppercase tracking-[0.4em]">Selection required for governance review.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
