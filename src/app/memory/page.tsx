'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import pb from '@/lib/pocketbase-client';
import type { Fact, UserProfile } from '@/types/twin';

export default function MemoryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const userId = pb.authStore.record?.id;
      if (!userId) { router.push('/'); return; }

      try {
        const p = await pb.collection('user_profiles').getFirstListItem<UserProfile>(`user_id = "${userId}"`);
        setProfile(p);
        
        // Paginating facts to avoid massive payload on slow connections
        const factsResult = await pb.collection('facts').getList<Fact>(1, 30, {
          filter: `user_id = "${userId}"`,
          sort: '-confidence,-reinforced_count',
        });
        setFacts(factsResult.items);
      } catch (err) {
        console.error('Failed to load memory:', err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  async function deleteFact(factId: string) {
    try {
      await pb.collection('facts').delete(factId);
      setFacts(prev => prev.filter(f => f.id !== factId));
    } catch (err) {
      console.error('Failed to delete fact:', err);
    }
  }

  if (loading) {
    return (
      <main className="flex h-svh items-center justify-center p-5">
        <div className="twin-avatar twin-avatar--idle w-12 h-12">🪞</div>
      </main>
    );
  }

  const snapshot = typeof profile?.profile_snapshot === 'string' 
    ? JSON.parse(profile.profile_snapshot) 
    : profile?.profile_snapshot;

  return (
    <main className="min-h-svh bg-background pb-10">
      <header className="px-5 py-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10" style={{ borderColor: 'hsl(var(--border))' }}>
        <button onClick={() => router.push('/dashboard')} className="text-sm font-medium tap-target flex items-center gap-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <span>←</span> Back to Chat
        </button>
      </header>

      <div className="p-5 max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Twin Memory</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>Everything your twin has learned.</p>
        </div>

        {/* ── Stats Card ── */}
        <div className="fact-card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Sync Progress</h3>
            <span className="font-bold text-lg" style={{ color: 'hsl(var(--primary))' }}>{profile?.learning_progress || 3}%</span>
          </div>
          <div className="learning-bar h-2 mb-3">
            <div className="learning-bar__fill" style={{ width: `${profile?.learning_progress || 3}%` }} />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <span>{profile?.total_conversations || 0} Chats</span>
            <span>{facts.length} Facts</span>
          </div>
        </div>

        {/* ── Active Adaptations ── */}
        {snapshot?.adaptations && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Current Adaptations</h3>
            <div className="grid grid-cols-2 gap-3">
              {['tone', 'detail_level', 'humor'].map((key) => (
                <div key={key} className="fact-card py-3">
                  <p className="text-[10px] uppercase font-semibold mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{key.replace('_', ' ')}</p>
                  <p className="text-sm font-medium capitalize">{snapshot.adaptations[key]}</p>
                </div>
              ))}
            </div>
            {snapshot.adaptations.last_shift_note && (
               <p className="text-xs italic px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                 &quot;{snapshot.adaptations.last_shift_note}&quot;
               </p>
            )}
          </div>
        )}

        {/* ── Durable Facts ── */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Stored Facts ({facts.length})</h3>
          {facts.length === 0 ? (
            <div className="fact-card flex flex-col items-center py-8 opacity-60">
               <span className="text-2xl mb-2">🗂️</span>
               <p className="text-xs text-center font-medium">No facts learned yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {facts.map(fact => (
                <div key={fact.id} className="fact-card relative pr-8">
                  <span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider mb-2 inline-block" 
                        style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>
                    {fact.category}
                  </span>
                  <p className="text-sm leading-relaxed font-medium">{fact.fact}</p>
                  
                  <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <span>Conf: {Math.round(fact.confidence * 100)}%</span>
                    {fact.reinforced_count > 0 && (
                      <span className="flex items-center gap-1"><span>🔁</span> x{fact.reinforced_count}</span>
                    )}
                  </div>
                  
                  <button onClick={() => deleteFact(fact.id)} className="absolute top-3 right-3 tap-target text-lg text-red-400 hover:text-red-600 transition-colors">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
