"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase-client";
import type { ResearchGem, SkillDraft, ImprovementProposal } from "@/types/twin";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Zap, TrendingUp, CheckCircle2, Clock } from "lucide-react";

interface WorkReportProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function WorkReport({ isOpen, onClose, userId }: WorkReportProps) {
  const [activeTab, setActiveTab] = useState<"research" | "skills" | "improvements">("research");
  const [research, setResearch] = useState<ResearchGem[]>([]);
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [proposals, setProposals] = useState<ImprovementProposal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      void loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [researchRes, skillsRes, proposalsRes] = await Promise.all([
        pb.collection("research_gems").getList<ResearchGem>(1, 10, { filter: `user_id="${userId}"`, sort: "-created" }),
        pb.collection("skill_drafts").getList<SkillDraft>(1, 10, { filter: `user_id="${userId}"`, sort: "-created" }),
        pb.collection("improvement_proposals").getList<ImprovementProposal>(1, 10, { sort: "-created" })
      ]);

      setResearch(researchRes.items);
      setSkills(skillsRes.items);
      setProposals(proposalsRes.items);
    } catch (err) {
      console.error("Failed to load work report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGem = async (gemId: string) => {
    try {
      await pb.collection("research_gems").update(gemId, { status: "saved" });
      setResearch(prev => prev.map(g => g.id === gemId ? { ...g, status: "saved" } : g));
    } catch (err) {
      console.error("Failed to save gem:", err);
    }
  };

  const handleDeploySkill = async (draftId: string) => {
    try {
      const resp = await fetch("/api/skills/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId })
      });
      if (resp.ok) {
        setSkills(prev => prev.map(s => s.id === draftId ? { ...s, status: "deployed" } : s));
      }
    } catch (err) {
      console.error("Failed to deploy skill:", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-void/80 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-bg-surface border-l border-white/10 z-[101] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-xl uppercase tracking-widest text-cyan">Cognitive Work Report</h2>
                <p className="text-[10px] font-display text-text-muted uppercase tracking-[0.2em] mt-1">Mega Loop Intelligence Feed</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-white/5">
              {[
                { id: "research", label: "Research", icon: Search },
                { id: "skills", label: "Skills", icon: Zap },
                { id: "improvements", label: "Metrics", icon: TrendingUp }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "research" | "skills" | "improvements")}
                  className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all relative ${
                    activeTab === tab.id ? "text-cyan" : "text-text-muted hover:text-white"
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="text-[10px] font-display uppercase tracking-widest">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan shadow-[0_0_10px_var(--cyan)]" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {activeTab === "research" && (
                    <div className="space-y-4">
                      {research.length === 0 ? (
                        <p className="text-center text-text-faint text-xs py-12">No research gems discovered yet.</p>
                      ) : (
                        research.map(item => (
                          <div key={item.id} className="glass p-4 rounded-lg border-l-2 border-l-amber/50">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-display text-amber uppercase tracking-widest">{item.category}</span>
                              <span className="text-[10px] font-display text-text-muted">Score: {(item.relevance_score * 100).toFixed(0)}%</span>
                            </div>
                            <h4 className="text-sm font-bold mb-2">{item.title}</h4>
                            <p className="text-xs text-text-muted leading-relaxed mb-3">{item.content}</p>
                            <div className="bg-bg-void/50 p-2 rounded text-[10px] italic text-cyan/70 border border-white/5 font-display mb-3">
                              Gem Log: {item.implementation_notes}
                            </div>
                            {item.status === "new" && (
                              <button 
                                onClick={() => handleSaveGem(item.id)}
                                className="w-full py-1.5 text-[9px] font-display uppercase tracking-widest bg-amber/10 border border-amber/30 text-amber hover:bg-amber hover:text-bg-void transition-all rounded"
                              >
                                Save to Neural Memory
                              </button>
                            )}
                            {item.status === "saved" && (
                              <div className="text-center text-[9px] text-amber/60 font-display uppercase flex items-center justify-center gap-1">
                                <CheckCircle2 size={10} /> Active in Memory
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "skills" && (
                    <div className="space-y-4">
                      {skills.length === 0 ? (
                        <p className="text-center text-text-faint text-xs py-12">No emerging skills in draft.</p>
                      ) : (
                        skills.map(item => (
                          <div key={item.id} className="glass p-4 rounded-lg border-l-2 border-l-cyan/50">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-display text-cyan uppercase tracking-widest">Skill Evolution</span>
                              <span className={`text-[9px] px-1.5 rounded uppercase font-bold ${
                                item.status === 'pending' ? 'bg-amber/20 text-amber' : 'bg-cyan/20 text-cyan'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold mb-2">{item.proposed_name}</h4>
                            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-3 flex items-center gap-1">
                              <Clock size={10} /> Origin Trace: {item.trace_id.slice(0, 8)}...
                            </p>
                            {item.status === 'pending' ? (
                              <button 
                                onClick={() => handleDeploySkill(item.id)}
                                className="w-full py-2 text-[10px] font-display uppercase tracking-widest bg-cyan/10 border border-cyan/30 text-cyan hover:bg-cyan hover:text-bg-void transition-all rounded"
                              >
                                Review & Deploy
                              </button>
                            ) : (
                              <div className="text-center text-[9px] text-cyan/60 font-display uppercase flex items-center justify-center gap-1">
                                <CheckCircle2 size={10} /> Deployed to FS
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "improvements" && (
                    <div className="space-y-4">
                      {proposals.length === 0 ? (
                        <p className="text-center text-text-faint text-xs py-12">No metric adjustments pending.</p>
                      ) : (
                        proposals.map(item => (
                          <div key={item.id} className="glass p-4 rounded-lg border-l-2 border-l-violet/50">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-display text-violet uppercase tracking-widest">{item.subsystem}</span>
                              <CheckCircle2 size={12} className="text-violet/50" />
                            </div>
                            <h4 className="text-sm font-bold mb-1">{item.proposal_type}</h4>
                            <p className="text-xs text-text-muted italic mb-3">&quot;{item.hypothesis}&quot;</p>
                            <div className="text-[9px] font-display text-text-faint uppercase">
                              Target Key: {item.proposed_change?.key} → {item.proposed_change?.value as string}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-bg-surface/80">
              <div className="flex items-center justify-between text-[10px] font-display uppercase tracking-[0.2em] text-text-faint">
                <span>Core Engine v2.1</span>
                <span>Self-Refinement: Active</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
