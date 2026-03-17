export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { query } from '@/lib/db';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg)$/i;

// ─── Image path rewriter ───────────────────────────────────────────────────
// Matches any image reference that is NOT already absolute (http/https or /)
// Handles:
//   ![alt](_page_0_Picture_1.jpeg)
//   ![alt](./_page_1_Figure_3.jpeg)
//   ![alt](some/relative/path.png)
const IMAGE_PATTERN =
  /!\[([^\]]*)\]\(((?!https?:\/\/|\/)[^)]*\.(jpe?g|png|gif|webp|svg))\)/gi;

function rewriteImagePaths(markdown: string, folderName: string): string {
  return markdown.replace(IMAGE_PATTERN, (_match, alt: string, src: string) => {
    // Strip leading ./ or any sub-path — keep only the basename
    const filename = src.split('/').pop() ?? src;
    return `![${alt}](/uploads/${folderName}/${filename})`;
  });
}

// ─── Extract chapter number from NCERT folder naming convention ─────────────
function parseChapterNumber(folderName: string): number | null {
  const m = folderName.match(/\.C(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Extract chapter title from markdown ────────────────────────────────────
function extractTitle(markdown: string): string {
  for (const line of markdown.split('\n')) {
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) return h2[1].trim();
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) return h1[1].trim();
  }
  return 'Untitled Chapter';
}

// ─── POST handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const folderName = (formData.get('folder_name') as string)?.trim();
    const textbookId = formData.get('textbook_id') as string | null;
    const files = formData.getAll('files') as File[];

    if (!folderName) {
      return NextResponse.json({ error: 'folder_name is required' }, { status: 400 });
    }
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // ── Categorise files ─────────────────────────────────────────────────
    const mdFile = files.find(
      (f) => f.name.endsWith('.md') && !f.name.endsWith('.EXE.md') && !f.name.endsWith('.bak')
    );
    const exeFile = files.find((f) => f.name.endsWith('.EXE.md'));
    const metaFile = files.find((f) => f.name.endsWith('_meta.json'));
    const imageFiles = files.filter((f) => IMAGE_EXTS.test(f.name));

    if (!mdFile) {
      return NextResponse.json(
        { error: 'No main .md file found in the uploaded files' },
        { status: 400 }
      );
    }

    // ── Save images to public/uploads/{folderName}/ ───────────────────────
    const uploadDir = path.join(PUBLIC_DIR, 'uploads', folderName);
    await mkdir(uploadDir, { recursive: true });

    const savedImages: string[] = [];
    for (const img of imageFiles) {
      const safeName = img.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const imgBuffer = Buffer.from(await img.arrayBuffer());
      await writeFile(path.join(uploadDir, safeName), imgBuffer);
      savedImages.push(safeName);
    }

    // ── Process markdown — rewrite image paths ────────────────────────────
    const rawContent = await mdFile.text();
    const contentMd = rewriteImagePaths(rawContent, folderName);

    let exercisesMd: string | null = null;
    if (exeFile) {
      const rawExe = await exeFile.text();
      exercisesMd = rewriteImagePaths(rawExe, folderName);
    }

    // Parse TOC from meta JSON if included
    let tocJson: unknown = null;
    if (metaFile) {
      try {
        const metaText = await metaFile.text();
        const meta = JSON.parse(metaText);
        tocJson = meta.table_of_contents ?? null;
      } catch {
        // ignore malformed JSON
      }
    }

    // ── Detect chapter title & number ─────────────────────────────────────
    const title = extractTitle(contentMd);
    const chapterNumber = parseChapterNumber(folderName);
    const readTime = Math.ceil(contentMd.split(/\s+/).filter(Boolean).length / 200);

    // ── Upsert chapter by source_folder (auto-match) or by chapter number ──
    let chapterId: string | null = null;
    let upsertAction: 'updated' | 'created' = 'updated';

    // Try to find existing chapter by source_folder name
    const existingByFolder = await query<{ id: string }>(
      `SELECT c.id FROM chapters c
       JOIN textbooks t ON c.textbook_id = t.id
       WHERE c.source_folder = $1
       ${textbookId ? 'AND c.textbook_id = $2' : ''}
       LIMIT 1`,
      textbookId ? [folderName, textbookId] : [folderName]
    );

    if (existingByFolder.length > 0) {
      // Update existing chapter
      chapterId = existingByFolder[0].id;
      await query(
        `UPDATE chapters
         SET content_markdown    = $1,
             exercises_markdown  = $2,
             toc_json            = $3,
             title               = $4,
             estimated_read_time_minutes = $5,
             content_length      = $6,
             updated_at          = NOW()
         WHERE id = $7`,
        [
          contentMd,
          exercisesMd,
          tocJson ? JSON.stringify(tocJson) : null,
          title,
          readTime,
          contentMd.length,
          chapterId,
        ]
      );
      upsertAction = 'updated';
    } else if (textbookId && chapterNumber !== null) {
      // Create new chapter under the specified textbook
      const [newChapter] = await query<{ id: string }>(
        `INSERT INTO chapters
           (textbook_id, title, chapter_number, content_markdown, exercises_markdown,
            toc_json, source_folder, display_order,
            estimated_read_time_minutes, content_length)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (textbook_id, chapter_number) DO UPDATE
           SET content_markdown   = EXCLUDED.content_markdown,
               exercises_markdown = EXCLUDED.exercises_markdown,
               toc_json           = EXCLUDED.toc_json,
               title              = EXCLUDED.title,
               updated_at         = NOW()
         RETURNING id`,
        [
          textbookId,
          title,
          chapterNumber,
          contentMd,
          exercisesMd,
          tocJson ? JSON.stringify(tocJson) : null,
          folderName,
          chapterNumber, // display_order defaults to chapter_number
          readTime,
          contentMd.length,
        ]
      );
      chapterId = newChapter.id;
      upsertAction = 'created';

      // Update textbook chapter count
      await query(
        `UPDATE textbooks
         SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE textbook_id = $1),
             updated_at = NOW()
         WHERE id = $1`,
        [textbookId]
      );
    }

    // ── Update chapter_images table ───────────────────────────────────────
    if (chapterId && savedImages.length > 0) {
      await query('DELETE FROM chapter_images WHERE chapter_id = $1', [chapterId]);
      for (const filename of savedImages) {
        const pageMatch = filename.match(/_page_(\d+)_/);
        const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : null;
        await query(
          `INSERT INTO chapter_images (chapter_id, filename, original_path, stored_path, alt_text, page_number)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            chapterId,
            filename,
            filename,
            `/uploads/${folderName}/${filename}`,
            filename.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
            pageNumber,
          ]
        );
      }
    }

    // ── Record in uploaded_files ──────────────────────────────────────────
    await query(
      `INSERT INTO uploaded_files
         (original_filename, stored_filename, file_path, file_size_bytes,
          mime_type, file_type, linked_chapter_id, linked_textbook_id, status, processed_at)
       VALUES ($1,$2,$3,$4,'application/zip','folder',$5,$6,'ingested',NOW())`,
      [
        folderName,
        folderName,
        `/uploads/${folderName}`,
        files.reduce((sum, f) => sum + f.size, 0),
        chapterId ?? null,
        textbookId ?? null,
      ]
    );

    return NextResponse.json({
      success: true,
      folder: folderName,
      chapter_id: chapterId,
      action: chapterId ? upsertAction : 'recorded_only',
      title,
      chapter_number: chapterNumber,
      images_saved: savedImages.length,
      images: savedImages,
      content_length: contentMd.length,
      read_time_minutes: readTime,
    });
  } catch (err) {
    console.error('POST /api/upload/folder error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Folder upload failed' },
      { status: 500 }
    );
  }
}
