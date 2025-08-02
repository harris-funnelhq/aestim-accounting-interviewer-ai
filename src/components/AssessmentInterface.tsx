import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Brain, CheckCircle } from "lucide-react";

interface AssessmentInterfaceProps {
  onComplete: () => void;
}

type AssessmentState = 'speaking' | 'listening' | 'processing' | 'task' | 'complete';

const mockQuestions = [
  "Tell me about your experience with financial reporting and compliance.",
  "How would you handle a situation where you discovered a discrepancy in the accounts?",
  "Describe your proficiency with accounting software and tools.",
  "What's your approach to managing multiple deadlines during busy periods?",
  "How do you ensure accuracy in your work when dealing with large volumes of data?"
];

const mockTasks = [
  {
    title: "Excel Formula Task",
    description: "In the sheet below, please write a formula in cell C5 to calculate the total sales for the 'North' region.",
    type: "excel"
  },
  {
    title: "Financial Analysis",
    description: "Review the financial data and identify any potential issues or trends.",
    type: "analysis"
  }
];

export const AssessmentInterface = ({ onComplete }: AssessmentInterfaceProps) => {
  const [currentState, setCurrentState] = useState<AssessmentState>('speaking');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const totalSteps = mockQuestions.length + mockTasks.length;

  useEffect(() => {
    // Start the first question
    startQuestion(0);
  }, []);

  useEffect(() => {
    // Simulate audio level animation when listening
    if (currentState === 'listening') {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [currentState]);

  const startQuestion = (index: number) => {
    setCurrentState('speaking');
    setCurrentPrompt(`The AI will now ask you: "${mockQuestions[index]}"`);
    
    // Simulate AI speaking
    setTimeout(() => {
      setCurrentState('listening');
      setIsListening(true);
    }, 3000);
  };

  const handleStopListening = () => {
    setCurrentState('processing');
    setIsListening(false);
    
    // Simulate processing
    setTimeout(() => {
      const nextQuestionIndex = currentQuestionIndex + 1;
      const currentStep = nextQuestionIndex + currentTaskIndex;
      setProgress((currentStep / totalSteps) * 100);
      
      if (nextQuestionIndex < mockQuestions.length) {
        setCurrentQuestionIndex(nextQuestionIndex);
        startQuestion(nextQuestionIndex);
      } else if (currentTaskIndex < mockTasks.length) {
        setCurrentState('task');
        setCurrentPrompt("Now, let's move to a practical task.");
      } else {
        setCurrentState('complete');
        setTimeout(onComplete, 2000);
      }
    }, 2000);
  };

  const handleTaskComplete = () => {
    const nextTaskIndex = currentTaskIndex + 1;
    const currentStep = mockQuestions.length + nextTaskIndex;
    setProgress((currentStep / totalSteps) * 100);
    
    if (nextTaskIndex < mockTasks.length) {
      setCurrentTaskIndex(nextTaskIndex);
      setCurrentState('task');
    } else {
      setCurrentState('complete');
      setTimeout(onComplete, 2000);
    }
  };

  const getStateDisplay = () => {
    switch (currentState) {
      case 'speaking':
        return {
          icon: Volume2,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          title: 'AI Speaking',
          subtitle: 'Please listen to the question'
        };
      case 'listening':
        return {
          icon: Mic,
          color: 'text-assessment-listening',
          bgColor: 'bg-assessment-listening/10',
          title: 'Listening',
          subtitle: 'Please speak your answer'
        };
      case 'processing':
        return {
          icon: Brain,
          color: 'text-assessment-processing',
          bgColor: 'bg-assessment-processing/10',
          title: 'Processing',
          subtitle: 'Analyzing your response...'
        };
      case 'task':
        return {
          icon: CheckCircle,
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          title: 'Practical Task',
          subtitle: 'Complete the task below'
        };
      case 'complete':
        return {
          icon: CheckCircle,
          color: 'text-success',
          bgColor: 'bg-success/10',
          title: 'Assessment Complete',
          subtitle: 'Thank you for your participation'
        };
    }
  };

  const stateDisplay = getStateDisplay();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Progress Bar */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Assessment Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`w-24 h-24 rounded-full ${stateDisplay.bgColor} flex items-center justify-center ${
              currentState === 'listening' ? 'animate-pulse-slow' : ''
            }`}>
              <stateDisplay.icon className={`w-10 h-10 ${stateDisplay.color}`} />
            </div>
          </div>
          
          <Badge variant="outline" className="mb-4">
            {stateDisplay.title}
          </Badge>
          
          <p className="text-lg text-muted-foreground mb-2">
            {stateDisplay.subtitle}
          </p>
        </div>

        {/* Current Prompt */}
        {currentPrompt && (
          <Card className="p-6 mb-6 text-center">
            <p className="text-lg text-foreground">{currentPrompt}</p>
          </Card>
        )}

        {/* Audio Visualizer for Listening State */}
        {currentState === 'listening' && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-center gap-1 mb-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-assessment-listening rounded-full transition-all duration-150"
                  style={{
                    height: `${Math.max(8, (audioLevel / 100) * 40 + Math.random() * 16)}px`
                  }}
                />
              ))}
            </div>
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={handleStopListening}
                className="gap-2"
              >
                <MicOff className="w-4 h-4" />
                Stop Recording
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Click when you've finished answering
              </p>
            </div>
          </Card>
        )}

        {/* Task Interface */}
        {currentState === 'task' && currentTaskIndex < mockTasks.length && (
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {mockTasks[currentTaskIndex].title}
              </h3>
              <p className="text-muted-foreground">
                {mockTasks[currentTaskIndex].description}
              </p>
            </div>

            {/* Simulated Excel Interface */}
            {mockTasks[currentTaskIndex].type === 'excel' && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <div className="bg-background rounded border overflow-hidden">
                  <div className="grid grid-cols-4 text-sm">
                    <div className="bg-muted p-2 border-r border-b font-medium text-center">A</div>
                    <div className="bg-muted p-2 border-r border-b font-medium text-center">B</div>
                    <div className="bg-muted p-2 border-r border-b font-medium text-center">C</div>
                    <div className="bg-muted p-2 border-b font-medium text-center">D</div>
                    <div className="p-2 border-r border-b">Region</div>
                    <div className="p-2 border-r border-b">Product</div>
                    <div className="p-2 border-r border-b">Sales</div>
                    <div className="p-2 border-b">Quarter</div>
                    <div className="p-2 border-r border-b">North</div>
                    <div className="p-2 border-r border-b">Widget A</div>
                    <div className="p-2 border-r border-b">15000</div>
                    <div className="p-2 border-b">Q1</div>
                    <div className="p-2 border-r border-b">North</div>
                    <div className="p-2 border-r border-b">Widget B</div>
                    <div className="p-2 border-r border-b">22000</div>
                    <div className="p-2 border-b">Q1</div>
                    <div className="p-2 border-r border-b">South</div>
                    <div className="p-2 border-r border-b">Widget A</div>
                    <div className="p-2 border-r border-b">18000</div>
                    <div className="p-2 border-b">Q1</div>
                    <div className="p-2 border-r border-b">Total North:</div>
                    <div className="p-2 border-r border-b"></div>
                    <div className="p-2 border-r border-b bg-accent/10">
                      <input 
                        type="text" 
                        className="w-full bg-transparent text-sm" 
                        placeholder="Enter formula here..."
                      />
                    </div>
                    <div className="p-2 border-b"></div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <Button
                variant="assessment"
                onClick={handleTaskComplete}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Submit Task
              </Button>
            </div>
          </Card>
        )}

        {/* Completion Message */}
        {currentState === 'complete' && (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Assessment Complete!
            </h3>
            <p className="text-muted-foreground">
              Thank you for completing the assessment. Your responses have been recorded.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};