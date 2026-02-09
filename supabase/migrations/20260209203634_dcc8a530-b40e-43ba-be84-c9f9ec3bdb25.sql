
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

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own books" ON public.books FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own books" ON public.books FOR DELETE TO authenticated USING (auth.uid() = user_id);

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

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Book owner can insert chapters" ON public.chapters FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.books WHERE books.id = book_id AND books.user_id = auth.uid()));
CREATE POLICY "Book owner can update chapters" ON public.chapters FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.books WHERE books.id = book_id AND books.user_id = auth.uid()));
CREATE POLICY "Book owner can delete chapters" ON public.chapters FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.books WHERE books.id = book_id AND books.user_id = auth.uid()));

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

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scenes" ON public.scenes FOR SELECT USING (true);
CREATE POLICY "Book owner can insert scenes" ON public.scenes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chapters c JOIN public.books b ON b.id = c.book_id
    WHERE c.id = chapter_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Book owner can update scenes" ON public.scenes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chapters c JOIN public.books b ON b.id = c.book_id
    WHERE c.id = chapter_id AND b.user_id = auth.uid()
  ));
CREATE POLICY "Book owner can delete scenes" ON public.scenes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chapters c JOIN public.books b ON b.id = c.book_id
    WHERE c.id = chapter_id AND b.user_id = auth.uid()
  ));

-- Storage bucket for book uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('book-uploads', 'book-uploads', true);

CREATE POLICY "Anyone can read book uploads" ON storage.objects FOR SELECT USING (bucket_id = 'book-uploads');
CREATE POLICY "Authenticated users can upload books" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'book-uploads');
CREATE POLICY "Users can update their uploads" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'book-uploads');
CREATE POLICY "Users can delete their uploads" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'book-uploads');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
