import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import HeroBanner from "@/components/library/HeroBanner";
import CategoryRow from "@/components/library/CategoryRow";
import { Button } from "@/components/ui/button";
import { mockBooks, getBooksByCategory } from "@/data/mock-books";
import { supabase } from "@/integrations/supabase/client";
import { LIBRARY_PAGE_SIZE, mapBookRow } from "@/lib/map-book";

const Index = () => {
  const { data: dbBooks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["books", LIBRARY_PAGE_SIZE],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("books")
        .select("id,title,author,genre,tags,synopsis,status,poster_url,backdrop_url,runtime_minutes,episode_count,scene_count,created_at")
        .order("created_at", { ascending: false })
        .limit(LIBRARY_PAGE_SIZE);
      if (queryError) throw queryError;
      return (data || []).map(mapBookRow);
    },
  });

  const allBooks = useMemo(() => {
    if (dbBooks && dbBooks.length > 0) return dbBooks;
    return mockBooks;
  }, [dbBooks]);

  const categories = useMemo(() => {
    if (dbBooks && dbBooks.length > 0) {
      const processing = allBooks.filter((b) => b.status === "processing" || b.status === "parsed");
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

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-foreground">Could not load the library.</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </main>
    );
  }

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
