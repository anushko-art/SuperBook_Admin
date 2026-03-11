'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MisconceptionAlertProps {
  misconception: string;
}

export function MisconceptionAlert({ misconception }: MisconceptionAlertProps) {
  return (
    <Alert variant="destructive" className="py-2.5">
      <AlertCircle className="h-3.5 w-3.5" />
      <AlertDescription className="text-xs leading-relaxed">
        <span className="font-semibold">Common Misconception: </span>
        {misconception}
      </AlertDescription>
    </Alert>
  );
}
