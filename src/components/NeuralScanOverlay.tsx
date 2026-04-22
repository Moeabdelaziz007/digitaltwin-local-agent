'use client';

export function NeuralScanOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Horizontal scanning line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-scan-y opacity-40" />
      
      {/* Vertical scanning line */}
      <div className="absolute top-0 left-0 h-full w-[1px] bg-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.5)] animate-scan-x opacity-40" />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
}
