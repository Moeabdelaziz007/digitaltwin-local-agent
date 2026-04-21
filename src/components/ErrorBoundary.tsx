'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-svh flex items-center justify-center bg-bg-void text-cyan font-display">
          <div className="text-center p-12 glass border border-amber/50">
            <h1 className="text-4xl font-bold glitch-text mb-4">CRITICAL SYSTEM FAILURE</h1>
            <p className="text-text-muted mb-8">Data stream corrupted or neural link severed.</p>
            <button 
              onClick={() => window.location.reload()}
              className="neon-border px-8 py-3 bg-cyan/10 hover:bg-cyan/20 transition-all uppercase tracking-widest text-sm"
            >
              Reinitialize Link
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
