import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, Loader2 } from "lucide-react";
import { useState } from "react";
import { mockBooks } from "@/data/mock-books";
import { supabase } from "@/integrations/supabase/client";
import { isUuid } from "@/lib/ids";
import { mapBookRow } from "@/lib/map-book";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";

const Watch = () => {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentScene] = useState(0);

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
        <p className="text-muted-foreground">This title is not available yet.</p>
      </div>
    );
  }

  // Mock scenes for demo
  const scenes = [
    { title: "Chapter 1: The Beginning", caption: "Every story begins with a single moment of change…" },
    { title: "Chapter 1: The Call", caption: "The protagonist faces an unexpected challenge that will reshape everything." },
  ];

  return (
    <div
      className="fixed inset-0 bg-background cursor-none"
      onMouseMove={() => { setShowControls(true); }}
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {/* Scene display */}
      <div className="absolute inset-0">
        <img
          src={book.backdrop_url}
          alt="Scene"
          className={`w-full h-full object-cover ${isPlaying ? "animate-ken-burns" : ""}`}
        />
        <div className="absolute inset-0 bg-background/30" />
      </div>

      {/* Captions */}
      <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6">
        <motion.div
          key={currentScene}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background/80 backdrop-blur-sm px-6 py-3 rounded-lg max-w-2xl text-center"
        >
          <p className="text-foreground text-lg font-medium">
            {scenes[currentScene]?.caption}
          </p>
        </motion.div>
      </div>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-auto">
              <div className="flex items-center gap-4">
                <Link to={`/title/${book.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <p className="text-foreground font-medium">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{scenes[currentScene]?.title}</p>
                </div>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent pointer-events-auto space-y-3">
              {/* Progress bar */}
              <div onClick={(e) => e.stopPropagation()}>
                <Slider
                  value={[progress]}
                  onValueChange={(v) => setProgress(v[0])}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-foreground"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                    className="text-foreground w-12 h-12"
                  >
                    {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-foreground"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-foreground/70 text-sm">
                  <Volume2 className="w-4 h-4" />
                  <span>{Math.floor(progress * book.runtime_minutes / 100)}:{String(Math.floor((progress * book.runtime_minutes / 100 % 1) * 60)).padStart(2, "0")} / {book.runtime_minutes}:00</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Watch;
