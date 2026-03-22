'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { questionNeedsImages, getImageSlotKeys } from '@/lib/questions/validation';
import type { ParsedQuestion, TaxonomySelection } from '@/lib/questions/types';

interface FinalizeStepProps {
  taxonomy: TaxonomySelection;
  questions: ParsedQuestion[];
  imageSlots: Record<string, File>;
  onReset: () => void;
  onGoToBank: () => void;
  onBack: () => void;
}

interface IngestResult {
  batch_id: string;
  inserted_count: number;
  error_count: number;
  errors: Array<{ index: number; message: string }>;
}

export function FinalizeStep({
  taxonomy,
  questions,
  imageSlots,
  onReset,
  onGoToBank,
  onBack,
}: FinalizeStepProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const validQuestions = questions.filter((q) => q._valid);
  const totalImages = Object.keys(imageSlots).length;

  async function handleFinalize() {
    setLoading(true);
    setFatalError(null);

    const formData = new FormData();
    formData.append('topicId', taxonomy.topicId);
    formData.append('questions', JSON.stringify(validQuestions));

    // Attach image files
    for (const [key, file] of Object.entries(imageSlots)) {
      formData.append(`image_${key}`, file);
    }

    try {
      const res = await fetch('/api/admin/questions/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setFatalError(data.error ?? 'Upload failed');
      } else {
        setResult(data);
      }
    } catch (err) {
      setFatalError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  // Success screen
  if (result) {
    return (
      <div className="space-y-5">
        <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-800">Upload Complete</h3>
          <p className="text-sm text-green-700 mt-1">
            <strong>{result.inserted_count}</strong> questions added to the bank
            {result.error_count > 0 && (
              <span className="text-orange-700">
                {' '}
                · <strong>{result.error_count}</strong> skipped
              </span>
            )}
          </p>
          <p className="text-xs text-green-600 mt-1">Batch ID: {result.batch_id}</p>
        </div>

        {result.errors.length > 0 && (
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs font-semibold text-orange-700 mb-2">Skipped questions:</p>
            <ul className="space-y-1">
              {result.errors.map((e) => (
                <li key={e.index} className="text-xs text-orange-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  Q{e.index + 1}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" /> Upload Another Batch
          </button>
          <button
            onClick={onGoToBank}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            View in Bank <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 mb-0.5">Target Topic</div>
          <div className="text-sm font-semibold text-gray-800 truncate">{taxonomy.label}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 mb-0.5">Questions to Upload</div>
          <div className="text-sm font-semibold text-gray-800">{validQuestions.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 mb-0.5">Image Files</div>
          <div className="text-sm font-semibold text-gray-800">{totalImages}</div>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-xs text-gray-500 mb-0.5">Skipped (invalid)</div>
          <div className="text-sm font-semibold text-gray-800">
            {questions.length - validQuestions.length}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Taxonomy in the JSON will be <strong>overwritten</strong> with the selected topic. This
        action cannot be undone (though questions can be deactivated later).
      </p>

      {fatalError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {fatalError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleFinalize}
          disabled={loading || validQuestions.length === 0}
          className="ml-auto flex items-center gap-2 px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>Upload {validQuestions.length} Questions</>
          )}
        </button>
      </div>
    </div>
  );
}
