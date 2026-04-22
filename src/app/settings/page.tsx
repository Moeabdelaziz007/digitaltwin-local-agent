'use client';

import { useRouter } from 'next/navigation';
import pb from '@/lib/pocketbase-client';
import { LogOut, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  function handleLogout() {
    ((pb as any).authStore as any).clear();
    router.push('/');
  }

  return (
    <main className="flex min-h-svh flex-col bg-bg-app p-8">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-8 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-primitive-text-muted hover:text-primitive-text-primary"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </header>

        <section className="space-y-6">
          <div className="glass-surface p-6 rounded-2xl">
            <h2 className="text-sm font-medium text-primitive-text-muted uppercase tracking-wider mb-4">Account</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{((pb as any).authStore.record as any)?.email}</p>
                <p className="text-xs text-primitive-text-muted">Logged in as digital twin parent</p>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors text-sm font-medium"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>

          <div className="glass-surface p-6 rounded-2xl">
            <h2 className="text-sm font-medium text-primitive-text-muted uppercase tracking-wider mb-4">System</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage Layer</span>
                <span className="text-xs font-mono text-brand-success">PocketBase Local</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Intelligence</span>
                <span className="text-xs font-mono text-brand-primary">Ollama (Gemma)</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
