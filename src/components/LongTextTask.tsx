import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface LongTextTaskProps {
  description: string;
  // The onSubmit prop is removed as there is no button to trigger it.
}

const LongTextTask = ({ description }: LongTextTaskProps) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-6 h-full">
      <ScrollArea className="flex-grow pr-4">
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
          {description}
        </p>
      </ScrollArea>
      {/* The "Continue" button has been removed to streamline the user flow. */}
    </div>
  );
};

export default LongTextTask;