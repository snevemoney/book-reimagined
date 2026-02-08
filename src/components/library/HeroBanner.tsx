import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
import { Book } from "@/types/book";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface HeroBannerProps {
  book: Book;
}

const HeroBanner = ({ book }: HeroBannerProps) => {
  return (
    <div className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
      {/* Backdrop image */}
      <div className="absolute inset-0">
        <img
          src={book.backdrop_url}
          alt={book.title}
          className="w-full h-full object-cover animate-ken-burns"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 pb-16 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-2xl space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="font-display text-primary text-lg tracking-widest">BOOKFLIX ORIGINAL</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-foreground leading-none">
            {book.title}
          </h1>

          <p className="text-sm text-foreground/60">{book.author}</p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-foreground/20 text-foreground/70 capitalize">
              {book.genre}
            </Badge>
            {book.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="border-foreground/20 text-foreground/70">
                {tag}
              </Badge>
            ))}
            <span className="text-sm text-foreground/50">{book.runtime_minutes} min</span>
            {book.episode_count > 1 && (
              <span className="text-sm text-foreground/50">• {book.episode_count} episodes</span>
            )}
          </div>

          <p className="text-foreground/70 text-sm md:text-base max-w-lg line-clamp-3">
            {book.synopsis}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Link to={`/watch/${book.id}`}>
              <Button size="lg" className="gap-2 font-semibold text-base px-8">
                <Play className="w-5 h-5 fill-current" />
                Play
              </Button>
            </Link>
            <Link to={`/title/${book.id}`}>
              <Button size="lg" variant="secondary" className="gap-2 font-semibold text-base px-8">
                <Info className="w-5 h-5" />
                More Info
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroBanner;
