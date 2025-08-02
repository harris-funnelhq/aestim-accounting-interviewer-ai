import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ValueEntryTaskProps {
  data: (string | number)[][];
  onSubmit: (answer: string) => void;
}

const ValueEntryTask = ({ data, onSubmit }: ValueEntryTaskProps) => {
  const [inputValue, setInputValue] = useState("");

  // FIX: Add a defensive check to prevent crashes from malformed data.
  const isValidData = Array.isArray(data) && data.length > 0 && Array.isArray(data[0]);
  if (!isValidData) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-lg"><p className="font-bold">Component Error</p><p>Invalid data was received for this task, and the table could not be displayed.</p></div>;
  }

  const headers = data[0];
  const rows = data.slice(1);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <Table>
          <TableHeader><TableRow>{headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{rows.map((row, rI) => <TableRow key={rI}>{row.map((cell, cI) => <TableCell key={cI}>{cell}</TableCell>)}</TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="flex w-full items-center space-x-2">
        <Input type="text" placeholder="Enter your calculated value..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSubmit()} />
        <Button onClick={handleSubmit} disabled={!inputValue.trim()}>Submit</Button>
      </div>
    </div>
  );
};

export default ValueEntryTask;