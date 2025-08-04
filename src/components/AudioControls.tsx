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
import { Settings, Brain, Ear, MessageSquare, CheckCircle } from 'lucide-react';
import { ConversationState } from '@/hooks/useConversationOrchestrator';

interface AudioControlsProps {
  isMicOn: boolean;
  onMicToggle: () => void;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDevice: string;
  onAudioChange: (deviceId: string) => void;
  audioLevel: number;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  conversationState?: ConversationState; // MOCKTAGON: Conversation state indicator
  onEndInterview: () => void;
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

// MOCKTAGON INTEGRATION: Conversation state indicator
const ConversationStateIndicator = ({ state }: { state?: ConversationState }) => {
  if (!state) return null;

  const stateConfig = {
    [ConversationState.IDLE]: {
      icon: CheckCircle,
      label: "Ready",
      color: "text-slate-500",
      bgColor: "bg-slate-50 dark:bg-slate-800",
      borderColor: "border-slate-200 dark:border-slate-700"
    },
    [ConversationState.CALIBRATING]: {
      icon: Settings,
      label: "Calibrating",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-800"
    },
    [ConversationState.LISTENING]: {
      icon: Ear,
      label: "Listening",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-800"
    },
    [ConversationState.THINKING]: {
      icon: Brain,
      label: "Thinking",
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-800"
    },
    [ConversationState.SPEAKING]: {
      icon: MessageSquare,
      label: "Speaking",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-800"
    }
  };

  const config = stateConfig[state];
  const IconComponent = config.icon;

  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all",
        config.color,
        config.bgColor,
        config.borderColor
      )}
    >
      <IconComponent 
        className={cn(
          "w-3 h-3",
          state === ConversationState.LISTENING && "animate-pulse",
          state === ConversationState.THINKING && "animate-spin",
          state === ConversationState.SPEAKING && "animate-bounce"
        )} 
      />
      <span>{config.label}</span>
    </motion.div>
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
  conversationState, // MOCKTAGON: New conversation state prop
  onEndInterview,
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
          {/* MOCKTAGON INTEGRATION: Conversation State Indicator */}
          <ConversationStateIndicator state={conversationState} />
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
