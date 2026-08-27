import JSZip from "https://esm.sh/jszip@3.10.1";
import { assertBookOwner, authenticateCaller, bearerToken, createServiceClient } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { isUuid } from "../_shared/ids.ts";

const MAX_RAW_TEXT_CHARS = 500_000;

interface ChapterData {
  title: string;
  text: string;
  order: number;
}

function detectChapters(text: string): ChapterData[] {
  const lines = text.split("\n");
  const chapterPattern = /^(chapter|part|section)\s+(\d+|[ivxlcdm]+)/i;
  const allCapsShort = /^[A-Z][A-Z\s\d:.\-]{2,60}$/;

  const markers: { index: number; title: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (chapterPattern.test(line)) {
      markers.push({ index: i, title: line });
    } else if (allCapsShort.test(line) && line.length > 3 && line.length < 60) {
      const nextNonEmpty = lines.slice(i + 1, i + 4).find((l) => l.trim().length > 0);
      if (nextNonEmpty && nextNonEmpty.trim().length > 40) {
        markers.push({ index: i, title: line });
      }
    }
  }

  if (markers.length < 2) {
    // Fallback: split by ~3000 words
    const words = text.split(/\s+/);
    const chunkSize = 3000;
    const chapters: ChapterData[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chapters.push({
        title: `Section ${chapters.length + 1}`,
        text: words.slice(i, i + chunkSize).join(" "),
        order: chapters.length,
      });
    }
    return chapters.length > 0 ? chapters : [{ title: "Full Text", text, order: 0 }];
  }

  const chapters: ChapterData[] = [];
  for (let i = 0; i < markers.length; i++) {
    const startLine = markers[i].index;
    const endLine = i + 1 < markers.length ? markers[i + 1].index : lines.length;
    chapters.push({
      title: markers[i].title,
      text: lines.slice(startLine, endLine).join("\n").trim(),
      order: i,
    });
  }

  // Include any preamble before first chapter
  if (markers[0].index > 5) {
    const preamble = lines.slice(0, markers[0].index).join("\n").trim();
    if (preamble.length > 100) {
      chapters.unshift({ title: "Preface", text: preamble, order: -1 });
      chapters.forEach((c, i) => (c.order = i));
    }
  }

  return chapters;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)));
}

function extractTextFromTxt(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

function extractTextFromPdf(data: Uint8Array): string {
  // Basic PDF text extraction via stream parsing
  const raw = new TextDecoder("latin1").decode(data);
  const textObjects: string[] = [];

  // Match text between BT and ET operators
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textObjects.push(tjMatch[1]);
    }
    // TJ array
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strings = inner.match(/\(([^)]*)\)/g);
      if (strings) {
        textObjects.push(strings.map((s) => s.slice(1, -1)).join(""));
      }
    }
  }

  // Also try stream-decoded content
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  while ((match = streamRegex.exec(raw)) !== null) {
    const content = match[1];
    if (content.includes("Tj") || content.includes("TJ")) {
      const tjRegex2 = /\(([^)]*)\)\s*Tj/g;
      let m2;
      while ((m2 = tjRegex2.exec(content)) !== null) {
        textObjects.push(m2[1]);
      }
    }
  }

  return textObjects.join("\n") || "Could not extract text from this PDF. The PDF may use compressed streams or image-based content.";
}

async function extractTextFromDocx(data: Uint8Array): Promise<string> {
  // DOCX is a ZIP containing word/document.xml
  const zip = await new JSZip().loadAsync(data);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "Could not find document.xml in DOCX file.";
  
  // Strip XML tags, keep text content
  const text = decodeXmlEntities(
    docXml
      .replace(/<w:p[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

async function extractTextFromEpub(data: Uint8Array): Promise<string> {
  const zip = await new JSZip().loadAsync(data);

  // Read container.xml to find content.opf
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) return "Invalid EPUB: missing container.xml";

  const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!rootfileMatch) return "Invalid EPUB: no rootfile path";

  const opfPath = rootfileMatch[1];
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) return "Invalid EPUB: missing content.opf";

  // Extract manifest items - flexible attribute order
  const itemRegex = /<item\s[^>]*?>/gi;
  const manifest: Record<string, { href: string; type: string }> = {};
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
    const tag = itemMatch[0];
    const idMatch = tag.match(/id="([^"]+)"/);
    const hrefMatch = tag.match(/href="([^"]+)"/);
    const typeMatch = tag.match(/media-type="([^"]+)"/);
    if (idMatch && hrefMatch && typeMatch) {
      manifest[idMatch[1]] = { href: hrefMatch[1], type: typeMatch[1] };
    }
  }

  // Extract spine order
  const spineRegex = /<itemref\s[^>]*?idref="([^"]+)"[^>]*?>/gi;
  const spineOrder: string[] = [];
  let spineMatch;
  while ((spineMatch = spineRegex.exec(opfContent)) !== null) {
    spineOrder.push(spineMatch[1]);
  }

  // If spine is empty, try all html items from manifest
  const idsToProcess = spineOrder.length > 0 ? spineOrder : Object.keys(manifest);

  const textParts: string[] = [];
  for (const id of idsToProcess) {
    const item = manifest[id];
    if (!item || !item.type.includes("html")) continue;
    // Decode href (some EPUBs URL-encode paths)
    const decodedHref = decodeURIComponent(item.href);
    const filePath = opfDir + decodedHref;
    
    // Try exact path first, then search for it
    let html = await zip.file(filePath)?.async("string");
    if (!html) {
      // Try without opfDir prefix
      html = await zip.file(decodedHref)?.async("string");
    }
    if (!html) continue;
    
    const text = decodeXmlEntities(
      html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<\/?(p|div|br|h[1-6]|li|blockquote)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, ""),
    )
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text) textParts.push(text);
  }

  return textParts.join("\n\n") || "Could not extract text from this EPUB.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book_id } = await req.json();
    if (!isUuid(book_id)) {
      return jsonResponse({ error: "valid book_id UUID required" }, 400);
    }

    const { supabase, supabaseUrl, serviceKey } = createServiceClient();
    const caller = await authenticateCaller(req, supabase, serviceKey);
    if ("error" in caller) {
      return jsonResponse({ error: caller.error }, caller.status);
    }

    // Get book record
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

    // Update processing step
    await supabase.from("books").update({ processing_step: "parsing" }).eq("id", book_id);

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("book-uploads")
      .download(book.file_path);

    if (dlErr || !fileData) {
      await supabase.from("books").update({ status: "error", processing_step: "download_failed" }).eq("id", book_id);
      return jsonResponse({ error: "Failed to download file" }, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const ext = (book.file_name || book.file_path || "").split(".").pop()?.toLowerCase() || "";

    let extractedText = "";

    switch (ext) {
      case "txt":
        extractedText = extractTextFromTxt(uint8);
        break;
      case "pdf":
        extractedText = extractTextFromPdf(uint8);
        break;
      case "docx":
        extractedText = await extractTextFromDocx(uint8);
        break;
      case "epub":
        extractedText = await extractTextFromEpub(uint8);
        break;
      default:
        extractedText = extractTextFromTxt(uint8);
    }

    // Detect chapters
    const chapters = detectChapters(extractedText);

    // Insert chapters
    const chapterInserts = chapters.map((ch) => ({
      book_id,
      title: ch.title.substring(0, 200),
      order: ch.order,
      raw_text: ch.text.slice(0, MAX_RAW_TEXT_CHARS),
      word_count: ch.text.split(/\s+/).filter(Boolean).length,
    }));

    const { error: chInsertErr } = await supabase.from("chapters").insert(chapterInserts);

    if (chInsertErr) {
      console.error("Chapter insert error:", chInsertErr);
      await supabase.from("books").update({ status: "error", processing_step: "chapter_insert_failed" }).eq("id", book_id);
      return jsonResponse({ error: "Failed to save chapters" }, 500);
    }

    // Try to extract title from first line
    const firstLine = extractedText.split("\n").find((l) => l.trim().length > 2)?.trim();
    const titleFromContent = firstLine && firstLine.length < 100 ? firstLine : null;

    // Update book status
    const totalWords = chapters.reduce((sum, ch) => sum + ch.text.split(/\s+/).filter(Boolean).length, 0);
    const estimatedMinutes = Math.max(12, Math.min(90, Math.round(totalWords / 200)));

    await supabase.from("books").update({
      status: "parsed",
      processing_step: "parsed",
      title: titleFromContent && book.title === "Untitled" ? titleFromContent : book.title,
      runtime_minutes: estimatedMinutes,
      scene_count: chapters.length,
    }).eq("id", book_id);

    // Do not await analyze-book: the AI job can exceed the parse-book time limit.
    // Mark the book if the trigger request itself fails.
    const incomingAuth = bearerToken(req);
    const analyzeAuth = incomingAuth || serviceKey;
    const analyzeUrl = `${supabaseUrl}/functions/v1/analyze-book`;
    void fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${analyzeAuth}`,
      },
      body: JSON.stringify({ book_id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.error("analyze-book trigger failed:", res.status, await res.text());
          await supabase.from("books").update({
            status: "error",
            processing_step: "analyze_trigger_failed",
          }).eq("id", book_id);
        }
      })
      .catch(async (e) => {
        console.error("Error triggering analyze-book:", e);
        await supabase.from("books").update({
          status: "error",
          processing_step: "analyze_trigger_failed",
        }).eq("id", book_id);
      });
    console.log("Triggered analyze-book for", book_id);

    return jsonResponse({
      success: true,
      chapters: chapters.length,
      words: totalWords,
      estimated_minutes: estimatedMinutes,
    });
  } catch (err) {
    console.error("Parse error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

