'use client';

import * as React from 'react';
import { GripVertical } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { cn } from '@/lib/utils';

const ResizablePanelGroup = ({
  className,
  orientation,
  ...props
}: React.ComponentProps<typeof Group>) => (
  <Group
    orientation={orientation}
    className={cn(
      'flex h-full w-full',
      orientation === 'vertical' ? 'flex-col' : 'flex-row',
      className
    )}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      'relative flex w-1 shrink-0 items-center justify-center bg-[hsl(var(--border))] cursor-col-resize hover:bg-[hsl(var(--primary)/0.4)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--ring))]',
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <GripVertical className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
