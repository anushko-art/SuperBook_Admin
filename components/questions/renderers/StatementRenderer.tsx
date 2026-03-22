import type { StatementContent } from '@/lib/questions/types';

interface StatementRendererProps {
  content: StatementContent;
  correctAnswer: string;
  showAnswer?: boolean;
}

export function StatementRenderer({
  content,
  correctAnswer,
  showAnswer = false,
}: StatementRendererProps) {
  return (
    <div className="mt-3 space-y-3">
      {/* Statements list */}
      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 space-y-2">
        <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Statements</p>
        {content.statements.map((stmt) => (
          <div key={stmt.label} className="flex items-start gap-2 text-sm text-gray-800">
            <span className="font-bold text-orange-700 shrink-0">{stmt.label}.</span>
            <span className="leading-relaxed">{stmt.text}</span>
          </div>
        ))}
      </div>

      {/* Options */}
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
