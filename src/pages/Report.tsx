import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Report = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle>Assessment Report</CardTitle>
          <CardDescription>Report generation is in progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is where the post-assessment report will be displayed.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;