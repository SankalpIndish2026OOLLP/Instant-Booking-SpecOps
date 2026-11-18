import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { strings } from "./strings";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

document.title = strings.app.name;
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
