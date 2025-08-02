import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Interview from "./pages/Interview";
import { AssessmentFlow } from "@/components/AssessmentFlow";
import { ResultsPage } from "@/components/ResultsPage"; // Import the ResultsPage component

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Router>
            <Routes>
              <Route path="/" element={<AssessmentFlow />} />
              <Route path="/interview" element={<Interview />} />
              {/* FIX: The "/reports" route now renders the ResultsPage component. */}
              <Route path="/reports" element={<ResultsPage />} />
            </Routes>
            <Toaster />
            <Sonner />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
