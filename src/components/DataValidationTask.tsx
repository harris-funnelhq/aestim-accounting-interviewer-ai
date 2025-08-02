import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface DataValidationTaskProps {
  data: (string | number)[][];
  onSubmit: (answer: string) => void;
}

const DataValidationTask = ({ data, onSubmit }: DataValidationTaskProps) => {
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  // FIX: Add a defensive check to prevent crashes from malformed data.
  const isValidData = Array.isArray(data) && data.length > 0 && Array.isArray(data[0]);
  if (!isValidData) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-lg"><p className="font-bold">Component Error</p><p>Invalid data was received for this task, and the table could not be displayed.</p></div>;
  }

  const headers = data[0];
  const rows = data.slice(1);

  const handleSubmit = () => {
    if (selectedRow) {
      onSubmit(`Identified row: ${selectedRow}`);
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup onValueChange={setSelectedRow}>
        <Table>
          <TableHeader><TableRow>{headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}<TableHead className="w-[50px]">Select</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                <TableCell><RadioGroupItem value={JSON.stringify(row)} id={`row-${rowIndex}`} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </RadioGroup>
      <Button onClick={handleSubmit} disabled={!selectedRow} className="w-full">Submit Selection</Button>
    </div>
  );
};

export default DataValidationTask;