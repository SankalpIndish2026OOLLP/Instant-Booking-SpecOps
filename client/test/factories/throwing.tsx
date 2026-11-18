import type { ReactElement } from "react";

/** A component that always throws while rendering, to exercise error boundaries. */
export function Throwing(): ReactElement {
  throw new Error("render failure");
}
