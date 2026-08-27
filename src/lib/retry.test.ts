import { describe, expect, it, vi } from "vitest";
import { isTransientError, withRetry } from "./retry";

describe("withRetry", () => {
  it("returns the first successful result", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(op, { retries: 3, baseMs: 1 })).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures then succeeds", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { status: 503 }))
      .mockResolvedValue("ok");
    await expect(withRetry(op, { retries: 3, baseMs: 1, retryOn: isTransientError })).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const err = Object.assign(new Error("bad request"), { status: 400 });
    const op = vi.fn().mockRejectedValue(err);
    await expect(withRetry(op, { retries: 3, baseMs: 1, retryOn: isTransientError })).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });
});
