import type { MatchingContent } from '@/lib/questions/types';

interface MatchingRendererProps {
  content: MatchingContent;
  correctAnswer: string;
  correctAnswerDetail?: Record<string, string> | null;
  showAnswer?: boolean;
}

export function MatchingRenderer({
  content,
  correctAnswer,
  correctAnswerDetail,
  showAnswer = false,
}: MatchingRendererProps) {
  return (
    <div className="mt-3 space-y-3">
      {/* Two-column table */}
      <div className="grid grid-cols-2 gap-2 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-emerald-50 p-2">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1.5">
            Column A
          </p>
          <div className="space-y-1">
            {content.column_a.map((item) => (
              <div key={item.label} className="flex items-start gap-1.5 text-sm text-gray-700">
                <span className="font-semibold shrink-0">{item.label}.</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-teal-50 p-2 border-l border-gray-200">
          <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1.5">
            Column B
          </p>
          <div className="space-y-1">
            {content.column_b.map((item) => (
              <div key={item.label} className="flex items-start gap-1.5 text-sm text-gray-700">
                <span className="font-semibold shrink-0">{item.label}.</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Correct mapping (when shown) */}
      {showAnswer && correctAnswerDetail && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-bold text-blue-700 mb-1.5">Correct Mapping</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(correctAnswerDetail).map(([a, b]) => (
              <span
                key={a}
                className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded"
              >
                {a} → {b}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MCQ-style answer options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {content.options.map((opt) => {
          const isCorrect = opt.label === correctAnswer;
          return (
            <div
              key={opt.label}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${
                showAnswer && isCorrect
                  ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  showAnswer && isCorrect
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt.label}
              </span>
              <span className="leading-relaxed">{opt.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
