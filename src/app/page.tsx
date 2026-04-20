'use client';

import { Show, SignInButton, SignUpButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  // Auto-redirect signed-in users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-4 step-enter">
          <div className="twin-avatar twin-avatar--idle mx-auto w-20 h-20">
            <span className="text-3xl select-none">🪞</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">MyDigitalTwin</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
            A quiet companion that listens, remembers,
            <br />
            and grows with you.
          </p>
        </div>

        {/* Auth Buttons — Powered by Clerk */}
        <Show when="signed-out">
          <div className="space-y-3 step-enter">
            <SignInButton mode="modal">
              <button
                className="w-full py-3.5 rounded-xl text-sm font-medium tap-target"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  transition: 'opacity 0.2s, transform 0.1s',
                }}
              >
                Sign In
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button
                className="w-full py-3.5 rounded-xl text-sm font-medium tap-target"
                style={{
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  transition: 'opacity 0.2s, transform 0.1s',
                }}
              >
                Create Account
              </button>
            </SignUpButton>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="text-center step-enter">
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Redirecting to your Twin...
            </p>
            <div className="animate-pulse w-8 h-8 mx-auto rounded-full" style={{ background: 'hsl(var(--primary))' }} />
          </div>
        </Show>
      </div>
    </main>
  );
}
