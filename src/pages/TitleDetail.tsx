import { useParams, Link } from "react-router-dom";
import { Play, Clock, BookOpen, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockBooks } from "@/data/mock-books";
import { motion } from "framer-motion";

const TitleDetail = () => {
  const { id } = useParams();
  const book = mockBooks.find((b) => b.id === id);

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Title not found</p>
      </div>
    );
  }

  const relatedBooks = mockBooks
    .filter((b) => b.id !== book.id && b.status === "ready")
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-background">
      {/* Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <img src={book.backdrop_url} alt={book.title} className="w-full h-full object-cover" />
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
            <img
              src={book.poster_url}
              alt={book.title}
              className="w-full aspect-[2/3] object-cover rounded-lg shadow-2xl"
            />
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

            <p className="text-foreground/80 max-w-xl leading-relaxed">{book.synopsis}</p>

            <div className="flex items-center gap-3 pt-2">
              <Link to={`/watch/${book.id}`}>
                <Button size="lg" className="gap-2 px-8">
                  <Play className="w-5 h-5 fill-current" />
                  {book.progress_percent ? "Resume" : "Play"}
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2">
                <Flag className="w-4 h-4" />
                Report
              </Button>
            </div>

            {/* Episodes */}
            {book.episode_count > 1 && (
              <div className="pt-6">
                <h2 className="font-display text-2xl text-foreground mb-3">Episodes</h2>
                <div className="space-y-2">
                  {Array.from({ length: book.episode_count }, (_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-foreground">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Episode {i + 1}</p>
                        <p className="text-xs text-muted-foreground">
                          ~{Math.round(book.runtime_minutes / book.episode_count)} min
                        </p>
                      </div>
                      <Link to={`/watch/${book.id}?ep=${i + 1}`}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <Play className="w-3 h-3 fill-current" /> Play
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* More Like This */}
        {relatedBooks.length > 0 && (
          <section className="mt-16 pb-12">
            <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">More Like This</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedBooks.map((b) => (
                <Link key={b.id} to={`/title/${b.id}`} className="group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                    <img src={b.poster_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-background/90 to-transparent">
                      <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                      <p className="text-xs text-muted-foreground">{b.runtime_minutes} min</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default TitleDetail;
