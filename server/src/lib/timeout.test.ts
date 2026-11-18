import { describe, expect, it } from "bun:test";
import { TimeoutError, withTimeout } from "./timeout.js";

describe("withTimeout", () => {
  it("RQ-OPS-002 resolves with the value when the promise wins", async () => {
    await expect(withTimeout(Promise.resolve(5), 1_000)).resolves.toBe(5);
  });

  it("RQ-OPS-002 rejects with TimeoutError when time runs out", async () => {
    await expect(withTimeout(new Promise(() => undefined), 5)).rejects.toBeInstanceOf(TimeoutError);
  });
});
