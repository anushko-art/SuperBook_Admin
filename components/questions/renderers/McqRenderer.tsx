import type { McqContent } from '@/lib/questions/types';

interface McqRendererProps {
  content: McqContent;
  correctAnswer: string;
  showAnswer?: boolean;
}

export function McqRenderer({ content, correctAnswer, showAnswer = false }: McqRendererProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
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
  );
}
