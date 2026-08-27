import type { Book, BookGenre, BookStatus } from "@/types/book";

const GENRES: BookGenre[] = [
  "fiction",
  "non-fiction",
  "business",
  "history",
  "science",
  "self-help",
  "fantasy",
  "mystery",
  "romance",
  "biography",
];

const STATUSES: BookStatus[] = ["processing", "parsed", "ready", "error"];
const FALLBACK_ISO = "1970-01-01T00:00:00.000Z";

export const LIBRARY_PAGE_SIZE = 60;

export function toIsoDate(value: string | null | undefined): string {
  if (!value) return FALLBACK_ISO;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return FALLBACK_ISO;
  return parsed.toISOString();
}

export function normalizeGenre(value: string | null | undefined): BookGenre {
  return GENRES.includes(value as BookGenre) ? (value as BookGenre) : "fiction";
}

export function normalizeStatus(value: string | null | undefined): BookStatus {
  return STATUSES.includes(value as BookStatus) ? (value as BookStatus) : "processing";
}

export type BookRow = {
  id: string;
  title: string;
  author: string;
  genre: string;
  tags?: string[] | null;
  synopsis?: string | null;
  status: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  runtime_minutes?: number | null;
  episode_count?: number | null;
  scene_count?: number | null;
  created_at?: string | null;
};

export function mapBookRow(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: normalizeGenre(row.genre),
    tags: row.tags || [],
    synopsis: row.synopsis || "",
    status: normalizeStatus(row.status),
    poster_url: row.poster_url || "",
    backdrop_url: row.backdrop_url || "",
    runtime_minutes: row.runtime_minutes || 0,
    episode_count: row.episode_count || 0,
    scene_count: row.scene_count || 0,
    created_at: toIsoDate(row.created_at),
  };
}
