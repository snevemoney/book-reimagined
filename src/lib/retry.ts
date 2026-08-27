function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  opts?: { retries?: number; baseMs?: number; retryOn?: (error: unknown) => boolean },
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 400;
  const retryOn = opts?.retryOn;
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOn ? retryOn(error) : true;
      if (!shouldRetry || attempt === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number((error as { status?: number }).status) : NaN;
  if (Number.isFinite(status)) return isRetryableStatus(status);
  const message = "message" in error ? String((error as { message?: string }).message) : "";
  return /network|timeout|fetch|503|502|429/i.test(message);
}
