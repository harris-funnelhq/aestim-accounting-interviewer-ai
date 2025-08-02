import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { WelcomePage } from "./WelcomePage";
import { SystemCheckPage } from "./SystemCheckPage";

type AssessmentStep = 'welcome' | 'system-check' | 'redirecting';

export const AssessmentFlow = () => {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('welcome');
  const navigate = useNavigate();

  // This effect handles the redirection once the assessment is ready to start.
  useEffect(() => {
    if (currentStep === 'redirecting') {
      navigate('/interview');
    }
  }, [currentStep, navigate]);

  const handleGetStarted = () => {
    setCurrentStep('system-check');
  };

  const handleStartAssessment = () => {
    // Set the step to 'redirecting' to trigger the useEffect hook.
    setCurrentStep('redirecting');
  };

  switch (currentStep) {
    case 'welcome':
      return <WelcomePage onGetStarted={handleGetStarted} />;
    
    case 'system-check':
      return <SystemCheckPage onStartAssessment={handleStartAssessment} />;
    
    case 'redirecting':
      // Show a loading message while the redirect happens.
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900">
          <p className="text-lg text-slate-600 dark:text-slate-300">Redirecting to assessment...</p>
        </div>
      );
    
    default:
      return <WelcomePage onGetStarted={handleGetStarted} />;
  }
};