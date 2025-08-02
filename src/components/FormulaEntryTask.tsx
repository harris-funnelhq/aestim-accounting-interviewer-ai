import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// NEW: Interface is now more flexible to catch AI errors.
interface FormulaEntryTaskProps {
  data?: (string | number)[][];
  variables?: { name: string; value: string | number }[];
  formula?: string;
  formula_description?: string; // Catches the new error case
  onSubmit: (answer: string) => void;
}

const FormulaEntryTask = ({ data, variables, formula, formula_description, onSubmit }: FormulaEntryTaskProps) => {
  const [inputValue, setInputValue] = useState("");

  const hasVariableData = Array.isArray(variables) && variables.length > 0;
  const hasFormulaString = typeof formula === 'string' && formula.length > 0;
  const hasFormulaDescription = typeof formula_description === 'string' && formula_description.length > 0;

  // DEFINITIVE CHECK: If the AI provides variables, it's asking for a calculation,
  // regardless of the taskType it sent. We will treat it as a value entry task.
  const isActuallyValueEntry = hasVariableData;

  // Show an error only if there is absolutely no renderable content.
  if (!data && !variables && !formula && !formula_description) {
    return (
        <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
            <p className="font-bold">Component Error</p>
            <p>Invalid data was received for this task, and the content could not be displayed.</p>
        </div>
    );
  }

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue);
      setInputValue("");
    }
  };

  const renderContent = () => {
    // If it's a value entry task disguised as a formula entry, render it correctly.
    if (isActuallyValueEntry) {
      return (
        <div className="space-y-3">
          {(hasFormulaString || hasFormulaDescription) && (
            <>
              <p className="text-sm font-semibold">Formula:</p>
              <p className="font-mono bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded text-sm">
                {formula || formula_description}
              </p>
            </>
          )}
          <p className="text-sm font-semibold pt-2">Variables:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {variables!.map((variable, index) => (
              <li key={index}>
                <span className="font-semibold capitalize">{variable.name.replace(/_/g, ' ')}:</span>
                <span className="ml-2 font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{variable.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Fallback for a simple formula string display
    if (hasFormulaString) {
        return <p className="font-mono bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded text-sm">{formula}</p>;
    }
    
    return null; // Should not be reached if validation is correct
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        {renderContent()}
      </div>
      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          placeholder={isActuallyValueEntry ? "Enter the calculated value" : "=YourFormula(...)"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button onClick={handleSubmit} disabled={!inputValue.trim()}>Submit</Button>
      </div>
    </div>
  );
};

export default FormulaEntryTask;