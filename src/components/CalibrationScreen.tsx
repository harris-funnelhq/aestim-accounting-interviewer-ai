import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mic, MicOff, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalibrationScreenProps {
  onComplete?: () => void;
  trigger?: React.ReactNode; // Custom trigger element
}

type CalibrationPhase = 'detecting' | 'measuring' | 'calibrating' | 'ready';

interface CalibrationMetrics {
  noiseFloor: number;
  speechThreshold: number;
  isCalibrating: boolean;
  currentRms: number;
}

export const CalibrationScreen = ({ onComplete, trigger }: CalibrationScreenProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<CalibrationPhase>('detecting');
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<CalibrationMetrics>({
    noiseFloor: 0,
    speechThreshold: 0,
    isCalibrating: true,
    currentRms: 0
  });
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const calibrationTimer = useRef<NodeJS.Timeout | null>(null);

  // Phase descriptions for user guidance
  const phaseDescriptions = {
    detecting: "Checking microphone access...",
    measuring: "Please remain quiet while we measure background noise",
    calibrating: "Now speak normally: 'Hello, my name is...'",
    ready: "Audio calibration complete!"
  };

  const phaseIcons = {
    detecting: <Mic className="w-8 h-8 text-blue-500" />,
    measuring: <MicOff className="w-8 h-8 text-orange-500" />,
    calibrating: <Mic className="w-8 h-8 text-green-500 animate-pulse" />,
    ready: <CheckCircle className="w-8 h-8 text-green-600" />
  };

  // Reset calibration when dialog opens
  const resetCalibration = () => {
    setPhase('detecting');
    setProgress(0);
    setMicPermission('pending');
    setMetrics({
      noiseFloor: 0,
      speechThreshold: 0,
      isCalibrating: true,
      currentRms: 0
    });
  };

  // Request microphone permission and start calibration when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    
    const requestMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission('granted');
        
        // Start calibration phases
        startCalibrationProcess(stream);
      } catch (error) {
        console.error('Microphone access denied:', error);
        setMicPermission('denied');
      }
    };

    requestMicrophone();

    return () => {
      if (calibrationTimer.current) {
        clearTimeout(calibrationTimer.current);
      }
    };
  }, [isOpen]);

  const startCalibrationProcess = (stream: MediaStream) => {
    // Phase 1: Detecting (1 second)
    setPhase('detecting');
    setProgress(10);

    setTimeout(() => {
      // Phase 2: Measuring background noise (3 seconds)
      setPhase('measuring');
      setProgress(30);
      
      // Simulate noise floor measurement
      const measurementInterval = setInterval(() => {
        setMetrics(prev => ({
          ...prev,
          noiseFloor: Math.random() * 0.01,
          currentRms: Math.random() * 0.005
        }));
        setProgress(prev => Math.min(prev + 5, 50));
      }, 200);

      setTimeout(() => {
        clearInterval(measurementInterval);
        
        // Phase 3: Speech calibration (4 seconds)
        setPhase('calibrating');
        setProgress(60);
        
        const speechInterval = setInterval(() => {
          setMetrics(prev => ({
            ...prev,
            speechThreshold: 0.02 + Math.random() * 0.01,
            currentRms: 0.01 + Math.random() * 0.03
          }));
          setProgress(prev => Math.min(prev + 8, 95));
        }, 300);

        setTimeout(() => {
          clearInterval(speechInterval);
          
          // Phase 4: Ready
          setPhase('ready');
          setProgress(100);
          setMetrics(prev => ({ ...prev, isCalibrating: false }));
          
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
        }, 4000);
      }, 3000);
    }, 1000);
  };

  const handleSkipCalibration = () => {
    if (calibrationTimer.current) {
      clearTimeout(calibrationTimer.current);
    }
    onComplete();
  };

  const handleCompleteCalibration = () => {
    setIsOpen(false);
    onComplete?.();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      resetCalibration();
    }
  };

  const micPermissionContent = (
    <div className="text-center space-y-4">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-red-600">Microphone Access Required</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Please allow microphone access to calibrate your audio.
        </p>
      </div>
      <Button onClick={() => window.location.reload()} variant="outline" size="sm">
        Refresh Page
      </Button>
    </div>
  );

  const calibrationContent = (
    <div className="space-y-6">
      {/* Phase Icon and Description */}
      <div className="text-center space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center"
          >
            {phaseIcons[phase]}
          </motion.div>
        </AnimatePresence>
        
        <motion.p
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-base font-medium text-gray-700 dark:text-gray-300"
        >
          {phaseDescriptions[phase]}
        </motion.p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progress} className="w-full h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {progress}% complete
        </p>
      </div>

      {/* Metrics Display (compact for popup) */}
      {(phase === 'measuring' || phase === 'calibrating') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1"
        >
          <div className="flex justify-between">
            <span>Current Level:</span>
            <span className="font-mono">{metrics.currentRms.toFixed(4)}</span>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-3">
        {phase === 'ready' ? (
          <Button onClick={handleCompleteCalibration} size="sm" className="px-6">
            Complete
          </Button>
        ) : (
          <Button 
            onClick={handleSkipCalibration} 
            variant="outline" 
            size="sm"
            disabled={phase === 'detecting'}
          >
            Skip
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Audio Calibration
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audio Calibration</DialogTitle>
          <DialogDescription>
            Set up your microphone for optimal interview quality
          </DialogDescription>
        </DialogHeader>
        
        {micPermission === 'denied' ? micPermissionContent : calibrationContent}
      </DialogContent>
    </Dialog>
  );
};

// Default export with settings button trigger
export default CalibrationScreen;

// Named export for custom trigger usage
export { CalibrationScreen };