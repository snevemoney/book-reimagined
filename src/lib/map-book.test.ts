import { describe, expect, it } from "vitest";
import { mapBookRow, toIsoDate } from "./map-book";

describe("toIsoDate", () => {
  it("returns a full ISO timestamp for date-only strings", () => {
    expect(toIsoDate("2026-02-01")).toBe("2026-02-01T00:00:00.000Z");
  });

  it("falls back for empty or invalid values", () => {
    expect(toIsoDate("")).toBe("1970-01-01T00:00:00.000Z");
    expect(toIsoDate("not-a-date")).toBe("1970-01-01T00:00:00.000Z");
  });
});

describe("mapBookRow", () => {
  it("normalizes genre, status, and created_at", () => {
    const book = mapBookRow({
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test",
      author: "Author",
      genre: "unknown-genre",
      status: "parsed",
      created_at: "2026-02-01",
    });
    expect(book.genre).toBe("fiction");
    expect(book.status).toBe("parsed");
    expect(book.created_at).toBe("2026-02-01T00:00:00.000Z");
  });
});
