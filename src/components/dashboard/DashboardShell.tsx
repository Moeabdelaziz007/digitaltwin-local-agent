import { PropsWithChildren } from "react";
import MiniTwinController, { MiniTwinState } from "./MiniTwin/MiniTwinController";
import type { Proposal } from "./MiniTwin/ProposalPanel";

interface DashboardShellProps extends PropsWithChildren {
  miniTwinState: MiniTwinState;
  activeProposal: Proposal | null;
  proposalOpen: boolean;
  onToggleMiniTwin: () => void;
  onApproveProposal: (id: string) => void;
  onRejectProposal: (id: string) => void;
}

export default function DashboardShell({ 
  children,
  miniTwinState,
  activeProposal,
  proposalOpen,
  onToggleMiniTwin,
  onApproveProposal,
  onRejectProposal
}: DashboardShellProps) {
  return (
    <div className="flex flex-col lg:flex-row min-h-svh min-h-dvh bg-bg-app text-[var(--foreground)] overflow-hidden font-sans relative">
      <MiniTwinController
        state={miniTwinState}
        activeProposal={activeProposal}
        panelOpen={proposalOpen}
        onTogglePanel={onToggleMiniTwin}
        onApprove={onApproveProposal}
        onReject={onRejectProposal}
      >
        {children}
      </MiniTwinController>
    </div>
  );
}
