import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface McqTaskProps {
  options: string[];
  onSubmit: (answer: string) => void;
}

const McqTask = ({ options, onSubmit }: McqTaskProps) => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedValue) {
      onSubmit(selectedValue);
    }
  };

  // Defensive check for valid options
  if (!Array.isArray(options) || options.length === 0) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
        <p className="font-bold">Component Error</p>
        <p>No options were provided for this multiple-choice question.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-lg">
      <RadioGroup onValueChange={setSelectedValue} className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <RadioGroupItem value={option} id={`option-${index}`} />
            <Label htmlFor={`option-${index}`} className="flex-1 text-base">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <Button onClick={handleSubmit} disabled={!selectedValue} className="w-full">
        Submit Answer
      </Button>
    </div>
  );
};

export default McqTask;