import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DataEntryTaskProps {
  fields: string[];
  onSubmit: (answer: string) => void;
}

const DataEntryTask = ({ fields, onSubmit }: DataEntryTaskProps) => {
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
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field} className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={field}>{field}</Label>
            <Input
              id={field}
              type="text"
              placeholder={`Enter value for ${field}`}
              onChange={(e) => handleChange(field, e.target.value)}
            />
          </div>
        ))}
      </div>
      <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full">
        Submit Entry
      </Button>
    </div>
  );
};

export default DataEntryTask;