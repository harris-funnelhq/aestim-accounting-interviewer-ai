import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

interface CameraFeedProps {
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'small' | 'medium' | 'large';
}

export const CameraFeed = ({ 
  isVisible = true, 
  onToggleVisibility,
  position = 'top-right',
  size = 'small'
}: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true); // Camera on by default
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default
  const [needsUserInteraction, setNeedsUserInteraction] = useState(true); // Require user interaction first

  // Size configurations
  const sizeConfig = {
    small: { width: 160, height: 120 },
    medium: { width: 240, height: 180 },
    large: { width: 320, height: 240 }
  };

  // When expanded, use large size; when minimized, use small size
  const currentSize = isExpanded ? sizeConfig.large : sizeConfig.small;

  // Position configurations
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4', 
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const startCamera = async () => {
    console.log('[CameraFeed] startCamera called');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[CameraFeed] Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 30 }
        } 
      });
      
      console.log('[CameraFeed] Camera access granted, setting up stream');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraOn(true);
        console.log('[CameraFeed] Camera started successfully');
      } else {
        console.warn('[CameraFeed] videoRef.current is null');
      }
    } catch (err) {
      console.error('[CameraFeed] Error accessing camera:', err);
      setError('Camera access denied or unavailable');
      setIsCameraOn(false); // Ensure camera state is false on error
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = (updateState = true) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (updateState) {
      setIsCameraOn(false);
    }
  };

  const toggleCamera = () => {
    console.log('[CameraFeed] toggleCamera called, current state:', isCameraOn);
    setNeedsUserInteraction(false); // User has interacted, we can now access camera
    
    if (isCameraOn) {
      console.log('[CameraFeed] Turning camera OFF');
      setIsCameraOn(false);
      stopCamera(false); // Don't update state, we already did it
    } else {
      console.log('[CameraFeed] Turning camera ON');
      setIsCameraOn(true);
      // startCamera will be called by useEffect
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    onToggleVisibility?.(newVisibility);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Try to auto-start camera after a delay (browsers may block this)
  useEffect(() => {
    console.log('[CameraFeed] Component mounted, attempting auto-start after delay');
    const timer = setTimeout(() => {
      if (isVisible && isCameraOn && !streamRef.current) {
        console.log('[CameraFeed] Attempting auto-start camera');
        setNeedsUserInteraction(false);
        startCamera().catch(() => {
          console.log('[CameraFeed] Auto-start failed, requires user interaction');
          setNeedsUserInteraction(true);
        });
      }
    }, 2000); // Longer delay
    
    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Handle manual camera on/off toggle
  useEffect(() => {
    if (!isVisible || needsUserInteraction) return;
    
    if (isCameraOn && !streamRef.current && !isLoading) {
      // User turned camera on, start it
      console.log('[CameraFeed] Starting camera due to isCameraOn=true');
      startCamera();
    } else if (!isCameraOn && streamRef.current) {
      // User turned camera off, stop it
      console.log('[CameraFeed] Stopping camera due to isCameraOn=false');
      stopCamera(false); // Don't update state, it's already false
    }
  }, [isCameraOn, isVisible, isLoading, needsUserInteraction]);

  if (!isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className={`fixed ${positionClasses[position]} z-50`}
        style={{
          width: currentSize.width,
          height: currentSize.height + 40 // Extra height for controls
        }}
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
          {/* Video Feed */}
          <div 
            className="relative bg-slate-900 flex items-center justify-center"
            style={{ 
              width: currentSize.width, 
              height: currentSize.height 
            }}
          >
            {isCameraOn ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform scale-x-[-1]"
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                ) : error ? (
                  <>
                    <CameraOff className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center px-2">{error}</span>
                  </>
                ) : needsUserInteraction ? (
                  <>
                    <Camera className="w-8 h-8 mb-2 text-blue-400" />
                    <span className="text-xs text-center px-2">Click camera button to start</span>
                  </>
                ) : (
                  <>
                    <CameraOff className="w-8 h-8 mb-2" />
                    <span className="text-xs">Camera Off</span>
                  </>
                )}
              </div>
            )}

            {/* Camera status indicator */}
            {isCameraOn && (
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  REC
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleCamera}
                className="h-6 w-6 p-0"
                title={isCameraOn ? "Turn off camera" : "Turn on camera"}
              >
                {isCameraOn ? (
                  <Camera className="w-3 h-3 text-green-600" />
                ) : (
                  <CameraOff className="w-3 h-3 text-slate-400" />
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={toggleExpanded}
                className="h-6 w-6 p-0"
                title={isExpanded ? "Minimize camera" : "Expand camera"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleVisibility}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
              title="Hide camera"
            >
              ×
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};