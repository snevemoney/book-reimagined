export type BookStatus = "processing" | "parsed" | "ready" | "error";
export type BookGenre = "fiction" | "non-fiction" | "business" | "history" | "science" | "self-help" | "fantasy" | "mystery" | "romance" | "biography";

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: BookGenre;
  tags: string[];
  synopsis: string;
  status: BookStatus;
  poster_url: string;
  backdrop_url: string;
  runtime_minutes: number;
  episode_count: number;
  current_episode?: number;
  progress_percent?: number;
  created_at: string;
  scene_count: number;
}

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  order: number;
  start_time: number;
  end_time: number;
}

export interface Scene {
  id: string;
  chapter_id: string;
  order: number;
  narration_text: string;
  caption_text: string;
  image_url: string;
  audio_url: string;
  duration_seconds: number;
  visual_prompt: string;
}
