import { Component, type ReactNode } from "react";
import { strings } from "../../strings";

/** Props of {@link ErrorBoundary}. */
export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Called by the reload button; defaults to reloading the page. */
  onReload?: () => void;
}

interface ErrorBoundaryState {
  failed: boolean;
}

const reloadPage = (): void => {
  window.location.reload();
};

/**
 * Replaces a part of the UI that threw while rendering with a message and a reload button,
 * instead of a blank page (RQ-WEB-002).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  /** Switches to the fallback after a render error. */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="error-fallback">
        <h2 className="error-title">{strings.error.title}</h2>
        <p className="error-body">{strings.error.body}</p>
        <button type="button" className="error-reload" onClick={this.props.onReload ?? reloadPage}>
          {strings.error.reload}
        </button>
      </div>
    );
  }
}
