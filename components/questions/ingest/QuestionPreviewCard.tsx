'use client';

import { X, AlertCircle, CheckCircle2, ImageIcon, Upload } from 'lucide-react';
import { QuestionTypeBadge, DifficultyBadge } from '../shared/QuestionTypeBadge';
import { McqRenderer } from '../renderers/McqRenderer';
import { AssertionReasonRenderer } from '../renderers/AssertionReasonRenderer';
import { MatchingRenderer } from '../renderers/MatchingRenderer';
import { StatementRenderer } from '../renderers/StatementRenderer';
import { ImageBasedRenderer } from '../renderers/ImageBasedRenderer';
import { getImageSlotKeys } from '@/lib/questions/validation';
import type { ParsedQuestion, McqContent, AssertionReasonContent, MatchingContent, StatementContent, ImageBasedContent } from '@/lib/questions/types';

interface QuestionPreviewCardProps {
  q: ParsedQuestion;
  index: number;
  onRemove?: (index: number) => void;
  showRemove?: boolean;
  imageSlots?: Record<string, File>;
  onImageUpload?: (key: string, file: File) => void;
}

export function QuestionPreviewCard({
  q,
  index,
  onRemove,
  showRemove = false,
  imageSlots = {},
  onImageUpload,
}: QuestionPreviewCardProps) {
  const slotKeys = getImageSlotKeys(q, index);
  const hasMissingImages = slotKeys.some((k) => !imageSlots[k]);

  return (
    <div
      className={`border rounded-xl p-4 bg-white ${
        !q._valid
          ? 'border-red-200'
          : hasMissingImages
          ? 'border-yellow-200'
          : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-bold shrink-0">
            {index + 1}
          </span>
          {q.question_type && <QuestionTypeBadge type={q.question_type} short />}
          {q.metadata?.difficulty_level && (
            <DifficultyBadge level={q.metadata.difficulty_level} />
          )}
          {q.source?.exam_name && (
            <span className="text-xs text-gray-500">
              {q.source.exam_name} {q.source.year ?? ''}
            </span>
          )}
          {/* Validation status */}
          {q._valid ? (
            hasMissingImages ? (
              <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded">
                <ImageIcon className="w-3 h-3" /> Missing images
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <CheckCircle2 className="w-3 h-3" /> Valid
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              <AlertCircle className="w-3 h-3" /> Invalid
            </span>
          )}
        </div>

        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Errors */}
      {!q._valid && q._errors.length > 0 && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200">
          <ul className="space-y-0.5">
            {q._errors.map((e, i) => (
              <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question text */}
      <p className="text-sm text-gray-800 leading-relaxed mb-1">{q.question_text}</p>

      {/* Type-specific content */}
      {q.content && q.question_type && (
        <>
          {q.question_type === 'mcq' && (
            <McqRenderer
              content={q.content as McqContent}
              correctAnswer={q.correct_answer ?? ''}
            />
          )}
          {q.question_type === 'assertion_reason' && (
            <AssertionReasonRenderer
              content={q.content as AssertionReasonContent}
              correctAnswer={q.correct_answer ?? ''}
            />
          )}
          {q.question_type === 'matching' && (
            <MatchingRenderer
              content={q.content as MatchingContent}
              correctAnswer={q.correct_answer ?? ''}
            />
          )}
          {q.question_type === 'statement_based' && (
            <StatementRenderer
              content={q.content as StatementContent}
              correctAnswer={q.correct_answer ?? ''}
            />
          )}
          {q.question_type === 'image_based' && (
            <ImageBasedRenderer
              content={q.content as ImageBasedContent}
              correctAnswer={q.correct_answer ?? ''}
            />
          )}
        </>
      )}

      {/* Image slots (when in preview + upload mode) */}
      {slotKeys.length > 0 && onImageUpload && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">Image Slots</p>
          <div className="flex flex-wrap gap-2">
            {slotKeys.map((key) => {
              const file = imageSlots[key];
              const roleLabel = key.replace(`${index}_`, '').replace(/_/g, ' ');
              return (
                <label
                  key={key}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs cursor-pointer transition-colors ${
                    file
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-gray-50 border-dashed border-gray-300 text-gray-500 hover:border-blue-400'
                  }`}
                >
                  {file ? <CheckCircle2 className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                  <span className="capitalize">{roleLabel}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onImageUpload(key, f);
                    }}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
