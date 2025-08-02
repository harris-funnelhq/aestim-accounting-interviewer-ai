import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentAnalysisTaskProps {
  document_text: string;
  fields: string[];
  onSubmit: (answer: string) => void;
}

const DocumentAnalysisTask = ({ document_text, fields, onSubmit }: DocumentAnalysisTaskProps) => {
  const [values, setValues] = useState<{ [key: string]: string }>({});

  const handleChange = (field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const answerString = fields.map(field => `${field}: ${values[field] || ''}`).join('; ');
    onSubmit(answerString);
  };

  const isSubmitDisabled = fields.some(field => !values[field]?.trim());

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Source Document</h3>
        <pre className="text-sm p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border whitespace-pre-wrap font-mono">{document_text}</pre>
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold">Extract Information</h3>
        {fields.map(field => (
          <div key={field} className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={field}>{field}</Label>
            <Input id={field} type="text" placeholder={`Enter ${field}`} onChange={(e) => handleChange(field, e.target.value)} />
          </div>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full">Submit Extraction</Button>
    </div>
  );
};

export default DocumentAnalysisTask;