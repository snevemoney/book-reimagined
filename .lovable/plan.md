

# Database, Storage, and Book Parser Pipeline

## What This Does
Sets up the complete backend foundation for Bookflix: database tables to track books/chapters/scenes, a file storage bucket for uploads, working authentication, and a backend function that parses uploaded book files to extract text and detect chapters.

## What You'll See After This
- Sign up / sign in actually works
- Uploading a book saves the file to storage and creates a "Processing" entry in your library
- The parser function extracts text and chapters from your book automatically
- The library page shows real books from the database instead of mock data

---

## Steps

### 1. Database Schema (Migration)
Create three core tables (status is stored as text, not a Postgres enum):

- **books** -- one row per uploaded book. Tracks title (initially from filename), author, genre, status (processing/ready/error), poster/backdrop URLs, runtime, episode count, synopsis, tags, and a reference to the uploaded file path. Has a nullable `user_id` so we know who uploaded it.
- **chapters** -- linked to a book. Stores chapter title, order, raw text content, and timing info (start_time/end_time populated later by the render pipeline).
- **scenes** -- linked to a chapter. Stores narration text, visual prompt, image/audio URLs, duration, caption text, and order.

RLS policies:
- Books: anyone can SELECT (public library). Only authenticated users can INSERT. Only the uploader can UPDATE/DELETE their own books.
- Chapters and scenes: anyone can SELECT. INSERT/UPDATE/DELETE restricted to the book's owner (checked via the parent book's user_id).

### 2. Storage Bucket
Create a `book-uploads` public bucket for storing uploaded book files (PDF/EPUB/DOCX/TXT). RLS policy allows authenticated users to upload, and anyone to read (so the parser function can access files).

### 3. Authentication
Wire up the Auth page to actually call the authentication system for sign up and sign in. Create an auth context/provider so the session is available app-wide. Protect the Upload page so only signed-in users can upload.

### 4. Edge Function: `parse-book`
A backend function that:
- Receives a `book_id`
- Downloads the uploaded file from storage
- Detects file type by extension
- Extracts raw text:
  - **TXT**: read directly
  - **PDF**: extract text with a lightweight regex pass over PDF text operators (not pdf-parse)
  - **DOCX**: extract text by unzipping and parsing the XML
  - **EPUB**: extract text by unzipping and parsing XHTML content files
- Detects chapter boundaries using heuristics:
  - Look for "Chapter N", "CHAPTER N", "Part N" patterns
  - Look for lines that are all-caps or very short followed by body text
  - Fall back to splitting by a fixed word count if no chapters detected
- Saves chapters to the database
- Updates the book's status and title (if extractable from the content)

### 5. Upload Page -- Real Integration
Update the Upload page to:
1. Require sign-in (redirect to auth if not logged in)
2. Upload the file to the `book-uploads` storage bucket
3. Insert a new row in `books` with status "processing"
4. Call the `parse-book` backend function with the new book ID
5. Navigate to library

### 6. Library -- Real Data
Replace mock data with real database queries on the Index page. Show books from the database grouped by genre/status. Keep mock data as fallback only if the database is empty.

---

## Technical Details

### Database SQL

```sql
-- Books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  author TEXT NOT NULL DEFAULT 'Unknown',
  genre TEXT NOT NULL DEFAULT 'fiction',
  tags TEXT[] DEFAULT '{}',
  synopsis TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'processing',
  poster_url TEXT DEFAULT '',
  backdrop_url TEXT DEFAULT '',
  runtime_minutes INTEGER DEFAULT 0,
  episode_count INTEGER DEFAULT 0,
  scene_count INTEGER DEFAULT 0,
  file_path TEXT,
  file_name TEXT,
  processing_step TEXT DEFAULT 'uploaded',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chapters table
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Chapter',
  "order" INTEGER NOT NULL DEFAULT 0,
  raw_text TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  start_time REAL DEFAULT 0,
  end_time REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scenes table
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  narration_text TEXT DEFAULT '',
  caption_text TEXT DEFAULT '',
  visual_prompt TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  audio_url TEXT DEFAULT '',
  duration_seconds REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge Function: `parse-book/index.ts`
- Uses `createClient` with the service role key to bypass RLS
- Downloads the file from `book-uploads` bucket
- For TXT: `new TextDecoder().decode(data)`
- For PDF: uses a lightweight text extraction approach (regex on the raw PDF stream for text objects)
- For DOCX: uses JSZip to read `word/document.xml` and strip XML tags
- For EPUB: uses JSZip to read content files listed in `container.xml` and `content.opf`
- Chapter detection via regex patterns, then inserts rows into `chapters` table
- Updates `books.status` to `'parsed'` and `books.processing_step` to `'parsed'`

### Auth Context
- `src/contexts/AuthContext.tsx` -- provides `user`, `session`, `signIn`, `signUp`, `signOut`
- Wraps the app in `App.tsx`
- Upload page checks for auth and redirects if needed

