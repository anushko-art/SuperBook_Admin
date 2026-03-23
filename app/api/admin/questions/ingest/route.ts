export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  getTopicById,
  createBatch,
  insertQuestion,
  insertQuestionMedia,
  finalizeBatch,
} from '@/lib/questions/api';
import { storeQuestionMedia } from '@/lib/questions/storage';
import { validateQuestion } from '@/lib/questions/validation';
import { createClient } from '@/lib/supabase/server';
import type { ParsedQuestion, Question } from '@/lib/questions/types';

interface IngestError {
  index: number;
  message: string;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Parse questions JSON
    const questionsRaw = formData.get('questions');
    if (!questionsRaw || typeof questionsRaw !== 'string') {
      return NextResponse.json({ error: 'questions field is required' }, { status: 400 });
    }

    const topicId = formData.get('topicId');
    if (!topicId || typeof topicId !== 'string') {
      return NextResponse.json({ error: 'topicId field is required' }, { status: 400 });
    }

    // Get the authenticated user's ID from the session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const uploadedBy: string | null = user?.id ?? null;

    let questions: ParsedQuestion[];
    try {
      questions = JSON.parse(questionsRaw);
    } catch {
      return NextResponse.json({ error: 'Invalid questions JSON' }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions must be a non-empty array' }, { status: 400 });
    }

    // Resolve taxonomy from DB (overwrites whatever is in the JSON)
    const taxonomy = await getTopicById(topicId);
    if (!taxonomy) {
      return NextResponse.json({ error: 'topicId not found' }, { status: 404 });
    }

    // Create batch record
    const batchId = await createBatch(topicId, uploadedBy, questions.length);

    let insertedCount = 0;
    const errors: IngestError[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Re-validate server-side
      const { valid, errors: validationErrors } = validateQuestion(q, i);
      if (!valid) {
        errors.push({ index: i, message: validationErrors.join('; ') });
        continue;
      }

      try {
        // Determine has_image
        const hasImage =
          q.question_type === 'image_based' ||
          !!q.question_image ||
          !!(q.media && q.media.length > 0);

        // Build question row (taxonomy comes from DB, not JSON)
        const questionRow: Omit<Question, 'id' | 'created_at' | 'updated_at'> = {
          question_type: q.question_type!,
          topic_id: taxonomy.topic_id,
          chapter_id: taxonomy.chapter_id,
          textbook_id: taxonomy.textbook_id,
          question_text: q.question_text!,
          question_image_url: null, // set after image upload
          solution_image_url: null, // set after image upload
          content: q.content!,
          correct_answer: q.correct_answer!,
          correct_answer_detail: q.correct_answer_detail ?? null,
          solution: q.solution ?? null,
          scaffolding: q.scaffolding ?? null,
          // Denormalized from DB
          subject: taxonomy.subject,
          class: taxonomy.class,
          chapter_name: taxonomy.chapter_name,
          topic_name: taxonomy.topic_name,
          // PYQ source
          exam_name: q.source?.exam_name ?? null,
          exam_year: q.source?.year ?? null,
          exam_shift: q.source?.shift ?? null,
          // Metadata
          difficulty_level: q.metadata?.difficulty_level ?? 'Medium',
          keywords: q.metadata?.keywords ?? [],
          concept_tags: q.metadata?.concept_tags ?? [],
          has_image: hasImage,
          uploaded_by: uploadedBy,
          batch_id: batchId,
          is_active: true,
          media: undefined,
        };

        // Handle question stem image
        const stemImageKey = `image_${i}_question_image`;
        const stemFile = formData.get(stemImageKey) as File | null;
        if (stemFile) {
          const buffer = Buffer.from(await stemFile.arrayBuffer());
          const url = await storeQuestionMedia(buffer, batchId, i, 'question_image', stemFile.name);
          questionRow.question_image_url = url;
        }

        // Handle solution image
        const solutionImageKey = `image_${i}_solution_image`;
        const solutionFile = formData.get(solutionImageKey) as File | null;
        if (solutionFile) {
          const buffer = Buffer.from(await solutionFile.arrayBuffer());
          const url = await storeQuestionMedia(buffer, batchId, i, 'solution_image', solutionFile.name);
          questionRow.solution_image_url = url;
        }

        // Insert question
        const questionId = await insertQuestion(questionRow);

        // Handle option images (for image_based questions)
        const mediaEntries: Array<{ role: string; url: string; altText: string | null; mimeType: string }> = [];

        if (q.question_type === 'image_based' && q.content) {
          const imgContent = q.content as { options?: Array<{ label: string; alt_text?: string }> };
          if (imgContent.options) {
            for (const opt of imgContent.options) {
              const fileKey = `image_${i}_option_${opt.label}`;
              const file = formData.get(fileKey) as File | null;
              if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const role = `option_${opt.label}`;
                const url = await storeQuestionMedia(buffer, batchId, i, role, file.name);
                mediaEntries.push({
                  role,
                  url,
                  altText: opt.alt_text ?? null,
                  mimeType: file.type || 'image/png',
                });
              }
            }
          }
        }

        // Insert media rows
        for (const entry of mediaEntries) {
          await insertQuestionMedia(questionId, entry.role, entry.url, entry.altText, entry.mimeType);
        }

        // Insert question_image media row if stem uploaded
        if (stemFile && questionRow.question_image_url) {
          await insertQuestionMedia(
            questionId,
            'question_image',
            questionRow.question_image_url,
            null,
            stemFile.type || 'image/png'
          );
        }

        // Insert solution_image media row if uploaded
        if (solutionFile && questionRow.solution_image_url) {
          await insertQuestionMedia(
            questionId,
            'solution_image',
            questionRow.solution_image_url,
            null,
            solutionFile.type || 'image/png'
          );
        }

        insertedCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ index: i, message });
      }
    }

    await finalizeBatch(batchId, insertedCount, errors.length, errors);

    return NextResponse.json({
      batch_id: batchId,
      inserted_count: insertedCount,
      error_count: errors.length,
      errors,
    });
  } catch (err) {
    console.error('POST /api/admin/questions/ingest error:', err);
    return NextResponse.json({ error: 'Server error during ingestion' }, { status: 500 });
  }
}
