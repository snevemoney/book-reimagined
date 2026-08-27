export const ACCEPTED_EXT = [".pdf", ".epub", ".docx", ".txt"] as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ACCEPTED_MIME = new Set([
  "application/pdf",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/octet-stream",
  "",
]);

export function fileExtension(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return `.${parts.pop()?.toLowerCase() ?? ""}`;
}

export function isAcceptedBookFile(file: Pick<File, "name" | "type" | "size">): {
  ok: boolean;
  reason?: string;
} {
  const ext = fileExtension(file.name);
  if (!ACCEPTED_EXT.includes(ext as (typeof ACCEPTED_EXT)[number])) {
    return { ok: false, reason: "Please upload PDF, EPUB, DOCX, or TXT files." };
  }
  if (!ACCEPTED_MIME.has(file.type)) {
    return { ok: false, reason: "File type is not allowed." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "File must be 25 MB or smaller." };
  }
  return { ok: true };
}

export function sanitizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
  return base || "book";
}
