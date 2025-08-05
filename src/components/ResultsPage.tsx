import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, LoaderCircle, Lightbulb, TrendingDown, MessageSquareQuote, RotateCcw, Clock, Zap } from "lucide-react";

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

// --- Radar Chart Component ---
const SkillsRadarChart = ({ competencies }: { competencies: Competency[] }) => {
  const size = 500; // Increased size for better label visibility
  const center = size / 2;
  const radius = 160; // Increased radius
  const innerRadius = 40;
  
  // Ensure we have exactly 9 skills for the nonagon, pad with empty if needed
  const skills = [...competencies];
  while (skills.length < 9) {
    skills.push({ skill: '', score: 0 });
  }
  
  // Take only first 9 skills
  const displaySkills = skills.slice(0, 9);
  
  // Calculate points for nonagon (9 sides)
  const getPointOnCircle = (index: number, radius: number) => {
    const angle = (index * 2 * Math.PI) / 9 - Math.PI / 2; // Start from top
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y, angle };
  };
  
  // Generate grid levels (concentric nonagons)
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPaths = gridLevels.map(level => {
    const points = Array.from({ length: 9 }, (_, i) => {
      const point = getPointOnCircle(i, (radius * level) / 100);
      return `${point.x},${point.y}`;
    });
    return `M${points.join('L')}Z`;
  });
  
  // Generate axis lines
  const axisLines = Array.from({ length: 9 }, (_, i) => {
    const outerPoint = getPointOnCircle(i, radius);
    return {
      x1: center,
      y1: center,
      x2: outerPoint.x,
      y2: outerPoint.y
    };
  });
  
  // Generate data polygon
  const dataPoints = displaySkills.map((skill, index) => {
    const score = typeof skill.score === 'number' ? skill.score : 0;
    const dataRadius = (radius * Math.max(score, 1)) / 100; // Score out of 100, minimum 1 for visibility
    return getPointOnCircle(index, dataRadius);
  });
  
  const dataPath = dataPoints.length > 0 
    ? `M${dataPoints.map(p => `${p.x},${p.y}`).join('L')}Z`
    : '';
  
  // Label positions (outside the chart)
  const labelPoints = displaySkills.map((skill, index) => {
    const point = getPointOnCircle(index, radius + 50); // Increased distance for better visibility
    const name = skill.skill || skill.name || '';
    const score = typeof skill.score === 'number' ? skill.score : 0;
    return { ...point, name, score };
  });
  
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="mb-4">
        {/* Grid circles */}
        <defs>
          <radialGradient id="skillsGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        
        {/* Background grid */}
        {gridPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="rgb(148, 163, 184)"
            strokeWidth="1"
            strokeOpacity={0.3}
          />
        ))}
        
        {/* Axis lines */}
        {axisLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgb(148, 163, 184)"
            strokeWidth="1"
            strokeOpacity={0.4}
          />
        ))}
        
        {/* Score labels on axes */}
        {gridLevels.map((level) => (
          <text
            key={level}
            x={center}
            y={center - (radius * level) / 100 - 5}
            textAnchor="middle"
            fontSize="10"
            fill="rgb(100, 116, 139)"
          >
            {level}
          </text>
        ))}
        
        {/* Data area */}
        {dataPath && (
          <path
            d={dataPath}
            fill="url(#skillsGradient)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            fillOpacity="0.6"
          />
        )}
        
        {/* Data points */}
        {dataPoints.map((point, index) => {
          const skill = displaySkills[index];
          const score = typeof skill.score === 'number' ? skill.score : 0;
          if (score === 0) return null;
          
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="rgb(59, 130, 246)"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Skill labels with dynamic backgrounds */}
        {labelPoints.map((point, index) => {
          const skill = displaySkills[index];
          if (!skill.skill && !skill.name) return null;
          
          const fullName = point.name || '';
          const maxChars = 20;
          const displayName = fullName.length > maxChars 
            ? fullName.slice(0, maxChars - 3) + '...' 
            : fullName;
          
          // Calculate dynamic width based on text length
          const charWidth = 7;
          const padding = 12;
          const rectWidth = Math.max(displayName.length * charWidth + padding, 60);
          
          return (
            <g key={index}>
              {/* Dynamic background rectangle for skill name */}
              <rect
                x={point.x - rectWidth / 2}
                y={point.y - 25}
                width={rectWidth}
                height={20}
                fill="rgba(255, 255, 255, 0.95)"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1.5"
                rx="10"
                className="drop-shadow-md"
              />
              
              {/* Skill name */}
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="rgb(15, 23, 42)"
                className="select-none"
              >
                {displayName}
              </text>
              
              {/* Score badge with better design */}
              <g>
                {/* Score background */}
                <rect
                  x={point.x - 18}
                  y={point.y + 2}
                  width="36"
                  height="18"
                  fill="rgb(59, 130, 246)"
                  stroke="white"
                  strokeWidth="2"
                  rx="9"
                  className="drop-shadow-md"
                />
                
                {/* Score text */}
                <text
                  x={point.x}
                  y={point.y + 14}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="white"
                  className="select-none"
                >
                  {point.score}
                </text>
              </g>
            </g>
          );
        })}
        
        {/* Center point */}
        <circle
          cx={center}
          cy={center}
          r="3"
          fill="rgb(59, 130, 246)"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">Skills Assessment Overview</h3>
        <p className="text-sm text-muted-foreground">
          Each vertex represents a core competency with scores from 0-100
        </p>
      </div>
    </div>
  );
};

// --- Helper Components ---
const LoadingState = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const processingStages = [
    {
      title: "🔍 Initializing Deep Analysis Engine",
      description: "Booting up advanced neural assessment protocols..."
    },
    {
      title: "🧠 Deploying 8 Specialist AI Agents",
      description: "Activating Core Principles, Analytical Skills, Professional Acumen evaluators..."
    },
    {
      title: "⚡ Processing Interview Transcript",
      description: "Extracting micro-patterns from conversation dynamics and response quality..."
    },
    {
      title: "📊 Cross-Referencing Competency Matrices",
      description: "Running advanced correlation algorithms across skill domains..."
    },
    {
      title: "🔬 Synthesizing Multi-Agent Reports",
      description: "Master Evaluator AI consolidating specialist findings..."
    },
    {
      title: "🎯 Finalizing Candidate Profile",
      description: "Generating precision-tuned recommendations and insights..."
    }
  ];

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => {
        if (prev < processingStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) {
          return prev + Math.random() * 3;
        }
        return 90 + Math.random() * 5;
      });
    }, 200);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle text-center p-6">
      <div className="w-24 h-24 relative mb-8">
        <LoaderCircle className="w-24 h-24 text-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-primary/20 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      <h1 className="text-4xl font-bold text-foreground mb-4 animate-pulse">
        {processingStages[currentStage]?.title}
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8 min-h-[3rem] flex items-center justify-center">
        {processingStages[currentStage]?.description}
      </p>

      <div className="w-full max-w-md mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Processing...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-primary to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {processingStages.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-500 ${
              index <= currentStage 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        ))}
      </div>
      
      <p className="text-sm text-muted-foreground mt-6 opacity-75">
        Advanced AI assessment in progress • This may take 30-60 seconds
      </p>
    </div>
  );
};

const ErrorState = ({ message, onGoBack }: { message: string, onGoBack: () => void }) => {
  const isInsufficientData = message.toLowerCase().includes('insufficient conversation') || 
                             message.toLowerCase().includes('no interview history') || 
                             message.toLowerCase().includes('insufficient data') ||
                             message.toLowerCase().includes('incomplete evaluation');

  if (isInsufficientData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle text-center p-6">
        <div className="w-20 h-20 mb-6 relative">
          <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
          <div className="absolute inset-2 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
          <AlertTriangle className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-4">⚠️ Assessment Incomplete</h1>
        <div className="max-w-2xl mx-auto mb-8">
          <p className="text-lg text-muted-foreground mb-4">
            Our AI evaluation system requires a substantial conversation to generate accurate insights.
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              📋 What We Need for Assessment:
            </h3>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1 text-left">
              <li>• At least 2-3 meaningful exchanges</li>
              <li>• Responses to interviewer questions</li>
              <li>• Discussion of relevant topics</li>
              <li>• Demonstration of your knowledge</li>
            </ul>
          </div>
          <p className="text-muted-foreground">
            <strong>Tip:</strong> Engage more deeply with the interviewer to unlock your comprehensive competency profile.
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button onClick={onGoBack} variant="outline">
            Try Different Interview
          </Button>
          <Button onClick={() => window.location.reload()}>
            Continue Current Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-subtle text-center p-6">
      <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-3xl font-bold text-foreground mb-3">System Error</h1>
      <div className="max-w-2xl mx-auto mb-8">
        <p className="text-lg text-muted-foreground mb-4">
          We encountered a technical issue while processing your assessment.
        </p>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300 font-mono">
            {message}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Our development team has been notified. Please try again or contact support if the issue persists.
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={onGoBack} variant="outline">
          Start New Interview
        </Button>
        <Button onClick={() => window.location.reload()}>
          Retry Assessment
        </Button>
      </div>
    </div>
  );
};

// --- Main Component (Rewritten for Robustness) ---
export const ResultsPage = ({
  candidateName = "Krishna",
  companyName = "Graydot Technologies",
}: ResultsPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Generate a cache key based on the interview history
  const generateCacheKey = useCallback((history: any[]) => {
    // Create a hash of the conversation content for caching
    const conversationContent = history
      .map(item => `${item.role}:${item.parts?.[0]?.text || ''}`)
      .join('|');
    
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < conversationContent.length; i++) {
      const char = conversationContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `aestim_evaluation_${Math.abs(hash)}`;
  }, []);

  // Cache management utilities
  const getCachedEvaluation = useCallback((cacheKey: string) => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Check if cache is less than 24 hours old
        const cacheAge = Date.now() - parsedCache.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (cacheAge < maxAge) {
          console.log('[ResultsPage] Using cached evaluation results');
          return parsedCache.data;
        } else {
          console.log('[ResultsPage] Cache expired, removing old data');
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('[ResultsPage] Error reading from cache:', error);
      // Clear corrupted cache
      try {
        localStorage.removeItem(cacheKey);
      } catch (e) {
        console.warn('[ResultsPage] Error clearing corrupted cache:', e);
      }
    }
    return null;
  }, []);

  const setCachedEvaluation = useCallback((cacheKey: string, data: EvaluationData) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        version: '1.0' // For future cache invalidation if needed
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('[ResultsPage] Evaluation results cached successfully');
      
      // Clean up old cache entries (keep only last 5 evaluations)
      const allKeys = Object.keys(localStorage);
      const evaluationKeys = allKeys
        .filter(key => key.startsWith('aestim_evaluation_'))
        .sort((a, b) => {
          const aData = JSON.parse(localStorage.getItem(a) || '{}');
          const bData = JSON.parse(localStorage.getItem(b) || '{}');
          return (bData.timestamp || 0) - (aData.timestamp || 0);
        });
      
      // Remove old entries beyond the 5 most recent
      evaluationKeys.slice(5).forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`[ResultsPage] Removed old cache entry: ${key}`);
        } catch (e) {
          console.warn(`[ResultsPage] Error removing old cache entry ${key}:`, e);
        }
      });
    } catch (error) {
      console.warn('[ResultsPage] Error caching evaluation results:', error);
      // If localStorage is full, try to clear some space
      if (error instanceof DOMException && error.code === DOMException.QUOTA_EXCEEDED_ERR) {
        try {
          const allKeys = Object.keys(localStorage);
          const evaluationKeys = allKeys.filter(key => key.startsWith('aestim_evaluation_'));
          // Remove oldest entries
          evaluationKeys.slice(0, 2).forEach(key => localStorage.removeItem(key));
          // Try caching again
          localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (retryError) {
          console.warn('[ResultsPage] Failed to cache after cleanup:', retryError);
        }
      }
    }
  }, []);

  const fetchEvaluation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const history = location.state?.history;

    if (!history || history.length < 4) { // At least 2 exchanges (4 messages: user, ai, user, ai)
      setError("Insufficient conversation data. Please have at least 2-3 meaningful exchanges with the interviewer.");
      setIsLoading(false);
      return;
    }

    // Generate cache key for this specific interview
    const cacheKey = generateCacheKey(history);
    
    // Check for cached results first
    const cachedResult = getCachedEvaluation(cacheKey);
    if (cachedResult) {
      setEvaluation(cachedResult);
      setIsFromCache(true);
      setIsLoading(false);
      return;
    }

    const backendUrl = import.meta.env.VITE_LLM_BACKEND_URL;
    if (!backendUrl) {
      setError("Backend URL is not configured.");
      setIsLoading(false);
      return;
    }
    
    // The backend URL already includes the full path, so we need to modify it for the results endpoint
    const resultsUrl = backendUrl.replace('/chat/accounting', '/chat/accounting/results');

    try {
      console.log('[ResultsPage] Fetching fresh evaluation from backend...');
      const response = await fetch(resultsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'An unknown error occurred.');
      
      // Cache the successful result
      setCachedEvaluation(cacheKey, data);
      setEvaluation(data);
      setIsFromCache(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [location.state, generateCacheKey, getCachedEvaluation, setCachedEvaluation]);

  // Function to force refresh evaluation (bypass cache)
  const refreshEvaluation = useCallback(async () => {
    const history = location.state?.history;
    if (!history) return;
    
    const cacheKey = generateCacheKey(history);
    
    // Clear existing cache for this evaluation
    try {
      localStorage.removeItem(cacheKey);
      console.log('[ResultsPage] Cache cleared, fetching fresh evaluation...');
    } catch (error) {
      console.warn('[ResultsPage] Error clearing cache:', error);
    }
    
    // Force fresh fetch
    await fetchEvaluation();
  }, [location.state, generateCacheKey, fetchEvaluation]);

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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Candidate Evaluation Report</h1>
              <p className="text-lg text-muted-foreground">For: {candidateName} | Company: {companyName}</p>
            </div>
            
            {/* Cache Status and Refresh Button */}
            <div className="flex items-center gap-3">
              {isFromCache && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700 dark:text-blue-300">Cached Results</span>
                </div>
              )}
              
              {!isFromCache && evaluation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                  <Zap className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 dark:text-green-300">Fresh Analysis</span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshEvaluation}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
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

        {/* 75/25 Layout: Skills Chart + Stats/Actions */}
        <div className="grid gap-8 lg:grid-cols-4 items-start mb-8">
          {/* Left Side - Skills Radar Chart (75% width - 3 columns) */}
          <div className="lg:col-span-3">
            <Card className="p-8 shadow-lg flex items-center justify-center">
              <SkillsRadarChart competencies={competencies} />
            </Card>
          </div>

          {/* Right Side - Stats and Next Steps (25% width - 1 column) */}
          <div className="space-y-6">
            {/* Performance Metrics */}
            <Card className="p-4 shadow-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-2"></div>
                Performance
              </h3>
              <div className="space-y-4">
                {(() => {
                  const scores = competencies.map(c => typeof c.score === 'number' ? c.score : 0);
                  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                  const maxScore = Math.max(...scores);
                  const minScore = Math.min(...scores);
                  const strongSkills = scores.filter(s => s >= 70).length;
                  
                  return (
                    <>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-2xl font-bold text-primary mb-1">{avgScore.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Average</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                          <span className="text-xs text-muted-foreground">Highest</span>
                          <span className="text-sm font-bold text-green-600">{maxScore}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                          <span className="text-xs text-muted-foreground">Lowest</span>
                          <span className="text-sm font-bold text-orange-600">{minScore}</span>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="text-lg font-bold text-blue-600">{strongSkills}<span className="text-sm text-muted-foreground">/{scores.length}</span></div>
                        <div className="text-xs text-muted-foreground">Strong (70+)</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-4 shadow-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-2"></div>
                What next?
              </h3>
              <ul className="space-y-3">
                {/* {nextSteps.map((step, index) => ( */}
                  <li key={"index"} className="flex items-start group">
                    {/* <div className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 group-hover:bg-green-200 dark:group-hover:bg-green-900/40 transition-colors">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400">{index + 1}</span>
                    </div> */}
                    <span className="text-xs text-foreground/80 leading-relaxed">{nextSteps[0]}</span>
                  </li>
                {/* ))} */}
              </ul>
            </Card>
          </div>
        </div>

        {/* Full-Width Core Competencies Section */}
        <Card className="p-8 shadow-lg">
          <h2 className="text-3xl font-semibold text-foreground mb-8 text-center flex items-center justify-center">
            <div className="w-2 h-10 bg-gradient-to-b from-primary to-blue-600 rounded-full mr-4"></div>
            Core Competencies Breakdown
            <div className="w-2 h-10 bg-gradient-to-b from-primary to-blue-600 rounded-full ml-4"></div>
          </h2>
          
          <div className="grid gap-6 lg:grid-cols-2">
            {competencies.map((comp, index) => {
              const name = comp.skill || comp.name || 'Unnamed Competency';
              const scoreNum = typeof comp.score === 'number' ? comp.score : 0;
              const scoreDisplay = typeof comp.score === 'number' ? `${scoreNum}` : 'N/A';
              
              // Color coding based on score (out of 100)
              const getScoreColor = (score: number) => {
                if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/20 border-green-300';
                if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300';
                if (score >= 40) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 border-orange-300';
                return 'text-red-600 bg-red-100 dark:bg-red-900/20 border-red-300';
              };

              return (
                <div key={index} className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">{name}</h3>
                    <span className={`font-bold text-lg px-4 py-2 rounded-full border-2 ${getScoreColor(scoreNum)}`}>
                      {scoreDisplay}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-4 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary via-blue-500 to-blue-600 h-4 rounded-full transition-all duration-1000 relative"
                      style={{ width: `${scoreNum}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-3">
                    {comp.evaluation && (
                      <div className="bg-white/50 dark:bg-slate-900/30 rounded-lg p-3 border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-sm text-muted-foreground leading-relaxed italic">"{comp.evaluation}"</p>
                      </div>
                    )}
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      {comp.strength && comp.strength !== "N/A" && (
                        <div className="flex items-start text-sm bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3 mt-1 flex-shrink-0"></div>
                          <div>
                            <span className="font-semibold text-green-700 dark:text-green-400 block">Strength</span>
                            <span className="text-muted-foreground">{comp.strength}</span>
                          </div>
                        </div>
                      )}
                      {comp.weakness && (
                        <div className="flex items-start text-sm bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                          <div className="w-3 h-3 bg-amber-500 rounded-full mr-3 mt-1 flex-shrink-0"></div>
                          <div>
                            <span className="font-semibold text-amber-700 dark:text-amber-400 block">Growth Area</span>
                            <span className="text-muted-foreground">{comp.weakness}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-12 text-center">
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </main>
    </div>
  );
};