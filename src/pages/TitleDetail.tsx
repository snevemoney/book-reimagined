import { useParams, Link } from "react-router-dom";
import { Play, Clock, BookOpen, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockBooks } from "@/data/mock-books";
import { supabase } from "@/integrations/supabase/client";
import { isUuid } from "@/lib/ids";
import { mapBookRow } from "@/lib/map-book";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const TitleDetail = () => {
  const { id } = useParams();

  const { data: book, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      if (!id) return null;
      if (!isUuid(id)) {
        return mockBooks.find((b) => b.id === id) || null;
      }
      const { data, error: queryError } = await supabase
        .from("books")
        .select("id,title,author,genre,tags,synopsis,status,poster_url,backdrop_url,runtime_minutes,episode_count,scene_count,created_at")
        .eq("id", id)
        .maybeSingle();
      if (queryError) throw queryError;
      if (data) return mapBookRow(data);
      return mockBooks.find((b) => b.id === id) || null;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-foreground">Could not load this title.</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Title not found</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {book.backdrop_url ? (
          <img src={book.backdrop_url} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="-mt-48 relative z-10 px-6 md:px-12 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row gap-8"
        >
          {/* Poster */}
          <div className="flex-shrink-0 w-48 md:w-64">
            {book.poster_url ? (
              <img src={book.poster_url} alt={book.title} className="w-full aspect-[2/3] object-cover rounded-lg shadow-2xl" />
            ) : (
              <div className="w-full aspect-[2/3] rounded-lg shadow-2xl bg-secondary flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <h1 className="font-display text-4xl md:text-6xl text-foreground">{book.title}</h1>
            <p className="text-muted-foreground">{book.author}</p>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="capitalize bg-primary/20 text-primary border-primary/30">
                {book.genre}
              </Badge>
              {book.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-muted text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{book.runtime_minutes} min</span>
              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{book.scene_count} scenes</span>
              {book.episode_count > 1 && <span>{book.episode_count} episodes</span>}
            </div>

            {book.progress_percent && book.progress_percent > 0 && (
              <div className="max-w-xs space-y-1">
                <Progress value={book.progress_percent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{book.progress_percent}% watched</p>
              </div>
            )}

            <p className="text-foreground/80 max-w-xl leading-relaxed">{book.synopsis || "No synopsis available yet."}</p>

            <div className="flex items-center gap-3 pt-2">
              {book.status === "ready" ? (
                <Link to={`/watch/${book.id}`}>
                  <Button size="lg" className="gap-2 px-8">
                    <Play className="w-5 h-5 fill-current" />
                    {book.progress_percent ? "Resume" : "Play"}
                  </Button>
                </Link>
              ) : (
                <Button size="lg" disabled className="gap-2 px-8">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {book.status === "processing" ? "Processing…" : "Unavailable"}
                </Button>
              )}
              <Button size="lg" variant="outline" className="gap-2">
                <Flag className="w-4 h-4" />
                Report
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default TitleDetail;
