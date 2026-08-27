-- Hide chapter source text from PostgREST roles. Service role (edge functions) keeps full access.
REVOKE ALL ON TABLE public.chapters FROM anon, authenticated;

GRANT SELECT (
  id,
  book_id,
  title,
  "order",
  word_count,
  start_time,
  end_time,
  created_at
) ON public.chapters TO authenticated;

DROP POLICY IF EXISTS "Anyone can view chapters" ON public.chapters;

CREATE POLICY "Book owner can view chapters" ON public.chapters
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_id AND books.user_id = auth.uid()
    )
  );

-- Uploaded book files are not public objects; paths are {user_id}/...
UPDATE storage.buckets SET public = false WHERE id = 'book-uploads';

DROP POLICY IF EXISTS "Anyone can read book uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload books" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;

CREATE POLICY "Owners can read their book uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'book-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Owners can upload books"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'book-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Owners can update their book uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'book-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Owners can delete their book uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'book-uploads'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE INDEX IF NOT EXISTS books_user_id_idx ON public.books (user_id);
CREATE INDEX IF NOT EXISTS books_created_at_idx ON public.books (created_at DESC);
CREATE INDEX IF NOT EXISTS books_status_idx ON public.books (status);
CREATE INDEX IF NOT EXISTS chapters_book_id_order_idx ON public.chapters (book_id, "order");
CREATE INDEX IF NOT EXISTS scenes_chapter_id_order_idx ON public.scenes (chapter_id, "order");
