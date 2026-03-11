import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const [stats] = await query<{
      total_textbooks: string;
      total_chapters: string;
      total_images: string;
      total_uploads: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM textbooks) AS total_textbooks,
         (SELECT COUNT(*) FROM chapters) AS total_chapters,
         (SELECT COUNT(*) FROM chapter_images) AS total_images,
         (SELECT COUNT(*) FROM uploaded_files) AS total_uploads`
    );

    const recentUploads = await query(
      `SELECT original_filename, file_type, status, created_at
       FROM uploaded_files
       ORDER BY created_at DESC
       LIMIT 5`
    );

    return NextResponse.json({
      stats: {
        textbooks: parseInt(stats.total_textbooks),
        chapters: parseInt(stats.total_chapters),
        images: parseInt(stats.total_images),
        uploads: parseInt(stats.total_uploads),
      },
      recentUploads,
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
