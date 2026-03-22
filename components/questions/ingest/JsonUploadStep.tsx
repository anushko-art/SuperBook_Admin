'use client';

import { useState, useRef } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseQuestionsJson } from '@/lib/questions/validation';
import type { ParsedQuestion, TaxonomySelection } from '@/lib/questions/types';

interface JsonUploadStepProps {
  taxonomy: TaxonomySelection;
  onParsed: (questions: ParsedQuestion[]) => void;
  onBack: () => void;
}

export function JsonUploadStep({ taxonomy, onParsed, onBack }: JsonUploadStepProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<{
    total: number;
    valid: number;
    invalid: number;
  } | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonInput(ev.target?.result as string);
      setParseError(null);
      setParseResult(null);
      setParsedQuestions(null);
    };
    reader.readAsText(file);
  }

  function handleValidate() {
    setParseError(null);
    setParseResult(null);
    setParsedQuestions(null);

    if (!jsonInput.trim()) {
      setParseError('Please paste JSON or upload a file');
      return;
    }

    const { questions, fatalError } = parseQuestionsJson(jsonInput);

    if (fatalError) {
      setParseError(fatalError);
      return;
    }

    const valid = questions.filter((q) => q._valid).length;
    const invalid = questions.length - valid;

    setParseResult({ total: questions.length, valid, invalid });
    setParsedQuestions(questions);
  }

  function handleNext() {
    if (parsedQuestions) {
      onParsed(parsedQuestions);
    }
  }

  const canProceed = parsedQuestions !== null && parsedQuestions.some((q) => q._valid);

  return (
    <div className="space-y-4">
      {/* Taxonomy breadcrumb */}
      <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
        Linked to: <strong>{taxonomy.label}</strong>
      </div>

      {/* File upload */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Upload JSON File
        </label>
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileJson className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Click to upload a .json file</p>
          <p className="text-xs text-gray-400 mt-1">or paste directly below</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Paste textarea */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
          Or Paste JSON
        </label>
        <textarea
          className="w-full h-40 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder={'[\n  {\n    "question_type": "mcq",\n    ...\n  }\n]'}
          value={jsonInput}
          onChange={(e) => {
            setJsonInput(e.target.value);
            setParseError(null);
            setParseResult(null);
            setParsedQuestions(null);
          }}
        />
      </div>

      {/* Errors */}
      {parseError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Parse result */}
      {parseResult && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-green-800">
            Parsed <strong>{parseResult.total}</strong> questions:{' '}
            <strong className="text-green-700">{parseResult.valid} valid</strong>
            {parseResult.invalid > 0 && (
              <>, <strong className="text-red-600">{parseResult.invalid} invalid</strong></>
            )}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleValidate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          <Upload className="w-4 h-4" />
          Validate JSON
        </button>
        {canProceed && (
          <button
            onClick={handleNext}
            className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
