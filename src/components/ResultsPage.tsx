import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, LoaderCircle, Lightbulb, TrendingDown, MessageSquareQuote, ThumbsUp, ThumbsDown } from "lucide-react";

// --- NEW, ROBUST DATA INTERFACES ---
// These interfaces are designed to handle multiple data formats from the backend.
interface Competency {
  // New format fields
  skill?: string;
  strength?: string;
  weakness?: string;
  // Old format fields
  name?: string;
  evaluation?: string;
  // Common field
  score: number | string; // Can be a number or "N/A"
}

interface EvaluationData {
  overall_summary: string;
  competencies: Competency[];
  // Can be a simple string or a detailed object
  hireability_recommendation: string | {
    decision: string;
    reasoning: string;
  };
  // Can be a single string or an array of strings
  suggested_next_steps: string | string[];
}

interface ResultsPageProps {
  candidateName?: string;
  companyName?: string;
}

// --- Helper Components ---
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle text-center p-6">
    <LoaderCircle className="w-16 h-16 text-primary animate-spin mb-6" />
    <h1 className="text-3xl font-bold text-foreground mb-3">Synthesizing Specialist Reports...</h1>
    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
      Our Master Evaluator AI is analyzing reports to build your detailed competency profile.
    </p>
  </div>
);

const ErrorState = ({ message, onGoBack }: { message: string, onGoBack: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle text-center p-6">
    <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
    <h1 className="text-3xl font-bold text-foreground mb-3">An Error Occurred</h1>
    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
      We couldn't generate your report. Error: {message}
    </p>
    <Button onClick={onGoBack}>Start New Interview</Button>
  </div>
);

// --- Main Component (Rewritten for Robustness) ---
export const ResultsPage = ({
  candidateName = "Alex",
  companyName = "TechCorp Solutions"
}: ResultsPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const history = location.state?.history;

    if (!history || history.length <= 1) {
      setError("No interview history found. Please complete an interview first.");
      setIsLoading(false);
      return;
    }

    const backendUrl = import.meta.env.VITE_LLM_BACKEND_URL;
    if (!backendUrl) {
      setError("Backend URL is not configured.");
      setIsLoading(false);
      return;
    }
    
    const resultsUrl = `${backendUrl}/results`;

    try {
      const response = await fetch(resultsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'An unknown error occurred.');
      setEvaluation(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    fetchEvaluation();
  }, [fetchEvaluation]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onGoBack={() => navigate('/')} />;
  if (!evaluation || !evaluation.competencies) {
    return <ErrorState message="Received incomplete evaluation data from the server." onGoBack={() => navigate('/')} />;
  }

  // --- NEW: Normalize data to handle different formats ---
  const { overall_summary, competencies, hireability_recommendation, suggested_next_steps } = evaluation;

  const hireability = typeof hireability_recommendation === 'string'
    ? { decision: hireability_recommendation, reasoning: '' }
    : hireability_recommendation;

  const nextSteps = typeof suggested_next_steps === 'string'
    ? [suggested_next_steps] // Always treat as an array for easier rendering
    : suggested_next_steps || [];

  const getBadgeClass = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return "bg-red-100 text-red-800 border-red-300";
    if (lowerDecision.includes("reservations")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (lowerDecision.includes("recommend")) return "bg-green-100 text-green-800 border-green-300";
    return "bg-slate-100 text-slate-800 border-slate-300";
  };

  const getIcon = (decision: string) => {
    const lowerDecision = decision.toLowerCase();
    if (lowerDecision.includes("not recommend")) return <TrendingDown className="w-5 h-5 text-red-600" />;
    if (lowerDecision.includes("reservations")) return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    if (lowerDecision.includes("recommend")) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 sm:p-8">
      <main className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Candidate Evaluation Report</h1>
          <p className="text-lg text-muted-foreground">For: {candidateName} | Company: {companyName}</p>
        </header>

        <Card className="p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center">
            <MessageSquareQuote className="w-6 h-6 mr-3 text-primary" />
            Overall Summary
          </h2>
          <p className="text-foreground/80 leading-relaxed">{overall_summary}</p>
        </Card>

        <Card className="p-6 mb-8 shadow-lg">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Hireability Recommendation</h2>
          <div className="flex items-start space-x-4">
            {getIcon(hireability.decision)}
            <div>
              <Badge variant="outline" className={`text-base font-semibold ${getBadgeClass(hireability.decision)}`}>
                {hireability.decision}
              </Badge>
              {hireability.reasoning && <p className="text-foreground/80 mt-2">{hireability.reasoning}</p>}
            </div>
          </div>
        </Card>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="p-6 shadow-lg">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Core Competencies</h2>
            <div className="space-y-6">
              {competencies.map((comp, index) => {
                const name = comp.skill || comp.name || 'Unnamed Competency';
                const scoreNum = typeof comp.score === 'number' ? comp.score : 0;
                const scoreDisplay = typeof comp.score === 'number' ? `${scoreNum}/10` : 'N/A';

                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-lg font-medium text-foreground">{name}</h3>
                      <span className="font-semibold text-primary">{scoreDisplay}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: `${scoreNum * 10}%` }}></div>
                    </div>
                    {comp.evaluation && <p className="text-sm text-muted-foreground mt-2">{comp.evaluation}</p>}
                    {comp.strength && comp.strength !== "N/A" && (
                      <div className="mt-2 flex items-start text-sm">
                        <ThumbsUp className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                        <p className="text-muted-foreground"><span className="font-semibold text-foreground/90">Strength:</span> {comp.strength}</p>
                      </div>
                    )}
                    {comp.weakness && (
                      <div className="mt-1 flex items-start text-sm">
                        <ThumbsDown className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                        <p className="text-muted-foreground"><span className="font-semibold text-foreground/90">Weakness:</span> {comp.weakness}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 shadow-lg">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Suggested Next Steps</h2>
            <ul className="space-y-3">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span className="text-foreground/80">{step}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </main>
    </div>
  );
};