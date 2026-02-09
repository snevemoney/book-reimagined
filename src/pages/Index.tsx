import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import HeroBanner from "@/components/library/HeroBanner";
import CategoryRow from "@/components/library/CategoryRow";
import { mockBooks, getBooksByCategory } from "@/data/mock-books";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/types/book";

const Index = () => {
  const { data: dbBooks } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any): Book => ({
        id: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre as Book["genre"],
        tags: b.tags || [],
        synopsis: b.synopsis || "",
        status: b.status as Book["status"],
        poster_url: b.poster_url || "",
        backdrop_url: b.backdrop_url || "",
        runtime_minutes: b.runtime_minutes || 0,
        episode_count: b.episode_count || 0,
        scene_count: b.scene_count || 0,
        created_at: b.created_at,
      }));
    },
  });

  const allBooks = useMemo(() => {
    if (dbBooks && dbBooks.length > 0) return dbBooks;
    return mockBooks;
  }, [dbBooks]);

  const categories = useMemo(() => {
    if (dbBooks && dbBooks.length > 0) {
      const processing = allBooks.filter((b) => b.status === "processing" || b.status === ("parsed" as any));
      const ready = allBooks.filter((b) => b.status === "ready");
      const fiction = allBooks.filter((b) => ["fiction", "fantasy", "mystery", "romance"].includes(b.genre));
      const nonFiction = allBooks.filter((b) => ["non-fiction", "science", "history", "biography"].includes(b.genre));
      const business = allBooks.filter((b) => ["business", "self-help"].includes(b.genre));
      return { continueWatching: [], recentlyAdded: ready.slice(0, 10), processing, fiction, nonFiction, business };
    }
    return getBooksByCategory();
  }, [allBooks, dbBooks]);

  const heroBook = useMemo(
    () => allBooks.find((b) => b.status === "ready") || allBooks[0],
    [allBooks]
  );

  return (
    <main className="min-h-screen bg-background">
      {heroBook && <HeroBanner book={heroBook} />}

      <div className="-mt-24 relative z-10 space-y-2">
        {categories.continueWatching.length > 0 && (
          <CategoryRow title="Continue Watching" books={categories.continueWatching} />
        )}
        {categories.recentlyAdded.length > 0 && (
          <CategoryRow title="Recently Added" books={categories.recentlyAdded} />
        )}
        {categories.processing.length > 0 && (
          <CategoryRow title="Processing" books={categories.processing} />
        )}
        {categories.fiction.length > 0 && (
          <CategoryRow title="Fiction" books={categories.fiction} />
        )}
        {categories.nonFiction.length > 0 && (
          <CategoryRow title="Non-Fiction & Science" books={categories.nonFiction} />
        )}
        {categories.business.length > 0 && (
          <CategoryRow title="Business & Self-Help" books={categories.business} />
        )}
      </div>
    </main>
  );
};

export default Index;
