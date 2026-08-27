import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload as UploadIcon, FileText, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isTransientError, withRetry } from "@/lib/retry";
import { ACCEPTED_EXT, isAcceptedBookFile, sanitizeFileName } from "@/lib/upload";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [hasRights, setHasRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const handleFile = useCallback((f: File) => {
    const check = isAcceptedBookFile(f);
    if (!check.ok) {
      toast({ title: "Unsupported file", description: check.reason, variant: "destructive" });
      return;
    }
    setFile(f);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file || !hasRights || !user) return;
    setUploading(true);

    try {
      setProgress("Uploading file…");
      const safeName = sanitizeFileName(file.name);
      const filePath = `${user.id}/${Date.now()}-${safeName}`;
      await withRetry(async () => {
        const { error: uploadErr } = await supabase.storage
          .from("book-uploads")
          .upload(filePath, file);
        if (uploadErr) throw uploadErr;
      }, { retryOn: isTransientError });

      setProgress("Creating book entry…");
      const titleFromName = safeName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const { data: book, error: insertErr } = await supabase
        .from("books")
        .insert({
          user_id: user.id,
          title: titleFromName,
          file_path: filePath,
          file_name: safeName,
          status: "processing",
          processing_step: "uploaded",
        })
        .select("id")
        .single();

      if (insertErr || !book) throw insertErr || new Error("Failed to create book");

      setProgress("Starting parser…");
      const { error: fnErr, data: fnData } = await withRetry(async () => {
        const result = await supabase.functions.invoke("parse-book", {
          body: { book_id: book.id },
        });
        if (result.error) throw result.error;
        return result;
      }, { retryOn: isTransientError });

      if (fnErr || (fnData && typeof fnData === "object" && "error" in fnData && fnData.error)) {
        throw fnErr || new Error(String((fnData as { error?: string }).error) || "Parser failed");
      }

      toast({ title: "Book uploaded!", description: "Your book is being processed. Check the library for progress." });
      navigate("/");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  return (
    <main className="min-h-screen bg-background pt-24 px-6 md:px-12">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-2">Upload a Book</h1>
          <p className="text-muted-foreground mb-8">
            Drop your book file and we'll turn it into a watchable experience.
          </p>

          {/* Drop zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragActive ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"
            }`}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept={ACCEPTED_EXT.join(",")}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="text-foreground font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">Drag & drop your book file</p>
                <p className="text-sm text-muted-foreground">PDF, EPUB, DOCX, or TXT</p>
              </>
            )}
          </div>

          {/* Rights checkbox */}
          <div className="flex items-start gap-3 mt-6">
            <Checkbox
              id="rights"
              checked={hasRights}
              onCheckedChange={(c) => setHasRights(c === true)}
              className="mt-0.5"
            />
            <Label htmlFor="rights" className="text-sm text-foreground/80 leading-relaxed cursor-pointer">
              I own the rights or have permission to upload this book. I understand the content will be transformed into a summarized visual experience.
            </Label>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!file || !hasRights || uploading}
            className="w-full mt-6 gap-2"
            size="lg"
          >
            {uploading ? (
              <>{progress || "Processing…"}</>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Upload & Start Processing
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </main>
  );
};

export default Upload;
