import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export default class RouteChunkErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Route chunk load failed", error, errorInfo);
  }

  private handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
      return;
    }

    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-xl font-semibold text-foreground">Couldn&apos;t load this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {this.state.message || "A network error interrupted route loading."}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }
}
