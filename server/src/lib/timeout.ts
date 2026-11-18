/** Rejection reason when {@link withTimeout} runs out of time. */
export class TimeoutError extends Error {
  /** Creates the error for the given limit. */
  constructor(readonly timeoutMs: number) {
    super(`Timed out after ${timeoutMs} ms`);
    this.name = "TimeoutError";
  }
}

/** Resolves like `promise`, or rejects with {@link TimeoutError} after `timeoutMs`. */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
