'use client';

import { ImageIcon, Upload, CheckCircle2 } from 'lucide-react';
import { questionNeedsImages, getImageSlotKeys } from '@/lib/questions/validation';
import type { ParsedQuestion } from '@/lib/questions/types';

interface ImageUploadStepProps {
  questions: ParsedQuestion[];
  imageSlots: Record<string, File>;
  onImageUpload: (key: string, file: File) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ImageUploadStep({
  questions,
  imageSlots,
  onImageUpload,
  onNext,
  onBack,
}: ImageUploadStepProps) {
  const imageQuestions = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => questionNeedsImages(q));

  if (imageQuestions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="p-6 rounded-lg bg-gray-50 border border-gray-200 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-700 font-medium">No image uploads required</p>
          <p className="text-xs text-gray-500 mt-1">
            None of your questions reference images.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Upload images for questions that require them. Each slot is named by its role.
      </p>

      {imageQuestions.map(({ q, i }) => {
        const slotKeys = getImageSlotKeys(q, i);
        return (
          <div key={i} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 line-clamp-2 font-medium">{q.question_text}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slotKeys.map((key) => {
                const uploaded = imageSlots[key];
                const roleLabel = key.replace(`${i}_`, '').replace(/_/g, ' ');

                return (
                  <label
                    key={key}
                    className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer text-center transition-colors ${
                      uploaded
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {uploaded ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-xs text-green-700 font-medium truncate w-full text-center">
                          {uploaded.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-500 capitalize">{roleLabel}</span>
                        <Upload className="w-3 h-3 text-gray-400" />
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImageUpload(key, file);
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Preview →
        </button>
      </div>
    </div>
  );
}
