

# Bookflix — Netflix for Books

## Overview
A web app that converts uploaded books into watchable "book movies" with narration, visuals, and captions — all served in a Netflix-style library. No user settings; an AI "Director" handles all creative decisions automatically.

## Pages & Experience

### 1. Home / Library (Netflix UI)
- Hero banner featuring a random completed book with auto-playing trailer (muted)
- Rows: "Continue Watching", "Recently Added", "Fiction", "Non-Fiction", "Business", etc.
- Each title shows: AI-generated poster, title, runtime, genre tags
- Hover/tap shows a 30-second trailer preview
- Search bar to find titles
- "Upload a Book" CTA prominently placed

### 2. Title Detail Page
- Large backdrop image + synopsis (AI-generated)
- Play button, episode list (if book was split)
- Chapter timeline with markers
- Runtime, genre tags, "More Like This" recommendations
- Progress indicator if partially watched

### 3. Upload Page
- Drag-and-drop file upload (PDF, EPUB, DOCX, TXT)
- Mandatory "I have rights to upload this" checkbox
- After upload: redirects to library where the title appears with a "Processing" state
- Progress updates: "Analyzing book…", "Generating scenes…", "Creating narration…"

### 4. Player (Full-Screen Viewer)
- Custom web-based scene player (not a video file)
- Displays AI-generated images with Ken Burns pan/zoom animation
- Synchronized narration audio (ElevenLabs TTS)
- Always-on captions/subtitles
- Chapter title cards between sections
- Play/pause, chapter skip, progress scrubber
- Hook intro (first 30s), midpoint recap, end synthesis

### 5. Auth
- Browse library freely without account
- Sign up required to upload books and save watch progress
- Email-based authentication

## The "Director" — Automatic Creative Engine

When a book is uploaded, the AI Director runs a fully automatic pipeline:

1. **Parse** — Extract text, detect chapters via TOC or heading heuristics
2. **Analyze** — Classify genre, tone, complexity; generate synopsis and tags
3. **Plan** — Create scene timeline: narration text, visual prompts, durations, chapter markers
4. **Compute runtime** — 12–90 minutes based on book length/density; split into episodes if needed
5. **Generate assets** — Per scene: TTS audio (ElevenLabs), AI image (Gemini), caption text
6. **Generate poster + trailer** — Poster image + 30-60s preview from hook scenes
7. **Publish** — Mark as ready in library

All creative decisions (narration tone, visual style, pacing) are made by the Director based on genre:
- Fiction → cinematic illustrated frames, storyteller narration
- Non-fiction → infographic style, documentary narration
- Business → clean visuals, professional tone

## Content Guardrails
- Transformative narration only (summary + commentary, not verbatim reading)
- Minimal direct quotes
- Rights checkbox required
- Report button on every title

## Backend (Lovable Cloud + Supabase)
- **Database**: Books, chapters, scenes, user watch progress, library metadata
- **Storage**: Uploaded book files, generated images, generated audio clips
- **Edge Functions**: Book parsing, AI Director pipeline (genre detection, scene planning, image generation), ElevenLabs TTS
- **Auth**: Email signup for upload and progress tracking

## Technical Approach
- Scene-by-scene asset generation (not one giant call)
- Web-based player assembles scenes in real-time (no video file rendering needed)
- Processing happens via chained edge function calls with progress tracking
- Consistency maintained via character/concept glossary per book

