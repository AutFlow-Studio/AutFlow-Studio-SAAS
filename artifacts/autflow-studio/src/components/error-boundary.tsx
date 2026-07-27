import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** When true, renders a compact inline error card instead of full-screen */
  inline?: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Inline / section-level error card
      if (this.props.inline) {
        return (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-start gap-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">This section failed to load.</p>
              {this.state.error && (
                <p className="text-xs text-destructive/70 mt-0.5 truncate">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              className="shrink-0 text-destructive/70 hover:text-destructive transition-colors"
              onClick={() => this.setState({ hasError: false, error: null })}
              title="Retry"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        );
      }

      // Full-page error
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-destructive"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Please refresh the page or contact support if the
                problem persists.
              </p>
            </div>
            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 border border-border/50">
                <summary className="cursor-pointer font-medium mb-1">Error details</summary>
                <pre className="whitespace-pre-wrap break-all">{this.state.error.message}</pre>
              </details>
            )}
            <button
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * A lightweight section-level error boundary.
 * Wraps any subtree; on error renders a compact inline error card
 * that can be retried without reloading the page.
 */
export function SectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary inline>{children}</ErrorBoundary>;
}
