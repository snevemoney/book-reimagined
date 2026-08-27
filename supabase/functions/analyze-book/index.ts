import { assertBookOwner, authenticateCaller, createServiceClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { isUuid } from "../_shared/ids.ts";
import { fetchWithRetry } from "../_shared/retry.ts";

const GENRES = [
  "fiction","non-fiction","business","history","science",
  "self-help","fantasy","mystery","romance","biography",
];

// Scene pacing: 30-70 words narration, 12-25s, ~150 WPM
// Transformative summaries, NOT verbatim text

async function callAI(
  apiKey: string,
  messages: { role: string; content: string }[],
  tools?: any[],
  toolChoice?: any,
) {
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
  };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const res = await fetchWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }

  return await res.json();
}

// ── Step 1: Synopsis + Genre ──────────────────────────────────────────

async function analyzeBook(
  apiKey: string,
  title: string,
  chapterSummaries: string,
) {
  const tools = [
    {
      type: "function",
      function: {
        name: "book_analysis",
        description:
          "Return the book analysis with synopsis, genre, tags, and author.",
        parameters: {
          type: "object",
          properties: {
            synopsis: {
              type: "string",
              description:
                "A compelling 2-3 sentence synopsis of the book suitable for a streaming platform. Do NOT reproduce the original text. Write a transformative summary.",
            },
            genre: {
              type: "string",
              enum: GENRES,
              description: "The primary genre of the book.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "3-5 descriptive tags like 'psychological', 'surreal', 'romantic drama'.",
            },
            author: {
              type: "string",
              description:
                "The author's name if detectable from the text, otherwise 'Unknown'.",
            },
            tone: {
              type: "string",
              description:
                "One-word tone descriptor: e.g. dark, whimsical, contemplative, thrilling.",
            },
          },
          required: ["synopsis", "genre", "tags", "author", "tone"],
          additionalProperties: false,
        },
      },
    },
  ];

  const result = await callAI(
    apiKey,
    [
      {
        role: "system",
        content: `You are a literary analyst for a book-to-visual-experience platform called Bookflix. 
Analyze the book and provide metadata. Your synopsis must be TRANSFORMATIVE — a fresh description, NOT quoting the source text. 
Write as if creating a compelling Netflix-style description.`,
      },
      {
        role: "user",
        content: `Analyze this book titled "${title}". Here are summaries of each chapter:\n\n${chapterSummaries}`,
      },
    ],
    tools,
    { type: "function", function: { name: "book_analysis" } },
  );

  const call = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("AI did not return tool call for analysis");
  try {
    const parsed = JSON.parse(call.function.arguments);
    if (!parsed || typeof parsed.synopsis !== "string" || typeof parsed.genre !== "string") {
      throw new Error("invalid analysis shape");
    }
    return parsed;
  } catch {
    throw new Error("AI returned invalid analysis JSON");
  }
}

// ── Step 2: Scene Plans per Chapter ───────────────────────────────────

interface ScenePlan {
  order: number;
  narration_text: string;
  caption_text: string;
  visual_prompt: string;
  duration_seconds: number;
}

async function planScenesForChapter(
  apiKey: string,
  bookTitle: string,
  tone: string,
  chapterTitle: string,
  chapterText: string,
  chapterOrder: number,
): Promise<ScenePlan[]> {
  // Truncate chapter to ~4000 words to stay within context
  const words = chapterText.split(/\s+/);
  const truncated = words.slice(0, 4000).join(" ");
  const wordCount = words.length;
  
  // Aim for ~1 scene per 200-400 words, min 2, max 15 scenes per chapter
  const targetScenes = Math.max(2, Math.min(15, Math.round(wordCount / 300)));

  const tools = [
    {
      type: "function",
      function: {
        name: "scene_plans",
        description: "Return an array of scene plans for this chapter.",
        parameters: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  narration_text: {
                    type: "string",
                    description:
                      "Transformative narration (30-70 words). A fresh retelling, NOT verbatim text. Written for text-to-speech at ~150 WPM.",
                  },
                  caption_text: {
                    type: "string",
                    description:
                      "Short subtitle text shown on screen (max 15 words).",
                  },
                  visual_prompt: {
                    type: "string",
                    description:
                      "Detailed image generation prompt describing the scene visually. Include style, lighting, mood, composition, and key elements. Example: 'A dimly lit Viennese ballroom, golden chandeliers, couples in masquerade masks dancing, oil painting style, warm amber tones'",
                  },
                  duration_seconds: {
                    type: "number",
                    description: "Scene duration in seconds (12-25).",
                  },
                },
                required: [
                  "narration_text",
                  "caption_text",
                  "visual_prompt",
                  "duration_seconds",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["scenes"],
          additionalProperties: false,
        },
      },
    },
  ];

  const result = await callAI(
    apiKey,
    [
      {
        role: "system",
        content: `You are the AI Director for Bookflix, creating scene plans to turn book chapters into cinematic visual experiences.

RULES:
- Create exactly ${targetScenes} scenes for this chapter.
- Each scene narration must be 30-70 words, targeting ~150 words-per-minute delivery.
- Duration: 12-25 seconds per scene.
- Narrations must be TRANSFORMATIVE summaries — fresh storytelling commentary, NOT verbatim quotes.
- Visual prompts should be rich and specific for AI image generation. Include art style, lighting, color palette, composition.
- The overall tone of this book is: ${tone}.
- Caption text is a short subtitle overlay (max 15 words).`,
      },
      {
        role: "user",
        content: `Book: "${bookTitle}"
Chapter ${chapterOrder + 1}: "${chapterTitle}"

Chapter text (for context — do NOT reproduce verbatim):
${truncated}`,
      },
    ],
    tools,
    { type: "function", function: { name: "scene_plans" } },
  );

  const call = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("AI did not return scene plans");
  let parsed: { scenes?: unknown[] };
  try {
    parsed = JSON.parse(call.function.arguments);
  } catch {
    throw new Error("AI returned invalid scene JSON");
  }
  if (!Array.isArray(parsed.scenes)) {
    throw new Error("AI returned no scene list");
  }
  return (parsed.scenes || []).map((s: any, i: number) => ({
    ...s,
    order: i,
    duration_seconds: Math.max(12, Math.min(25, s.duration_seconds || 15)),
  }));
}

// ── Main Handler ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book_id } = await req.json();
    if (!isUuid(book_id)) {
      return jsonResponse({ error: "valid book_id UUID required" }, 400);
    }

    const { supabase, serviceKey } = createServiceClient();
    const caller = await authenticateCaller(req, supabase, serviceKey);
    if ("error" in caller) {
      return jsonResponse({ error: caller.error }, caller.status);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get book
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("*")
      .eq("id", book_id)
      .maybeSingle();

    if (bookErr || !book) {
      return jsonResponse({ error: "Book not found" }, 404);
    }

    const forbidden = assertBookOwner(caller, book.user_id);
    if (forbidden) {
      return jsonResponse({ error: forbidden.error }, forbidden.status);
    }

    await supabase
      .from("books")
      .update({ processing_step: "analyzing" })
      .eq("id", book_id);

    // Get chapters
    const { data: chapters, error: chErr } = await supabase
      .from("chapters")
      .select("*")
      .eq("book_id", book_id)
      .order("order")
      .limit(200);

    if (chErr || !chapters || chapters.length === 0) {
      await supabase
        .from("books")
        .update({ status: "error", processing_step: "no_chapters" })
        .eq("id", book_id);
      return jsonResponse({ error: "No chapters found for this book" }, 400);
    }

    // ── Step 1: Analyze book (synopsis, genre, tags) ──
    console.log(`Analyzing book: ${book.title} (${chapters.length} chapters)`);

    // Create brief chapter summaries for the analysis prompt
    const chapterSummaries = chapters
      .map((ch: any) => {
        const text = (ch.raw_text || "").substring(0, 500);
        return `Chapter ${ch.order + 1} - "${ch.title}" (${ch.word_count} words):\n${text}...`;
      })
      .join("\n\n");

    const analysis = await analyzeBook(apiKey, book.title, chapterSummaries);
    console.log("Analysis result:", JSON.stringify(analysis));

    // Update book with analysis
    await supabase
      .from("books")
      .update({
        synopsis: analysis.synopsis,
        genre: analysis.genre,
        tags: analysis.tags,
        author:
          analysis.author !== "Unknown" && book.author === "Unknown"
            ? analysis.author
            : book.author,
        processing_step: "planning_scenes",
      })
      .eq("id", book_id);

    // ── Step 2: Plan scenes for each chapter ──
    console.log("Planning scenes for each chapter...");

    let totalScenes = 0;
    let totalDuration = 0;
    let failedChapters = 0;

    for (const chapter of chapters) {
      console.log(
        `Planning scenes for chapter ${chapter.order + 1}: ${chapter.title}`,
      );

      try {
        const scenes = await planScenesForChapter(
          apiKey,
          book.title,
          analysis.tone || "contemplative",
          chapter.title,
          chapter.raw_text || "",
          chapter.order,
        );

        // Insert scenes
        const sceneInserts = scenes.map((s) => ({
          chapter_id: chapter.id,
          order: s.order,
          narration_text: s.narration_text,
          caption_text: s.caption_text,
          visual_prompt: s.visual_prompt,
          duration_seconds: s.duration_seconds,
        }));

        if (sceneInserts.length > 0) {
          const { error: sErr } = await supabase
            .from("scenes")
            .insert(sceneInserts);
          if (sErr) {
            failedChapters += 1;
            console.error(
              `Scene insert error for chapter ${chapter.order}:`,
              sErr,
            );
          } else {
            totalScenes += sceneInserts.length;
            totalDuration += sceneInserts.reduce(
              (sum, s) => sum + s.duration_seconds,
              0,
            );
          }
        }

        // Update chapter timing
        const chapterDuration = scenes.reduce(
          (sum, s) => sum + s.duration_seconds,
          0,
        );
        await supabase
          .from("chapters")
          .update({
            start_time: totalDuration - chapterDuration,
            end_time: totalDuration,
          })
          .eq("id", chapter.id);
      } catch (sceneErr) {
        failedChapters += 1;
        console.error(
          `Error planning scenes for chapter ${chapter.order}:`,
          sceneErr,
        );
      }

      // Small delay between chapters to avoid rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (totalScenes === 0) {
      await supabase
        .from("books")
        .update({ status: "error", processing_step: "scene_planning_failed" })
        .eq("id", book_id);
      return jsonResponse({ error: "Failed to plan scenes for this book" }, 500);
    }

    const runtimeMinutes = Math.max(1, Math.round(totalDuration / 60));

    await supabase
      .from("books")
      .update({
        status: "ready",
        processing_step: "complete",
        scene_count: totalScenes,
        runtime_minutes: runtimeMinutes,
        episode_count: Math.max(1, Math.ceil(chapters.length / 3)),
      })
      .eq("id", book_id);

    console.log(
      `Analysis complete: ${totalScenes} scenes, ${runtimeMinutes} min runtime, ${failedChapters} chapter failures`,
    );

    return jsonResponse({
      success: true,
      synopsis: analysis.synopsis,
      genre: analysis.genre,
      tags: analysis.tags,
      total_scenes: totalScenes,
      runtime_minutes: runtimeMinutes,
      failed_chapters: failedChapters,
    });
  } catch (err) {
    console.error("Analyze error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
