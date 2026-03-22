import type { AssertionReasonContent } from '@/lib/questions/types';

interface AssertionReasonRendererProps {
  content: AssertionReasonContent;
  correctAnswer: string;
  showAnswer?: boolean;
}

export function AssertionReasonRenderer({
  content,
  correctAnswer,
  showAnswer = false,
}: AssertionReasonRendererProps) {
  return (
    <div className="mt-3 space-y-3">
      {/* Assertion block */}
      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
        <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
          Assertion (A)
        </span>
        <p className="mt-1 text-sm text-gray-800">{content.assertion}</p>
      </div>

      {/* Reason block */}
      <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
          Reason (R)
        </span>
        <p className="mt-1 text-sm text-gray-800">{content.reason}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
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
