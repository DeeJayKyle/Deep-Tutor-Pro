import React from 'react';

interface State {
  error: Error | null;
}

/** Keeps one broken screen from blanking the whole app; the rest stays usable and data is untouched. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Screen error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-lg font-semibold">This screen hit a problem</h1>
        <p className="mt-2 text-sm text-muted">Your work is saved and the rest of the app still works. Try again, or open another screen from the menu.</p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-panel2 p-3 text-left text-xs text-muted">{this.state.error.message}</pre>
        <button className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
