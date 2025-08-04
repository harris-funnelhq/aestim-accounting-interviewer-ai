import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import ConversationPanel from '@/components/ConversationPanel';
import { AudioControls } from '@/components/AudioControls';
import LiveAudioStreamer from '@/components/LiveAudioStreamer';
import CartesiaSpeaker, { CartesiaSpeakerHandle } from '@/components/CartesiaSpeaker';
import { AiInterviewer } from '@/components/AiInterviewer';
import { InteractiveQuestionPanel } from '@/components/InteractiveQuestionPanel';
import { useNavigate } from 'react-router-dom';
import { useConversationOrchestrator, ConversationState } from '@/hooks/useConversationOrchestrator';

// --- Configuration ---
// The .env variable already contains the full path, so we just use it directly.
const BACKEND_URL = import.meta.env.VITE_LLM_BACKEND_URL;
const WEBSOCKET_URL = import.meta.env.VITE_STT_WEBSOCKET_URL;

export interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const DUMMY_WELCOME_MESSAGE: HistoryItem = {
  role: 'model',
  parts: [{ text: "Welcome to the Aestim AI Accounting Assessment. I will be your interviewer today. When you're ready, we can begin." }]
};

const Interview = () => {
  const navigate = useNavigate();
  
  // MOCKTAGON INTEGRATION: Replace old state management with conversation orchestrator
  const conversationOrchestrator = useConversationOrchestrator(
    {
      sessionId: crypto.randomUUID(),
      backendUrl: BACKEND_URL,
      mode: 'prod',
      enableAutoTransition: true
    },
    {
      onStateChange: (newState) => {
        console.log(`[Interview] Conversation state changed to: ${newState}`);
        // Update derived states based on conversation state
        setIsListening(newState === ConversationState.LISTENING);
        setIsSpeaking(newState === ConversationState.SPEAKING);
        // isWaitingForResponse now comes from conversation orchestrator
      },
      onInteractiveTask: (task) => {
        setInteractiveTask(task);
        setIsInteractiveQuestion(true);
      },
      onError: (error) => {
        console.error('[Interview] Conversation error:', error);
      }
    }
  );

  // Audio and UI state (preserved from original)
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [currentUtterance, setCurrentUtterance] = useState("");
  const [textToSpeak, setTextToSpeak] = useState(DUMMY_WELCOME_MESSAGE.parts[0].text);
  
  // Interactive question state (preserved)
  const [isInteractiveQuestion, setIsInteractiveQuestion] = useState(false);
  const [interactiveTask, setInteractiveTask] = useState<any | null>(null);
  
  // Extract state from conversation orchestrator
  const { 
    state: conversationState, 
    messages, 
    isWaitingForResponse, 
    sendMessage: orchestratorSendMessage,
    completeSpeaking,
    cleanup: cleanupOrchestrator
  } = conversationOrchestrator;

  const streamerRef = useRef<LiveAudioStreamer | null>(null);
  const speakerRef = useRef<CartesiaSpeakerHandle>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const currentUtteranceRef = useRef(currentUtterance);
  const isWaitingRef = useRef(isWaitingForResponse);
  const avatarRef = useRef(null);
  const isFirstRun = useRef(true); // To prevent initial animation

  // --- GSAP Animation Hook ---
  useGSAP(() => {
    // On the very first run, just set the initial position instantly without animation.
    if (isFirstRun.current) {
      gsap.set(avatarRef.current, {
        left: '50%',
        xPercent: -50,
        y: 0, // Set initial vertical position
      });
      isFirstRun.current = false;
      return;
    }

    // On subsequent changes, create a timeline for a curved path.
    const tl = gsap.timeline();
    if (isInteractiveQuestion) {
      // Animate right and down with an overlap to create the curve.
      tl.to(avatarRef.current, {
        left: '100%',
        xPercent: -150,
        duration: 1.2,
        ease: 'power2.inOut',
      })
      .to(avatarRef.current, {
        y: 160, // Move down by 50px
        duration: 1.3,
        ease: 'power2.inOut',
      }, "-=1.0"); // Overlap the start of this animation by 1s for a smooth curve
    } else {
      // Animate back to the original position along the same curved path.
      tl.to(avatarRef.current, {
        left: '50%',
        xPercent: -50,
        duration: 1.2,
        ease: 'power2.inOut',
      })
      .to(avatarRef.current, {
        y: 0,
        duration: 1.0,
        ease: 'power2.inOut',
      }, "-=1.0");
    }
  }, { dependencies: [isInteractiveQuestion] });

  // --- Logic ---
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { currentUtteranceRef.current = currentUtterance; }, [currentUtterance]);
  useEffect(() => { isWaitingRef.current = isWaitingForResponse; }, [isWaitingForResponse]);

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        console.log('[Interview] 🎤 Requesting microphone permission...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Interview] ✅ Microphone permission granted!');
        
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const micDevices = allDevices.filter(device => device.kind === 'audioinput');
        console.log('[Interview] 🎤 Found audio devices:', micDevices.length);
        
        setAudioDevices(micDevices);
        if (micDevices.length > 0) {
          setSelectedAudioDevice(micDevices[0].deviceId);
          console.log('[Interview] 🎯 Selected device:', micDevices[0].label || micDevices[0].deviceId);
        }
      } catch (err) { 
        console.error('[Interview] 🚫 Error accessing media devices:', err);
      }
    };
    getAudioDevices();
    
    // MOCKTAGON INTEGRATION: Initialize with welcome message and start speaking
    console.log('[Interview] 🗣️ Initializing with welcome message');
    conversationOrchestrator.addMessage('ai', DUMMY_WELCOME_MESSAGE.parts[0].text);
    setTextToSpeak(DUMMY_WELCOME_MESSAGE.parts[0].text);
    // Start in speaking state to deliver welcome message
    conversationOrchestrator.transitionToState(ConversationState.SPEAKING);
  }, [conversationOrchestrator]);

  // MOCKTAGON INTEGRATION: Replace sendChatMessage with conversation orchestrator
  const sendChatMessage = async (payload: { message: string }) => {
    console.log(`[sendChatMessage] Using conversation orchestrator to send: "${payload.message}"`);
    
    const result = await orchestratorSendMessage(payload.message);
    
    if (result.error) {
      console.error('[sendChatMessage] Error:', result.error);
      return;
    }
    
    if (result.terminated) {
      handleEndInterview();
      return;
    }
    
    // Handle the response
    if (result.textToSpeak) {
      setTextToSpeak(result.textToSpeak);
    }
    
    if (result.isInteractive && result.task) {
      setInteractiveTask(result.task);
      setIsInteractiveQuestion(true);
    } else {
      setInteractiveTask(null);
      setIsInteractiveQuestion(false);
    }
  };

  const handleInteractiveSubmit = (answer: string) => {
    if (answer.trim()) {
      sendChatMessage({ message: answer });
    }
  };

  // MOCKTAGON INTEGRATION: Direct integration with conversation orchestrator
  // No more queue handling needed - transcripts go directly to orchestrator

  // --- NEW, DEFINITIVE STITCHING LOGIC ---
  // This version correctly handles punctuation and case differences.
  const intelligentStitch = (baseText: string, newFragment: string): string => {
    const base = baseText.trim();
    const fragment = newFragment.trim();

    if (!base) return fragment;
    if (!fragment) return base;

    const baseWords = base.split(/\s+/);
    const fragmentWords = fragment.split(/\s+/);

    let overlapLength = 0;

    // A helper function to clean words for comparison ONLY.
    const cleanWord = (word: string) => word.replace(/[.,?]/g, '').toLowerCase();

    // Find the length of the longest suffix of `baseWords` that is a prefix of `fragmentWords`
    for (let i = Math.min(baseWords.length, fragmentWords.length); i >= 1; i--) {
      const baseSuffix = baseWords.slice(baseWords.length - i);
      const fragmentPrefix = fragmentWords.slice(0, i);

      // FIX: Compare the *cleaned* versions of the words to find the true overlap.
      const cleanedBaseSuffix = baseSuffix.map(cleanWord).join(' ');
      const cleanedFragmentPrefix = fragmentPrefix.map(cleanWord).join(' ');

      if (cleanedBaseSuffix === cleanedFragmentPrefix) {
        overlapLength = i;
        // We've found the longest possible overlap, so we can stop searching.
        break;
      }
    }

    // Append only the part of the new fragment that doesn't overlap.
    const nonOverlappingFragment = fragmentWords.slice(overlapLength).join(' ');
    
    // Combine the original base text with the new, non-overlapping part.
    // This ensures punctuation from the original text is preserved.
    return (base + ' ' + nonOverlappingFragment).trim();
  };


  const handleTranscriptUpdate = (transcript: string, isFinal: boolean) => {
    console.log(`[handleTranscriptUpdate] 🎤 Transcript: "${transcript}", Final: ${isFinal}, Current State: ${conversationState}`);
    
    // MOCKTAGON INTEGRATION: Ensure we're in listening state when receiving transcripts
    if (conversationState !== ConversationState.LISTENING && conversationState !== ConversationState.THINKING) {
      console.log(`[handleTranscriptUpdate] Transitioning to listening state from: ${conversationState}`);
      conversationOrchestrator.startListening();
    }
    
    // Stop AI speaking if user starts talking
    if (isSpeakingRef.current) {
      console.log("[handleTranscriptUpdate] 🛑 AI is speaking, stopping playback.");
      speakerRef.current?.stop();
    }
    
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    
    // Use the robust stitching function for building the utterance
    const newUtterance = intelligentStitch(currentUtteranceRef.current, transcript);
    console.log(`[handleTranscriptUpdate] 🔗 Stitched utterance: "${newUtterance}"`);
    setCurrentUtterance(newUtterance);
    
    if (isFinal && newUtterance.trim()) {
      console.log(`[handleTranscriptUpdate] ✅ Final utterance ready: "${newUtterance}"`);
      // Clear the current utterance and send to conversation orchestrator
      setCurrentUtterance("");
      sendChatMessage({ message: newUtterance });
    } else {
      console.log(`[handleTranscriptUpdate] 🔄 Partial transcript, waiting for more...`);
    }
  };

  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    streamerRef.current?.setMuted(!newMicState);
  };

  const handleStart = () => {
    console.log('[Interview] Starting audio stream...');
    if (streamerRef.current) streamerRef.current.stopStreaming();
    setConnectionStatus('connecting');
    setIsMicOn(true);
    const sessionId = crypto.randomUUID();
    const config = { sample_rate: 16000 };
    
    console.log('[Interview] WebSocket URL:', WEBSOCKET_URL);
    console.log('[Interview] Session ID:', sessionId);
    console.log('[Interview] Selected device:', selectedAudioDevice);
    
    streamerRef.current = new LiveAudioStreamer(
      sessionId, config, handleTranscriptUpdate,
      (metrics) => {
        console.log('[Interview] Audio metrics:', metrics);
        setAudioLevel(metrics.speechThreshold > 0 ? Math.min(metrics.currentRms / (metrics.speechThreshold * 1.5), 1) : 0);
      },
      () => {
        console.log('[Interview] WebSocket connected successfully!');
        setConnectionStatus('connected');
        // MOCKTAGON INTEGRATION: Start listening when WebSocket connects
        conversationOrchestrator.startListening();
      },
      (error) => {
        console.error('[Interview] WebSocket connection error:', error);
        setConnectionStatus('error');
      },
      WEBSOCKET_URL,
      selectedAudioDevice
    );
    
    console.log('[Interview] Starting streaming...');
    streamerRef.current.startStreaming();
  };

  useEffect(() => {
    handleStart();
    return () => {
      streamerRef.current?.stopStreaming();
      cleanupOrchestrator(); // MOCKTAGON: Use conversation orchestrator cleanup
    };
  }, [selectedAudioDevice, cleanupOrchestrator]);

  const handleEndInterview = () => {
    streamerRef.current?.stopStreaming();
    cleanupOrchestrator(); // MOCKTAGON: Use conversation orchestrator cleanup
    // MOCKTAGON: Convert messages to history format for results page
    const historyForResults = conversationOrchestrator.convertToHistoryFormat(messages);
    navigate('/reports', { state: { history: historyForResults } });
  };

  // --- NEW, ROBUST MAIN UI ---
  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900">
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Accounting Assessment</h1>
        <div className="text-sm text-muted-foreground">
          Powered by <strong>Aestim AI</strong>
        </div>
      </header>
      
      <div className="flex-1 min-h-0 p-8 flex flex-col">
        {/* The AiInterviewer is now outside of the conditional rendering, so it always exists for GSAP to target. */}
        <div className="relative h-36 mb-4">
          <div ref={avatarRef} className="absolute top-0 left-1/2">
            <AiInterviewer isListening={isListening} isSpeaking={isSpeaking} />
          </div>
        </div>

        {/* This block now only switches between the two content panels. */}
        <AnimatePresence mode="wait">
          {isInteractiveQuestion ? (
            <motion.div
              key="interactive"
              className="flex-1 flex items-start justify-center"
              initial={{ opacity: 0, x: -150 }}
              animate={{ opacity: 1, x: -160, transition: { duration: 0.9, ease: 'easeInOut', delay: 1.1 } }}
              exit={{ opacity: 0, x: 50, transition: { duration: 0.4, ease: 'easeInOut' } }}
            >
              <div className="w-2/3 max-w-3xl relative left-20 bottom-8">
                <InteractiveQuestionPanel 
                  task={interactiveTask}
                  onSubmit={handleInteractiveSubmit}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeInOut', delay: 0.8 } }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4, ease: 'easeInOut' } }}
            >
              <ConversationPanel
                history={conversationOrchestrator.convertToHistoryFormat(messages)}
                isWaitingForResponse={isWaitingForResponse}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DEBUG: Show current utterance being transcribed */}
      {currentUtterance && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="text-xs opacity-75">Live Transcript:</div>
          <div className="font-mono">"{currentUtterance}"</div>
        </div>
      )}

      <AudioControls
        isMicOn={isMicOn}
        onMicToggle={handleMicToggle}
        audioDevices={audioDevices}
        selectedAudioDevice={selectedAudioDevice}
        onAudioChange={setSelectedAudioDevice}
        audioLevel={audioLevel}
        connectionStatus={connectionStatus}
        conversationState={conversationState} // MOCKTAGON: Pass conversation state
        onEndInterview={handleEndInterview}
      />
      <CartesiaSpeaker
        ref={speakerRef}
        text={textToSpeak}
        trigger={conversationState === ConversationState.SPEAKING}
        mode="full"
        onSpeakingStateChange={setIsSpeaking}
        onComplete={() => {
          console.log('[Interview] Speaking completed, transitioning to listening');
          completeSpeaking(); // MOCKTAGON: Auto-transition after speaking
        }}
      />
    </div>
  );
};

export default Interview;
