'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import pb from '@/lib/pocketbase-client';

// ============================================================
// Hybrid Onboarding UX — Profile Preview Builder
// ============================================================

const STYLE_CHIPS = [
  { id: 'concise', label: 'Short & direct' },
  { id: 'detailed', label: 'Deep & explanatory' },
  { id: 'witty', label: 'Humorous' },
  { id: 'serious', label: 'Professional' },
  { id: 'mentor', label: 'Guiding' },
  { id: 'friend', label: 'Casual friend' }
];

export default function OnboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");

  // Step 2 & 3
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [extraPrefs, setExtraPrefs] = useState("");
  const [previewDraft, setPreviewDraft] = useState("");

  // Step 1: Core Stage
  async function nextStep() {
    if (displayName.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (goal.trim().length < 3) {
      setError("Please describe the goal in at least 3 chars.");
      return;
    }
    setError("");
    setStep(2);
  }

  function toggleStyle(id: string) {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // Simulated API call that generates the context drafts
  async function generatePreview() {
    setError("");
    setLoading(true);
    // In a real app this hits a Next.js /api/onboard/draft endpoint.
    // Here we simulate the logic to build the JSON locally to avoid excessive API latency.
    setTimeout(() => {
      setPreviewDraft(
        `"Hey ${displayName}, I'll be acting as your ${
          goal || "twin"
        }, keeping things ${selectedStyles.join(", ")}!"`
      );
      setLoading(false);
      setStep(3);
    }, 800);
  }

  async function handleComplete() {
    setError("");
    setLoading(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");

      // The Context Files Builder
      const mainMd = `
# MyDigitalTwin Core
User: ${displayName}
Primary Role: ${goal}
This AI embodies the persona rules absolutely and never deviates.
      `.trim();

      const soulMd = `
# Identity & Tone
Styles chosen: ${selectedStyles.join(", ")}
Custom Prefs: ${extraPrefs}
      `.trim();

      const guardsMd = `
# Boundaries
- Never use robotic corporate speak
- Avoid overly long markdown tables unless asked
      `.trim();

      // Update the stub profile created by the webhook (upsert pattern)
      try {
        const existing = await pb.collection("user_profiles").getFirstListItem(`user_id = "${userId}"`);
        await pb.collection("user_profiles").update(existing.id, {
          display_name: displayName.trim(),
          personality_desc: goal.trim(),
          tone: selectedStyles[0] || "friendly",
          context_main: mainMd,
          context_soul: soulMd,
          context_guards: guardsMd,
          learning_progress: 3,
          onboarding_complete: true,
        });
      } catch {
        // No stub found — create fresh
        await pb.collection("user_profiles").create({
          user_id: userId,
          display_name: displayName.trim(),
          personality_desc: goal.trim(),
          tone: selectedStyles[0] || "friendly",
          context_main: mainMd,
          context_soul: soulMd,
          context_guards: guardsMd,
          profile_snapshot: JSON.stringify({ adaptations: {}, top_facts: [] }),
          learning_progress: 3,
          total_conversations: 0,
          onboarding_complete: true,
        });
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || "Failed to create profile. Ensure all fields are valid."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-8">
      <div className="w-full max-w-lg space-y-8">
        
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors duration-500"
              style={{
                background:
                  s <= step ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl animate-in fade-in zoom-in duration-300">
            {error}
          </div>
        )}

        {/* ── STAGE 1: Core ── */}
        {step === 1 && (
          <div className="space-y-6 step-enter">
            <h2 className="text-xl font-semibold">Who are we building?</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What should I call you?
                </label>
                <input
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setError("");
                  }}
                  className="w-full px-4 py-3 rounded-xl text-sm tap-target"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  placeholder="Your Name (min 2 chars)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  What's the goal for this twin?
                </label>
                <input
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    setError("");
                  }}
                  className="w-full px-4 py-3 rounded-xl text-sm tap-target"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  placeholder="e.g. A coding mentor, a listening ear (min 3 chars)"
                />
              </div>
            </div>

            <button
              onClick={nextStep}
              className="w-full py-3.5 rounded-xl text-sm font-medium tap-target bg-primary text-primary-foreground"
              style={{ background: "hsl(var(--primary))", color: "#fff" }}
            >
              Next
            </button>
          </div>
        )}

        {/* ── STAGE 2: Chips ── */}
        {step === 2 && (
          <div className="space-y-6 step-enter">
            <h2 className="text-xl font-semibold">How should it talk?</h2>
            <div className="flex flex-wrap gap-2">
              {STYLE_CHIPS.map(chip => (
                <button key={chip.id} onClick={() => toggleStyle(chip.id)}
                  className={`tag-chip tap-target ${selectedStyles.includes(chip.id) ? 'tag-chip--active' : 'tag-chip--inactive'}`}>
                  {chip.label}
                </button>
              ))}
            </div>

            <textarea value={extraPrefs} onChange={e => setExtraPrefs(e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                  style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  placeholder="Any specific dislikes? (e.g. 'I hate emojis')" />

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl text-sm font-medium tap-target border border-border">Back</button>
              <button onClick={generatePreview} disabled={loading}
                className="flex-[2] py-3.5 rounded-xl text-sm font-medium tap-target bg-primary text-primary-foreground"
                style={{ background: 'hsl(var(--primary))', color: '#fff' }}>
                {loading ? 'Drafting...' : 'Preview Twin'}
              </button>
            </div>
          </div>
        )}

        {/* ── STAGE 3: Preview ── */}
        {step === 3 && (
          <div className="space-y-6 step-enter">
            <h2 className="text-xl font-semibold">Your Twin is ready</h2>
            <p className="text-sm text-muted-foreground">This is how it thinks and sounds right now. We'll adapt it over time as you chat.</p>
            
            <div className="fact-card relative">
               <div className="flex items-center gap-2 mb-3">
                 <div className="twin-avatar w-6 h-6"><span className="text-xs">🪞</span></div>
                 <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Preview</span>
               </div>
               <p className="text-sm font-medium">{previewDraft}</p>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 border border-border rounded-xl text-sm font-medium tap-target">Tune</button>
              <button onClick={handleComplete} disabled={loading}
                className="flex-[2] py-3.5 rounded-xl text-sm font-medium tap-target"
                style={{ background: 'hsl(var(--primary))', color: '#fff' }}>
                {loading ? 'Saving...' : 'Deploy Twin'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
