import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { strings } from "../strings";
import { App } from "./App";

describe("App shell", () => {
  it("RQ-WEB-001 shows a banner with the product name and a main region", () => {
    // Given the shell / When rendered
    render(<App />);
    // Then the banner holds the product name and the main region exists
    const banner = screen.getByRole("banner");
    expect(banner).toHaveTextContent(strings.app.name);
    expect(screen.getByRole("heading", { level: 1, name: strings.app.name })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent(strings.home.intro);
  });

  it("RQ-WEB-002 shows no error message when nothing fails", () => {
    // Given the shell renders without error / When loaded / Then no alert is shown
    render(<App />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
