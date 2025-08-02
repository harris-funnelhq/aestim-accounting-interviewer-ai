import React from 'react';
import LongTextTask from './LongTextTask';
import MCQTask from './MCQTask';
import SJTTask from './SJTTask';
import DataEntryTask from './DataEntryTask';
import FormulaEntryTask from './FormulaEntryTask'; // Correct: Uses the renamed component
import ValueEntryTask from './ValueEntryTask';
import { AlertTriangle } from 'lucide-react';

interface InteractiveQuestionPanelProps {
  task: any;
  onSubmit: (answer: string) => void;
}

export const InteractiveQuestionPanel = ({ task, onSubmit }: InteractiveQuestionPanelProps) => {
  if (!task || !task.taskType) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-lg flex items-center space-x-3">
        <AlertTriangle className="w-6 h-6" />
        <div>
          <p className="font-bold">Task Error</p>
          <p>The interactive task data is missing or malformed.</p>
        </div>
      </div>
    );
  }

  switch (task.taskType) {
    case 'long_text':
      return <LongTextTask description={task.description} />;
    // FIX: Handle both the old 'spreadsheet' and new 'formula_entry' task types.
    case 'spreadsheet':
    case 'formula_entry':
      return <FormulaEntryTask {...task} onSubmit={onSubmit} />;
    case 'value_entry':
      return <ValueEntryTask {...task} onSubmit={onSubmit} />;
    case 'mcq':
    case 'tally_voucher_selection': // Reuse MCQ component for Tally selection
      return <MCQTask {...task} onSubmit={onSubmit} />;
    case 'data_entry':
      return <DataEntryTask fields={task.fields} onSubmit={onSubmit} />;
    case 'sjt':
      return <SJTTask {...task} onSubmit={onSubmit} />;
    default:
      return (
        <div className="text-yellow-700 dark:text-yellow-300 p-4 bg-yellow-500/10 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <p className="font-bold">Unsupported Task Type</p>
            <p>The AI returned a task type that is not yet supported: "{task.taskType}"</p>
          </div>
        </div>
      );
  }
};