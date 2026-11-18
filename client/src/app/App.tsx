import type { ReactElement } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary/ErrorBoundary";
import { strings } from "../strings";

/** The client shell: banner with the product name and the main region where screens render (RQ-WEB-001). */
export function App(): ReactElement {
  return (
    <>
      <header className="app-header">
        <h1 className="app-title">{strings.app.name}</h1>
      </header>
      <main className="app-main">
        <ErrorBoundary>
          <p className="app-intro">{strings.home.intro}</p>
        </ErrorBoundary>
      </main>
    </>
  );
}
