import Image from 'next/image';
import type { ImageBasedContent } from '@/lib/questions/types';

interface ImageBasedRendererProps {
  content: ImageBasedContent;
  correctAnswer: string;
  mediaUrls?: Record<string, string>; // role → URL (e.g. "option_1" → "https://...")
  showAnswer?: boolean;
}

export function ImageBasedRenderer({
  content,
  correctAnswer,
  mediaUrls = {},
  showAnswer = false,
}: ImageBasedRendererProps) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {content.options.map((opt) => {
        const isCorrect = opt.label === correctAnswer;
        const imageUrl = mediaUrls[`option_${opt.label}`] ?? opt.image ?? null;

        return (
          <div
            key={opt.label}
            className={`rounded-lg border overflow-hidden ${
              showAnswer && isCorrect
                ? 'border-blue-400 ring-2 ring-blue-400'
                : 'border-gray-200'
            }`}
          >
            {/* Image area */}
            <div className="relative bg-gray-50 aspect-video flex items-center justify-center">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={opt.alt_text}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              ) : (
                <div className="text-center p-3">
                  <div className="text-gray-400 text-xs">{opt.alt_text || 'No image'}</div>
                </div>
              )}
            </div>

            {/* Label footer */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold ${
                showAnswer && isCorrect
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  showAnswer && isCorrect ? 'bg-white text-blue-600' : 'bg-white text-gray-600'
                }`}
              >
                {opt.label}
              </span>
              {opt.alt_text && <span className="truncate">{opt.alt_text}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
