import { Link } from "react-router-dom";
import { Play, Clock, Loader2 } from "lucide-react";
import { Book } from "@/types/book";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface BookCardProps {
  book: Book;
  index?: number;
}

const BookCard = ({ book, index = 0 }: BookCardProps) => {
  const isProcessing = book.status === "processing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative flex-shrink-0 w-[160px] md:w-[200px]"
    >
      <Link to={isProcessing ? "#" : `/title/${book.id}`} className="block">
        <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-secondary">
          <img
            src={book.poster_url}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            {!isProcessing && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary-foreground fill-current" />
                </div>
                <span className="text-xs text-foreground/80 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {book.runtime_minutes}m
                </span>
              </div>
            )}
            <p className="text-xs text-foreground/70 line-clamp-2">{book.synopsis}</p>
          </div>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-xs text-foreground/80">Processing…</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {book.progress_percent && book.progress_percent > 0 && (
          <Progress value={book.progress_percent} className="h-1 mt-1 rounded-none" />
        )}

        {/* Info */}
        <div className="mt-2 space-y-1">
          <h3 className="text-sm font-medium text-foreground truncate">{book.title}</h3>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30 text-muted-foreground capitalize">
              {book.genre}
            </Badge>
            {book.episode_count > 1 && (
              <span className="text-[10px] text-muted-foreground">
                {book.episode_count} eps
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default BookCard;
