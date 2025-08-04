import { Mic, MicOff } from 'lucide-react'; // Removed ArrowRight as it's no longer used
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConnectionStatus } from './ConnectionStatus';
import { CalibrationScreen } from './CalibrationScreen';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Button } from './ui/button';
import { Settings } from 'lucide-react';

interface AudioControlsProps {
  isMicOn: boolean;
  onMicToggle: () => void;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDevice: string;
  onAudioChange: (deviceId: string) => void;
  audioLevel: number;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  onEndInterview: () => void; // FIX: Changed prop from onNextClick to onEndInterview
}

// Mic button remains the same - it's clean and effective.
const MicStatusIndicator = ({ isMicOn, onClick }: { isMicOn: boolean, onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all duration-300",
        isMicOn ? "border-sky-500 bg-sky-500/10" : "border-gray-600 bg-gray-500/10"
      )}
      aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
    >
      <div className="relative z-10">
        {isMicOn ? <Mic size={20} className="text-sky-400" /> : <MicOff size={20} className="text-gray-400" />}
      </div>
    </button>
  );
};

// A completely redesigned, more dynamic voice visualizer.
const Waveform = ({ level }: { level: number }) => {
  // Using 9 bars for a more detailed crest effect
  const multipliers = [0.4, 0.6, 0.8, 0.9, 1, 0.9, 0.8, 0.6, 0.4];
  const maxBarHeight = 36; // Increased height for more pronounced crests
  const minBarHeight = 2;
  const isSpeaking = level > 0.02;

  return (
    <div className="flex items-center justify-center gap-1 h-10 w-full max-w-[120px]">
      {multipliers.map((multiplier, i) => {
        const barHeight = Math.max(minBarHeight, level * maxBarHeight * multiplier);

        return (
          <motion.div
            key={i}
            className={`w-1.5 rounded-full ${isSpeaking ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            animate={{ height: `${barHeight}px` }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 20,
            }}
          />
        );
      })}
    </div>
  );
};


export const AudioControls = ({
  isMicOn,
  onMicToggle,
  audioDevices,
  selectedAudioDevice,
  onAudioChange,
  audioLevel,
  connectionStatus,
  onEndInterview, // FIX: Destructure the new prop
}: AudioControlsProps) => {
  const waveformLevel = isMicOn && connectionStatus === 'connected' ? audioLevel : 0;

  return (
    <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 gap-4">
      {/* Left-side controls (Unchanged) */}
      <div className="flex items-center gap-4">
        <MicStatusIndicator isMicOn={isMicOn} onClick={onMicToggle} />
        
        {isMicOn && (
          <div className="w-[120px] h-10 flex items-center justify-center">
            <Waveform level={waveformLevel} />
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <Select value={selectedAudioDevice} onValueChange={onAudioChange} disabled={audioDevices.length === 0}>
            <SelectTrigger className="w-auto sm:w-[180px] h-10 border-slate-200 dark:border-slate-700 bg-transparent text-foreground focus:ring-sky-500 focus:ring-offset-0">
              <SelectValue placeholder="Select mic" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ConnectionStatus status={connectionStatus} />
          {/* MOCKTAGON INTEGRATION: Audio Calibration Settings */}
          <CalibrationScreen 
            trigger={
              <Button variant="outline" size="sm" className="h-10">
                <Settings className="w-4 h-4" />
              </Button>
            }
            onComplete={() => console.log('Calibration completed!')}
          />
        </div>
      </div>

      {/* FIX: Right-side button is now "End Interview" */}
      <div className="flex-shrink-0">
        <Button variant="destructive" onClick={onEndInterview}>
          End Interview
        </Button>
      </div>
    </div>
  );
};
