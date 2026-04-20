import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { MatrixRain } from "@/components/MatrixRain";
import { TerminalIntro } from "@/components/TerminalIntro";

export default function SignInPage() {
  return (
    <main className="relative min-h-svh w-full flex items-center justify-center p-6">
      <MatrixRain />
      
      {/* ── Fixed Header ── */}
      <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-2">
           <svg width="24" height="24" viewBox="0 0 100 100" className="text-cyan animate-pulse">
            <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="8" />
          </svg>
          <span className="font-display text-xs font-bold text-text-muted tracking-[0.2em] uppercase">
            Workspace: Personal | Instance: Primary
          </span>
        </div>
        <div className="text-[10px] font-display text-cyan/40 uppercase tracking-widest">
          Secure Terminal v2.1
        </div>
      </div>

      {/* ── Clerk Sign In ── */}
      <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md">
        <TerminalIntro text="Neural handshake established..." />
        <div className="w-full relative glass-embedded p-8 md:p-12 rounded-lg animate-in fade-in zoom-in duration-500">
          <SignIn 
            appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: '#00f0ff',
              colorBackground: '#0f0f1a',
              colorText: '#e2e8f0',
              colorInputBackground: '#1a1a2e',
              borderRadius: '4px',
              fontFamily: 'Satoshi',
            },
            elements: {
              card: "shadow-none border-none bg-transparent",
              headerTitle: "font-display uppercase tracking-widest text-cyan hover:glitch-text transition-all",
              headerSubtitle: "text-text-muted",
              socialButtonsBlockButton: "glass border-white/5 hover:border-cyan/50 transition-all",
              formButtonPrimary: "neon-button bg-cyan/10 hover:bg-cyan/20 text-white uppercase tracking-widest font-display text-xs",
              footerActionLink: "text-cyan hover:text-white transition-all",
              dividerLine: "bg-white/5",
              dividerText: "text-text-faint font-display text-[10px] uppercase",
            }
          }}
        />
        </div>
      </div>

      {/* ── Subtle Footer ── */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <p className="font-display text-[8px] text-text-faint tracking-[0.5em] uppercase text-center">
          Encrypted Neural Uplink // All Activities Monitored
        </p>
      </footer>
    </main>
  );
}
