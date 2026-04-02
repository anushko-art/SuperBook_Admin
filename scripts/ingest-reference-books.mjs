/**
 * ingest-reference-books.mjs
 *
 * Reads every book directory under splitted_books/, creates reference_book,
 * reference_chapter, and reference_images rows, and uploads images to the
 * Supabase "reference_images" storage bucket.
 *
 * Usage:
 *   node scripts/ingest-reference-books.mjs
 *
 * Required env vars (reads from .env.local automatically):
 *   DATABASE_URL                     – Postgres connection string
 *   NEXT_PUBLIC_SUPABASE_URL         – e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY        – service-role key (needed for storage uploads)
 *
 * Skips: chapter_taxonomy.json, raw_mineru_response.json, *.pdf
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";

// ─── Load env ────────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL in .env.local");
if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

const CAN_UPLOAD_IMAGES = !!SERVICE_KEY;
if (!CAN_UPLOAD_IMAGES) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY not set — image uploads will be SKIPPED.");
  console.warn("   DB rows will still be created with image_path but storage_url will be NULL.\n");
}

const supabase = CAN_UPLOAD_IMAGES
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

// ─── Book metadata map ───────────────────────────────────────────────────────
// Maps directory names → { name, author, publisher, subject }
const BOOK_META = {
  output_biology_raven: {
    name: "Biology of Plants",
    author: "Peter H. Raven, Ray F. Evert, Susan E. Eichhorn",
    publisher: "W.H. Freeman",
    subject: "Biology",
  },
  output_atkins_physical_chemistry: {
    name: "Atkins' Physical Chemistry",
    author: "Peter Atkins, Julio de Paula",
    publisher: "Oxford University Press",
    subject: "Physical Chemistry",
  },
  output_organic_chemistry: {
    name: "Organic Chemistry",
    author: "Jonathan Clayden, Nick Greeves, Stuart Warren",
    publisher: "Oxford University Press",
    subject: "Organic Chemistry",
  },
  output_inorganic_chemistry: {
    name: "Inorganic Chemistry",
    author: "Catherine E. Housecroft, Alan G. Sharpe",
    publisher: "Pearson",
    subject: "Inorganic Chemistry",
  },
  output_physics_fundamentals: {
    name: "Fundamentals of Physics",
    author: "David Halliday, Robert Resnick, Jearl Walker",
    publisher: "Wiley",
    subject: "Physics",
  },
  output_zoology_hickman: {
    name: "Integrated Principles of Zoology",
    author: "Cleveland P. Hickman, Larry S. Roberts, Allan Larson",
    publisher: "McGraw-Hill",
    subject: "Zoology",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SPLITTED_DIR = path.resolve("D:/book_mdx_react/DATABASE/splitted_books");

/** Return only "Chapter_*" directories (skip "Other_*", "Part_*"). */
function getChapterDirs(bookDir) {
  return fs
    .readdirSync(bookDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("Chapter_"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Find the main .md file inside a chapter dir (skip raw/taxonomy). */
function findMarkdownFile(chapterDir) {
  const files = fs.readdirSync(chapterDir).filter(
    (f) =>
      f.endsWith(".md") &&
      !f.includes("taxonomy") &&
      !f.includes("raw_mineru")
  );
  // Prefer the file whose name matches the directory name
  const dirBaseName = path.basename(chapterDir);
  const exact = files.find((f) => f === `${dirBaseName}.md`);
  return exact || files[0] || null;
}

/** Derive a clean chapter name from the directory name. */
function chapterName(dirName) {
  // e.g. "Chapter_01_1-botany-an-introduction" → "1 - Botany An Introduction"
  const parts = dirName.replace(/^Chapter_\d+_/, "");
  return parts
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const bookDirs = fs
    .readdirSync(SPLITTED_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  console.log(`\n📚 Found ${bookDirs.length} book(s) in splitted_books/\n`);

  let totalBooks = 0;
  let totalChapters = 0;
  let totalImages = 0;
  let totalImagesUploaded = 0;

  for (const bookDirEntry of bookDirs) {
    const bookKey = bookDirEntry.name;
    const bookPath = path.join(SPLITTED_DIR, bookKey);
    const meta = BOOK_META[bookKey];

    if (!meta) {
      console.warn(`⚠️  No metadata for "${bookKey}", skipping.`);
      continue;
    }

    // ── 1. Upsert reference_book ──
    const bookRes = await pool.query(
      `INSERT INTO reference_books (name, author, publisher, subject)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [meta.name, meta.author, meta.publisher, meta.subject]
    );

    let bookId;
    if (bookRes.rows.length > 0) {
      bookId = bookRes.rows[0].id;
      console.log(`✅ Created book: "${meta.name}" → ${bookId}`);
    } else {
      // Already exists – look it up
      const existing = await pool.query(
        `SELECT id FROM reference_books WHERE name = $1 LIMIT 1`,
        [meta.name]
      );
      bookId = existing.rows[0]?.id;
      if (!bookId) {
        console.error(`❌ Could not find or create book "${meta.name}"`);
        continue;
      }
      console.log(`♻️  Book "${meta.name}" already exists → ${bookId}`);
    }

    totalBooks++;

    // ── 2. Process each Chapter_* directory ──
    const chapterDirs = getChapterDirs(bookPath);
    console.log(`   📖 ${chapterDirs.length} chapter(s) to process`);

    for (const chDir of chapterDirs) {
      const chFullPath = path.join(bookPath, chDir.name);
      const name = chapterName(chDir.name);

      // Read markdown
      const mdFile = findMarkdownFile(chFullPath);
      let markdownText = null;
      if (mdFile) {
        markdownText = fs.readFileSync(
          path.join(chFullPath, mdFile),
          "utf-8"
        );
      }

      // Check if chapter already exists
      const existingCh = await pool.query(
        `SELECT id FROM reference_chapters
         WHERE reference_book_id = $1 AND name = $2 LIMIT 1`,
        [bookId, name]
      );

      let chapterId;
      if (existingCh.rows.length > 0) {
        chapterId = existingCh.rows[0].id;
        // Update markdown if needed
        await pool.query(
          `UPDATE reference_chapters SET markdown_text = $1, updated_at = now()
           WHERE id = $2`,
          [markdownText, chapterId]
        );
        console.log(`      ♻️  Chapter "${name}" updated → ${chapterId}`);
      } else {
        const chRes = await pool.query(
          `INSERT INTO reference_chapters (reference_book_id, name, markdown_text)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [bookId, name, markdownText]
        );
        chapterId = chRes.rows[0].id;
        console.log(`      ✅ Chapter "${name}" → ${chapterId}`);
      }
      totalChapters++;

      // ── 3. Process image_dictionary.json ──
      const imgDictPath = path.join(chFullPath, "image_dictionary.json");
      if (!fs.existsSync(imgDictPath)) {
        console.log(`      ℹ️  No image_dictionary.json, skipping images`);
        continue;
      }

      const imgDict = JSON.parse(fs.readFileSync(imgDictPath, "utf-8"));
      const imagesDir = path.join(chFullPath, "images");

      for (const imgEntry of imgDict) {
        totalImages++;
        const localImgPath = path.join(chFullPath, imgEntry.image_path);

        if (!fs.existsSync(localImgPath)) {
          console.warn(
            `         ⚠️  Image not found: ${imgEntry.image_path}`
          );
          continue;
        }

        // Storage path:  <bookKey>/<chapterDirName>/images/<filename>
        const storagePath = `${bookKey}/${chDir.name}/${imgEntry.image_path}`;

        // Upload to Supabase storage
        let storageUrl = null;
        if (CAN_UPLOAD_IMAGES && supabase) {
          try {
            const fileBuffer = fs.readFileSync(localImgPath);
            const { error: uploadError } = await supabase.storage
              .from("reference_images")
              .upload(storagePath, fileBuffer, {
                contentType: "image/jpeg",
                upsert: true,
              });

            if (uploadError) {
              console.warn(
                `         ⚠️  Upload error for ${storagePath}: ${uploadError.message}`
              );
            } else {
              const { data: urlData } = supabase.storage
                .from("reference_images")
                .getPublicUrl(storagePath);
              storageUrl = urlData?.publicUrl || null;
              totalImagesUploaded++;
            }
          } catch (err) {
            console.warn(`         ⚠️  Upload exception: ${err.message}`);
          }
        }

        // Insert reference_images row
        await pool.query(
          `INSERT INTO reference_images
             (reference_chapter_id, image_path, caption, page, storage_url)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [
            chapterId,
            imgEntry.image_path,
            imgEntry.caption || null,
            imgEntry.page || null,
            storageUrl,
          ]
        );
      }

      console.log(
        `      🖼️  ${imgDict.length} image record(s) processed`
      );
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`🎉 Ingestion complete!`);
  console.log(`   Books:     ${totalBooks}`);
  console.log(`   Chapters:  ${totalChapters}`);
  console.log(`   Images:    ${totalImages} (${totalImagesUploaded} uploaded)`);
  console.log("═".repeat(60) + "\n");

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
