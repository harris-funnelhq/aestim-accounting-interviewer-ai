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
  // --- State and Refs ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([DUMMY_WELCOME_MESSAGE]);
  const [currentUtterance, setCurrentUtterance] = useState("");
  const [messageQueue, setMessageQueue] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState(DUMMY_WELCOME_MESSAGE.parts[0].text);
  
  // These two state variables control the view switching.
  const [isInteractiveQuestion, setIsInteractiveQuestion] = useState(false);
  const [interactiveTask, setInteractiveTask] = useState<any | null>(null);

  const streamerRef = useRef<LiveAudioStreamer | null>(null);
  const speakerRef = useRef<CartesiaSpeakerHandle>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const currentUtteranceRef = useRef(currentUtterance);
  const messageQueueRef = useRef(messageQueue);
  const isWaitingRef = useRef(isWaitingForResponse);
  const historyRef = useRef(history);
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
  useEffect(() => { messageQueueRef.current = messageQueue; }, [messageQueue]);
  useEffect(() => { isWaitingRef.current = isWaitingForResponse; }, [isWaitingForResponse]);
  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const micDevices = allDevices.filter(device => device.kind === 'audioinput');
        setAudioDevices(micDevices);
        if (micDevices.length > 0) setSelectedAudioDevice(micDevices[0].deviceId);
      } catch (err) { console.error("Error accessing media devices:", err); }
    };
    getAudioDevices();
  }, []);

  const sendChatMessage = async (payload: { message: string }) => {
    console.log(`[sendChatMessage] Preparing to send message: "${payload.message}"`);
    if (abortControllerRef.current) {
      console.log("[sendChatMessage] Aborting previous request.");
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const historyForAPI = [...historyRef.current];
    const newUserMessage: HistoryItem = { role: 'user', parts: [{ text: payload.message }] };
    
    console.log("[sendChatMessage] Updating history with user message.");
    setHistory(prev => [...prev, newUserMessage]);
    setIsWaitingForResponse(true);
    
    const requestBody = { history: historyForAPI, newUserMessage: payload.message };
    console.log("[sendChatMessage] Sending request to backend with body:", requestBody);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      console.log(`[sendChatMessage] Received response with status: ${response.status}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const rawAiMessage = data.aiMessage;

      // --- FIX: Added the missing check for the termination signal ---
      // This check must happen *before* any other parsing logic.
      if (typeof rawAiMessage === 'string' && rawAiMessage.includes('[END_INTERVIEW]')) {
        console.log("[sendChatMessage] Termination signal received. Ending interview.");
        handleEndInterview();
        return; // Stop all further processing immediately.
      }
      // --- END OF FIX ---

      // --- RESTRUCTURED PARSING LOGIC ---
      let textForHistory: string;
      let textForSpeech: string;
      let responseType: string = 'normal';
      let problemData: any = null;

      let jsonString: string | null = null;
      const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
      const blockMatch = rawAiMessage.match(jsonBlockRegex);

      if (blockMatch && blockMatch[1]) {
        jsonString = blockMatch[1];
      } else {
        const firstBrace = rawAiMessage.indexOf('{');
        const lastBrace = rawAiMessage.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonString = rawAiMessage.substring(firstBrace, lastBrace + 1);
        }
      }

      if (jsonString) {
        try {
          const parsedResponse = JSON.parse(jsonString);
          textForHistory = parsedResponse.response || "An interactive task is ready.";
          responseType = parsedResponse.type || 'normal';
          problemData = parsedResponse.problem || null;
        } catch (e) {
          console.warn("[Parser] Failed to parse JSON. Treating as plain text.", e);
          textForHistory = rawAiMessage;
        }
      } else {
        textForHistory = rawAiMessage;
      }

      if (responseType === 'normal' && textForHistory.length > 400) {
        console.log("[Parser] Long normal question detected. Converting to interactive display.");
        responseType = 'interactive';
        problemData = {
          taskType: 'long_text',
          description: textForHistory
        };
        textForSpeech = "I have a detailed scenario for you. Please read the information presented on the screen.";
      } else {
        textForSpeech = textForHistory;
      }

      // Start the speaking animation immediately for better responsiveness.
      // The CartesiaSpeaker component will set this back to false when it finishes speaking.
      setIsSpeaking(true);

      const aiMessage: HistoryItem = { role: 'model', parts: [{ text: textForHistory }] };
      
      setHistory(prev => [...prev, aiMessage]);
      setTextToSpeak(textForSpeech); 

      if (responseType === 'interactive' && problemData) {
        setInteractiveTask(problemData);
        setIsInteractiveQuestion(true);
      } else {
        setInteractiveTask(null);
        setIsInteractiveQuestion(false);
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') console.error("[sendChatMessage] Error:", error);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  const handleInteractiveSubmit = (answer: string) => {
    if (answer.trim()) {
      sendChatMessage({ message: answer });
    }
  };

  const attemptToSendFromQueue = () => {
    // FIX: When the user stops speaking, the listening state is set to false.
    setIsListening(false);
    const queueContent = messageQueueRef.current;
    console.log(`[attemptToSendFromQueue] Checking queue. Is waiting: ${isWaitingRef.current}, Queue content: "${queueContent}"`);
    if (!isWaitingRef.current && queueContent) {
      sendChatMessage({ message: queueContent });
      setMessageQueue("");
    }
  };

  const smartStitch = (baseText: string, newFragment: string) => {
    console.log(`[smartStitch] Base: "${baseText}", Fragment: "${newFragment}"`);
    const base = baseText.trim();
    const fragment = newFragment.trim();
    if (fragment.toLowerCase().startsWith(base.toLowerCase())) {
      return fragment;
    }
    return `${base} ${fragment}`;
  };

  const handleTranscriptUpdate = (transcript: string, isFinal: boolean) => {
    console.log(`[handleTranscriptUpdate] Received transcript: "${transcript}", Is Final: ${isFinal}`);
    // FIX: As soon as a transcript arrives, it means the user is speaking.
    setIsListening(true);
    if (isSpeakingRef.current) {
      console.log("[handleTranscriptUpdate] AI is speaking, stopping playback.");
      speakerRef.current?.stop();
    }
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    const newUtterance = smartStitch(currentUtteranceRef.current, transcript);
    setCurrentUtterance(newUtterance);
    if (isFinal && newUtterance.trim()) {
      console.log(`[handleTranscriptUpdate] Final utterance detected. Adding to message queue: "${newUtterance}"`);
      setMessageQueue(prev => (prev ? `${prev}\n\n${newUtterance}` : newUtterance));
      setCurrentUtterance("");
      // Use a timeout to allow the state to update before sending
      activityTimerRef.current = setTimeout(() => attemptToSendFromQueue(), 200);
    } else if (!isFinal) {
      activityTimerRef.current = setTimeout(() => attemptToSendFromQueue(), 500);
    }
  };

  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    streamerRef.current?.setMuted(!newMicState);
  };

  const handleStart = () => {
    if (streamerRef.current) streamerRef.current.stopStreaming();
    setConnectionStatus('connecting');
    setIsMicOn(true);
    const sessionId = crypto.randomUUID();
    const config = { sample_rate: 16000 };
    streamerRef.current = new LiveAudioStreamer(
      sessionId, config, handleTranscriptUpdate,
      (metrics) => setAudioLevel(metrics.speechThreshold > 0 ? Math.min(metrics.currentRms / (metrics.speechThreshold * 1.5), 1) : 0),
      () => setConnectionStatus('connected'),
      () => setConnectionStatus('error'),
      WEBSOCKET_URL,
      selectedAudioDevice
    );
    streamerRef.current.startStreaming();
  };

  useEffect(() => {
    handleStart();
    return () => {
      streamerRef.current?.stopStreaming();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [selectedAudioDevice]);

  const handleEndInterview = () => {
    streamerRef.current?.stopStreaming();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    // FIX: Pass the final chat history to the results page via navigation state.
    navigate('/reports', { state: { history: historyRef.current } });
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
                  onSubmitAnswer={handleInteractiveSubmit}
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
                history={history}
                isWaitingForResponse={isWaitingForResponse}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AudioControls
        isMicOn={isMicOn}
        onMicToggle={handleMicToggle}
        audioDevices={audioDevices}
        selectedAudioDevice={selectedAudioDevice}
        onAudioChange={setSelectedAudioDevice}
        audioLevel={audioLevel}
        connectionStatus={connectionStatus}
        onEndInterview={handleEndInterview} // This prop must be passed
        // The props for buttons have been removed here as well
      />
      <CartesiaSpeaker
        ref={speakerRef}
        text={textToSpeak}
        onSpeakingStateChange={setIsSpeaking}
      />
    </div>
  );
};

export default Interview;
