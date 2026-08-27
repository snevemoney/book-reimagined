function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { retries?: number; baseMs?: number },
): Promise<Response> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 400;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || !isRetryableStatus(res.status)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, baseMs * 2 ** attempt));
    }
  }

  throw lastError ?? new Error("Request failed");
}
