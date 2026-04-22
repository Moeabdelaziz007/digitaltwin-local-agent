import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { NeuralSynapse } from "@/components/NeuralSynapse";
import { NeuralScanOverlay } from "@/components/NeuralScanOverlay";
import { TerminalIntro } from "@/components/TerminalIntro";

export default function SignUpPage() {
  return (
    <main className="relative min-h-svh w-full flex items-center justify-center p-6 overflow-hidden bg-[#0A0A0F]">
      {/* ── Premium Background & FX ── */}
      <NeuralSynapse count={120} />
      <NeuralScanOverlay />
      
      {/* ── Fixed Header ── */}
      <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg width="24" height="24" viewBox="0 0 100 100" className="text-cyan animate-pulse">
              <path d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" fill="none" stroke="currentColor" strokeWidth="8" />
            </svg>
            <div className="absolute inset-0 bg-cyan/20 blur-md animate-pulse" />
          </div>
          <span className="font-display text-[10px] font-bold text-text-muted tracking-[0.25em] uppercase">
            Sovereign Lab // Instance: 0xALPHA
          </span>
        </div>
        <div className="text-[9px] font-display text-cyan/40 uppercase tracking-[0.3em] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-ping" />
          Neural Link: Secure
        </div>
      </div>

      {/* ── Clerk Sign Up ── */}
      <div className="flex flex-col items-center gap-8 z-10 w-full max-w-md relative">
        <div className="flex flex-col items-center gap-2 text-center">
          <TerminalIntro text="Initializing neural imprint..." />
        </div>

        <div className="w-full relative group">
          {/* Subtle card glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan/20 to-blue-500/20 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          
          <div className="relative glass-surface p-1 md:p-2 rounded-xl border-white/5 shadow-2xl backdrop-blur-2xl">
            <SignUp 
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: '#00f0ff',
                  colorBackground: 'transparent',
                  colorText: '#F4F7FB',
                  colorInputBackground: 'rgba(15, 17, 21, 0.6)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                },
                elements: {
                  card: "shadow-none border-none bg-transparent m-0",
                  headerTitle: "font-display uppercase tracking-[0.2em] text-cyan text-lg mb-1",
                  headerSubtitle: "text-text-muted text-xs tracking-wide",
                  socialButtonsBlockButton: "glass-surface border-white/5 hover:border-cyan/30 transition-twin bg-white/5",
                  formButtonPrimary: "bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 uppercase tracking-widest font-display text-[10px] h-10 transition-twin",
                  footerActionLink: "text-cyan hover:text-white transition-all text-xs",
                  dividerLine: "bg-white/5",
                  dividerText: "text-text-muted font-display text-[9px] uppercase tracking-widest",
                  formFieldLabel: "text-[10px] uppercase tracking-widest text-text-muted font-display",
                  formFieldInput: "glass-surface border-white/10 focus:border-cyan/50 transition-twin text-sm",
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Subtle Footer ── */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full">
        <p className="font-display text-[7px] text-text-muted/40 tracking-[0.6em] uppercase text-center">
          [ AUTHENTICATION GATEWAY // ENCRYPTED NEURAL UPLINK ]
        </p>
      </footer>
    </main>
  );
}
