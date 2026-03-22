'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from '@/components/questions/ingest/StepIndicator';
import { TaxonomySelector } from '@/components/questions/ingest/TaxonomySelector';
import { JsonUploadStep } from '@/components/questions/ingest/JsonUploadStep';
import { ImageUploadStep } from '@/components/questions/ingest/ImageUploadStep';
import { PreviewStep } from '@/components/questions/ingest/PreviewStep';
import { FinalizeStep } from '@/components/questions/ingest/FinalizeStep';
import type { ParsedQuestion, TaxonomySelection } from '@/lib/questions/types';

const STEPS = ['Taxonomy', 'Upload JSON', 'Images', 'Preview', 'Finalize'];

export default function QuestionIngestPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [taxonomy, setTaxonomy] = useState<TaxonomySelection | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [imageSlots, setImageSlots] = useState<Record<string, File>>({});

  const handleReset = useCallback(() => {
    setStep(1);
    setTaxonomy(null);
    setParsedQuestions([]);
    setImageSlots({});
  }, []);

  const handleImageUpload = useCallback((key: string, file: File) => {
    setImageSlots((prev) => ({ ...prev, [key]: file }));
  }, []);

  const handleRemoveQuestion = useCallback((index: number) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ingest Questions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a batch of questions to the question bank.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={step} steps={STEPS} />

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Step 1: Select Taxonomy</h2>
            <TaxonomySelector
              onComplete={(selection) => {
                setTaxonomy(selection);
                setStep(2);
              }}
            />
            {/* Step 1 has no back button — it's the first step */}
          </div>
        )}

        {step === 2 && taxonomy && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Step 2: Upload JSON</h2>
            <JsonUploadStep
              taxonomy={taxonomy}
              onParsed={(questions) => {
                setParsedQuestions(questions);
                // Skip image step if no image questions
                const hasImages = questions.some(
                  (q) => q.question_type === 'image_based' || !!q.question_image
                );
                setStep(hasImages ? 3 : 4);
              }}
              onBack={() => setStep(1)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Step 3: Upload Images</h2>
            <ImageUploadStep
              questions={parsedQuestions}
              imageSlots={imageSlots}
              onImageUpload={handleImageUpload}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Step 4: Preview & Review</h2>
            <PreviewStep
              questions={parsedQuestions}
              imageSlots={imageSlots}
              onImageUpload={handleImageUpload}
              onRemoveQuestion={handleRemoveQuestion}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          </div>
        )}

        {step === 5 && taxonomy && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Step 5: Finalize Upload</h2>
            <FinalizeStep
              taxonomy={taxonomy}
              questions={parsedQuestions}
              imageSlots={imageSlots}
              onReset={handleReset}
              onGoToBank={() => router.push('/admin/questions')}
              onBack={() => setStep(4)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
