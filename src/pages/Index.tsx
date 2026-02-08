import { useMemo } from "react";
import HeroBanner from "@/components/library/HeroBanner";
import CategoryRow from "@/components/library/CategoryRow";
import { mockBooks, getBooksByCategory } from "@/data/mock-books";

const Index = () => {
  const categories = useMemo(() => getBooksByCategory(), []);
  const heroBook = useMemo(
    () => mockBooks.filter((b) => b.status === "ready")[0],
    []
  );

  return (
    <main className="min-h-screen bg-background">
      {heroBook && <HeroBanner book={heroBook} />}

      <div className="-mt-24 relative z-10 space-y-2">
        <CategoryRow title="Continue Watching" books={categories.continueWatching} />
        <CategoryRow title="Recently Added" books={categories.recentlyAdded} />
        {categories.processing.length > 0 && (
          <CategoryRow title="Processing" books={categories.processing} />
        )}
        <CategoryRow title="Fiction" books={categories.fiction} />
        <CategoryRow title="Non-Fiction & Science" books={categories.nonFiction} />
        <CategoryRow title="Business & Self-Help" books={categories.business} />
      </div>
    </main>
  );
};

export default Index;
