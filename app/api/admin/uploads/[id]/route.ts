import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface MetaBody {
  doc_type?: string;
  subject?: string;
  class_level?: string;
  source?: string;
  chapter_no?: number | null;
  chapter_name?: string;
  status?: string;
  map_chapter?: boolean; // if true, create/update textbook + chapter
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body: MetaBody = await req.json();
    const { doc_type, subject, class_level, source, chapter_no, chapter_name, status, map_chapter } = body;

    // Build meta_json
    const meta = { doc_type, subject, class_level, source, chapter_no, chapter_name };

    // Update meta_json and status
    await query(
      `UPDATE uploaded_files
         SET meta_json  = $1::jsonb,
             status     = COALESCE($2, status),
             updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(meta), status ?? null, id]
    );

    let chapterId: string | null = null;
    let textbookId: string | null = null;

    // If map_chapter flag is set, create/upsert textbook and chapter
    if (map_chapter && subject && class_level) {
      // Get the folder name from uploaded_files
      const [upload] = await query<{
        original_filename: string;
        file_path: string;
      }>(
        `SELECT original_filename, file_path FROM uploaded_files WHERE id = $1`,
        [id]
      );

      if (upload) {
        const folderName = upload.original_filename;
        const grade = class_level === 'XI' ? '11' : class_level === 'XII' ? '12' : class_level;
        const part = folderName.includes('.P1.') ? 'Part 1' : folderName.includes('.P2.') ? 'Part 2' : 'Part 1';
        const publisher = source === 'NCERT' ? 'NCERT' : (source ?? 'Other');
        const tbTitle = `${subject} Class ${grade} ${part}`;
        const tbSlug = tbTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Upsert textbook
        const [tb] = await query<{ id: string }>(
          `INSERT INTO textbooks (title, subject, grade, part, publisher, slug, is_published)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           ON CONFLICT (slug) DO UPDATE
             SET subject = EXCLUDED.subject, grade = EXCLUDED.grade,
                 part = EXCLUDED.part, updated_at = NOW()
           RETURNING id`,
          [tbTitle, subject, grade, part, publisher, tbSlug]
        );
        textbookId = tb.id;

        // Get content_markdown from existing chapter if already linked
        const chNum = chapter_no ?? null;
        const chTitle = chapter_name ?? folderName;

        if (chNum !== null) {
          const [ch] = await query<{ id: string }>(
            `INSERT INTO chapters
               (textbook_id, title, chapter_number, source_folder, display_order)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (textbook_id, chapter_number) DO UPDATE
               SET title = EXCLUDED.title, source_folder = EXCLUDED.source_folder,
                   updated_at = NOW()
             RETURNING id`,
            [textbookId, chTitle, chNum, folderName, chNum]
          );
          chapterId = ch.id;
        }

        // Link upload to textbook/chapter
        await query(
          `UPDATE uploaded_files
             SET linked_textbook_id = $1,
                 linked_chapter_id  = $2,
                 status             = 'review',
                 processed_at       = NOW()
           WHERE id = $3`,
          [textbookId, chapterId, id]
        );

        // Update textbook chapter count
        await query(
          `UPDATE textbooks
             SET total_chapters = (SELECT COUNT(*) FROM chapters WHERE textbook_id = $1),
                 updated_at     = NOW()
           WHERE id = $1`,
          [textbookId]
        );
      }
    }

    return NextResponse.json({ ok: true, chapter_id: chapterId, textbook_id: textbookId });
  } catch (err) {
    console.error('PATCH /api/admin/uploads/[id] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}
