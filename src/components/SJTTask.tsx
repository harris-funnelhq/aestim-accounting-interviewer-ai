import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SjtTaskProps {
  options: string[];
  fields: string[];
  onSubmit: (answer: string) => void;
}

const SjtTask = ({ options, fields, onSubmit }: SjtTaskProps) => {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  const handleSelectChange = (field: string, value: string) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: string, value: string) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const formattedAnswer = fields.map(field => `${field}: ${answers[field] || 'N/A'}`).join(', ');
    onSubmit(formattedAnswer);
  };

  const isSubmitDisabled = fields.some(field => !answers[field]);

  // Defensive checks
  if (!Array.isArray(fields) || fields.length === 0) {
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-lg">
        <p className="font-bold">Component Error</p>
        <p>No fields were provided for this situational judgment task.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-lg p-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
      {fields.map((field, index) => (
        <div key={index} className="space-y-2">
          <Label htmlFor={`field-${index}`} className="font-semibold">{field}</Label>
          {Array.isArray(options) && options.length > 0 ? (
            <Select onValueChange={(value) => handleSelectChange(field, value)}>
              <SelectTrigger id={`field-${index}`}>
                <SelectValue placeholder={`Select ${field}...`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, optIndex) => (
                  <SelectItem key={optIndex} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`field-${index}`}
              placeholder={`Enter ${field}...`}
              onChange={(e) => handleInputChange(field, e.target.value)}
            />
          )}
        </div>
      ))}
      <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full">
        Submit Answer
      </Button>
    </div>
  );
};

export default SjtTask;