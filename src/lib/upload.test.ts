import { describe, expect, it } from "vitest";
import { isAcceptedBookFile, sanitizeFileName } from "./upload";

describe("sanitizeFileName", () => {
  it("strips path segments and unsafe characters", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName("My Book?.txt")).toBe("My Book_.txt");
  });
});

describe("isAcceptedBookFile", () => {
  it("accepts a small pdf", () => {
    expect(isAcceptedBookFile({ name: "book.pdf", type: "application/pdf", size: 1024 })).toEqual({
      ok: true,
    });
  });

  it("rejects unsupported extensions and oversized files", () => {
    expect(isAcceptedBookFile({ name: "book.exe", type: "application/octet-stream", size: 10 }).ok).toBe(false);
    expect(isAcceptedBookFile({ name: "book.pdf", type: "application/pdf", size: 26 * 1024 * 1024 }).ok).toBe(false);
  });
});
