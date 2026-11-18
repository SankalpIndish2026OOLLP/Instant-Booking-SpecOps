import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Throwing } from "../../../test/factories/throwing";
import { strings } from "../../strings";
import { ErrorBoundary } from "./ErrorBoundary";

afterEach(() => {
  mock.restore();
});

function renderFailing(onReload?: () => void) {
  // React logs caught render errors; keep test output readable.
  spyOn(console, "error").mockImplementation(() => undefined);
  return render(
    <ErrorBoundary onReload={onReload}>
      <Throwing />
    </ErrorBoundary>,
  );
}

describe("ErrorBoundary", () => {
  it("RQ-WEB-002 renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("RQ-WEB-002 replaces a throwing component with the message and a reload button", async () => {
    // Given a child that throws / When rendered
    const onReload = mock(() => undefined);
    renderFailing(onReload);
    // Then the message and button are shown, and the button reloads
    expect(screen.getByRole("alert")).toHaveTextContent(strings.error.title);
    await userEvent.click(screen.getByRole("button", { name: strings.error.reload }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("RQ-WEB-004 the reload button is reachable with Tab and activated with Enter", async () => {
    // Given the fallback is shown
    const onReload = mock(() => undefined);
    renderFailing(onReload);
    const user = userEvent.setup();
    // When the user presses Tab, then Enter
    await user.tab();
    const button = screen.getByRole("button", { name: strings.error.reload });
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    // Then the page reloads
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("RQ-WEB-002 reloads the page by default", async () => {
    // Given no reload handler / When the button is clicked / Then window.location.reload is called
    const reload = spyOn(window.location, "reload").mockImplementation(() => undefined);
    renderFailing();
    await userEvent.click(screen.getByRole("button", { name: strings.error.reload }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
