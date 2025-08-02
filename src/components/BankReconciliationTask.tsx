import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

interface BankReconciliationTaskProps {
  book_data: (string | number)[][];
  bank_data: (string | number)[][];
  onSubmit: (answer: string) => void;
}

const BankReconciliationTask = ({ book_data, bank_data, onSubmit }: BankReconciliationTaskProps) => {
  const [selected, setSelected] = useState<{ [key: number]: boolean }>({});
  
  // FIX: Add a defensive check to prevent crashes from malformed data.
  const isBookDataValid = Array.isArray(book_data) && book_data.length > 0 && Array.isArray(book_data[0]);
  const isBankDataValid = Array.isArray(bank_data) && bank_data.length > 0 && Array.isArray(bank_data[0]);

  if (!isBookDataValid || !isBankDataValid) {
      return <div className="text-destructive p-4 bg-destructive/10 rounded-lg"><p className="font-bold">Component Error</p><p>Invalid data was received for one or both tables, and the task could not be displayed.</p></div>;
  }

  const bookHeaders = book_data[0];
  const bookRows = book_data.slice(1);
  const bankHeaders = bank_data[0];
  const bankRows = bank_data.slice(1);

  const handleSelect = (index: number, isChecked: boolean) => {
    setSelected(prev => ({ ...prev, [index]: isChecked }));
  };

  const handleSubmit = () => {
    const selectedTransactions = bookRows.filter((_, index) => selected[index]);
    onSubmit(`Identified transactions: ${JSON.stringify(selectedTransactions)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Cash Book Records (Select items NOT on Bank Statement)</h3>
        <Table><TableHeader><TableRow>{bookHeaders.map((h, i) => <TableHead key={i}>{h}</TableHead>)}<TableHead>Select</TableHead></TableRow></TableHeader>
          <TableBody>{bookRows.map((row, rI) => <TableRow key={rI}>{row.map((cell, cI) => <TableCell key={cI}>{cell}</TableCell>)}<TableCell><Checkbox onCheckedChange={(c) => handleSelect(rI, !!c)} /></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Bank Statement</h3>
        <Table><TableHeader><TableRow>{bankHeaders.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{bankRows.map((row, rI) => <TableRow key={rI}>{row.map((cell, cI) => <TableCell key={cI}>{cell}</TableCell>)}</TableRow>)}</TableBody>
        </Table>
      </div>
      <Button onClick={handleSubmit} className="w-full">Submit Reconciliation</Button>
    </div>
  );
};

export default BankReconciliationTask;