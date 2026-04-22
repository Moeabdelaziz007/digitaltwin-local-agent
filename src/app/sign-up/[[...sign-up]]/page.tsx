import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { TerminalIntro } from "@/components/TerminalIntro";
import { VentureLabTicker } from "@/components/VentureLabTicker";
import { LoginBackground } from "@/components/LoginBackground";

export default function SignUpPage() {
  return (
    <LoginBackground>
      <div className="flex flex-col items-center gap-8 w-full max-w-md relative">
        <div className="flex flex-col items-center gap-2 text-center">
          <TerminalIntro text="Initializing neural imprint..." />
        </div>

        <div className="w-full relative group">
          {/* Enhanced card glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan/30 to-blue-600/30 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
          
          <div className="relative glass-surface p-1 md:p-2 rounded-xl border-white/5 shadow-2xl backdrop-blur-3xl">
            <SignUp 
              appearance={{
                baseTheme: dark,
                variables: {
                  colorPrimary: '#00f0ff',
                  colorBackground: 'transparent',
                  colorText: '#F4F7FB',
                  colorInputBackground: 'rgba(15, 17, 21, 0.6)',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-sans)',
                },
                elements: {
                  card: "shadow-none border-none bg-transparent m-0",
                  headerTitle: "font-display uppercase tracking-[0.25em] text-cyan text-lg mb-1",
                  headerSubtitle: "text-text-muted text-[10px] tracking-widest uppercase opacity-70",
                  socialButtonsBlockButton: "glass-surface border-white/5 hover:border-cyan/30 transition-all duration-300 bg-white/5",
                  formButtonPrimary: "bg-cyan/10 hover:bg-cyan/20 text-cyan border border-cyan/30 uppercase tracking-[0.2em] font-display text-[9px] h-11 transition-all duration-300",
                  footerActionLink: "text-cyan hover:text-white transition-all text-xs",
                  dividerLine: "bg-white/5",
                  dividerText: "text-text-muted font-display text-[8px] uppercase tracking-[0.3em]",
                  formFieldLabel: "text-[9px] uppercase tracking-[0.2em] text-text-muted font-display font-bold",
                  formFieldInput: "glass-surface border-white/10 focus:border-cyan/50 transition-all duration-300 text-sm h-11",
                }
              }}
            />
          </div>
        </div>
      </div>
      <VentureLabTicker />
    </LoginBackground>
  );
}
