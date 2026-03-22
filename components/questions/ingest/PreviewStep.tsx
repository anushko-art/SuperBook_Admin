'use client';

import { QuestionPreviewCard } from './QuestionPreviewCard';
import type { ParsedQuestion } from '@/lib/questions/types';

interface PreviewStepProps {
  questions: ParsedQuestion[];
  imageSlots: Record<string, File>;
  onImageUpload: (key: string, file: File) => void;
  onRemoveQuestion: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PreviewStep({
  questions,
  imageSlots,
  onImageUpload,
  onRemoveQuestion,
  onNext,
  onBack,
}: PreviewStepProps) {
  const validCount = questions.filter((q) => q._valid).length;
  const invalidCount = questions.length - validCount;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
          <div className="text-2xl font-bold text-gray-800">{questions.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
          <div className="text-2xl font-bold text-green-700">{validCount}</div>
          <div className="text-xs text-green-600 mt-0.5">Valid</div>
        </div>
        <div
          className={`p-3 rounded-lg border text-center ${
            invalidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div
            className={`text-2xl font-bold ${
              invalidCount > 0 ? 'text-red-700' : 'text-gray-400'
            }`}
          >
            {invalidCount}
          </div>
          <div
            className={`text-xs mt-0.5 ${invalidCount > 0 ? 'text-red-600' : 'text-gray-400'}`}
          >
            Invalid
          </div>
        </div>
      </div>

      {invalidCount > 0 && (
        <p className="text-xs text-gray-500">
          Invalid questions will be skipped during upload. Remove them or fix the JSON to include
          them.
        </p>
      )}

      {/* Question cards */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {questions.map((q, i) => (
          <QuestionPreviewCard
            key={i}
            q={q}
            index={i}
            showRemove
            onRemove={onRemoveQuestion}
            imageSlots={imageSlots}
            onImageUpload={onImageUpload}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          disabled={validCount === 0}
          onClick={onNext}
          className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Finalize ({validCount} questions) →
        </button>
      </div>
    </div>
  );
}
