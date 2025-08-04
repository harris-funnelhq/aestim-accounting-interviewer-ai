import { useState, useRef, useCallback } from 'react';

// MOCKTAGON INTEGRATION: Enhanced conversation state machine
export enum ConversationState {
  IDLE = "idle",
  CALIBRATING = "calibrating", 
  LISTENING = "listening",
  THINKING = "thinking",
  SPEAKING = "speaking"
}

// Enhanced message interface with metadata
export interface ConversationMessage {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  id: string;
  metadata?: {
    isInteractive?: boolean;
    taskType?: string;
    confidence?: number;
  };
}

// Aestim-compatible history item for backend communication
export interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ConversationOrchestratorConfig {
  sessionId: string;
  backendUrl: string;
  mode?: 'prod' | 'test';
  enableAutoTransition?: boolean;
}

interface ConversationCallbacks {
  onStateChange?: (state: ConversationState) => void;
  onMessageAdded?: (message: ConversationMessage) => void;
  onInteractiveTask?: (task: any) => void;
  onError?: (error: string) => void;
}

export const useConversationOrchestrator = (
  config: ConversationOrchestratorConfig,
  callbacks?: ConversationCallbacks
) => {
  // Core state management
  const [state, setState] = useState<ConversationState>(ConversationState.IDLE);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentInteractiveTask, setCurrentInteractiveTask] = useState<any | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  
  // Internal refs for state management
  const stateRef = useRef(state);
  const messagesRef = useRef(messages);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdCounter = useRef(0);

  // Sync refs with state
  stateRef.current = state;
  messagesRef.current = messages;

  // MOCKTAGON INTEGRATION: State transition with callbacks
  // FIX: This now uses a functional update to avoid depending on `state`, making it more stable.
  const transitionToState = useCallback((newState: ConversationState) => {
    setState(prevState => {
      if (prevState === newState) return prevState; // Avoid redundant transitions
      callbacks?.onStateChange?.(newState);
      return newState;
    });
  }, [callbacks]);

  // Generate unique message ID
  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}`;
  };

  // Add message to conversation
  const addMessage = useCallback((
    role: "user" | "ai", 
    content: string, 
    metadata?: ConversationMessage['metadata']
  ) => {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      id: generateMessageId(),
      metadata
    };

    setMessages(prev => [...prev, message]);
    callbacks?.onMessageAdded?.(message);
    return message;
  }, [callbacks]);

  // Convert messages to Aestim's backend format
  const convertToHistoryFormat = useCallback((msgs: ConversationMessage[]): HistoryItem[] => {
    return msgs.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }, []);

  // MOCKTAGON INTEGRATION: Enhanced message sending with state management
  const sendMessage = useCallback(async (
    content: string, 
    options?: { 
      hideFromUser?: boolean;
      skipStateTransition?: boolean;
    }
  ) => {
    // Debug: Only log when there are issues
    if (messagesRef.current.length > 100) {
      console.warn(`[ConversationOrchestrator] Large message history detected: ${messagesRef.current.length} messages`);
    }
    
    // LIVECODE-INSIGHT PATTERN: Don't block messages based on state
    // The WebSocket is always listening, state machine only coordinates conversation flow
    // Skip message sending only if we're already waiting for a response to prevent spam
    if (isWaitingForResponse) {
      console.warn(`[ConversationOrchestrator] Already waiting for response, ignoring new message`);
      return {};
    }

    if (!content.trim()) {
      console.warn('[ConversationOrchestrator] Attempted to send empty message');
      return {};
    }

    // Add user message to conversation (unless hidden)
    if (!options?.hideFromUser) {
      addMessage('user', content);
    }

    // Transition to thinking state
    if (!options?.skipStateTransition) {
      transitionToState(ConversationState.THINKING);
    }

    setIsWaitingForResponse(true);

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Prepare request in Aestim's format
      const historyForAPI = convertToHistoryFormat(messagesRef.current);
      const requestBody = {
        history: historyForAPI,
        newUserMessage: content,
        mode: config.mode || 'prod'
      };

      console.log('[ConversationOrchestrator] Sending request to backend:', config.backendUrl);
      console.log('[ConversationOrchestrator] Request body:', requestBody);

      const response = await fetch(config.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      console.log('[ConversationOrchestrator] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const rawAiMessage = data.aiMessage;

      // Check for interview termination signal
      if (typeof rawAiMessage === 'string' && rawAiMessage.includes('[END_INTERVIEW]')) {
        console.log('[ConversationOrchestrator] Interview termination signal received');
        transitionToState(ConversationState.IDLE);
        // Handle termination (could trigger navigation)
        return { terminated: true };
      }

      // AESTIM INTEGRATION: Parse response and handle interactive tasks
      const parsedResponse = parseAIResponse(rawAiMessage);
      
      // Add AI message to conversation
      const aiMessage = addMessage('ai', parsedResponse.textForHistory, {
        isInteractive: parsedResponse.responseType === 'interactive',
        taskType: parsedResponse.problemData?.taskType
      });

      // Handle interactive tasks
      if (parsedResponse.responseType === 'interactive' && parsedResponse.problemData) {
        setCurrentInteractiveTask(parsedResponse.problemData);
        callbacks?.onInteractiveTask?.(parsedResponse.problemData);
      } else {
        setCurrentInteractiveTask(null);
      }

      // Transition to speaking state
      transitionToState(ConversationState.SPEAKING);

      return {
        message: aiMessage,
        textToSpeak: parsedResponse.textForSpeech,
        isInteractive: parsedResponse.responseType === 'interactive',
        task: parsedResponse.problemData
      };

    } catch (error: any) {
      console.error('[ConversationOrchestrator] Error sending message:', error);
      
      if (error.name !== 'AbortError') {
        callbacks?.onError?.(error.message || 'Failed to send message');
        transitionToState(ConversationState.IDLE);
      }
      
      return { error: error.message };
    } finally {
      setIsWaitingForResponse(false);
    }
  }, [config, addMessage, convertToHistoryFormat, transitionToState, callbacks]);

  // AESTIM INTEGRATION: Parse AI response (similar to Interview.tsx logic)
  const parseAIResponse = (rawAiMessage: string) => {
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
        console.warn('[ConversationOrchestrator] Failed to parse JSON. Treating as plain text.', e);
        textForHistory = rawAiMessage;
      }
    } else {
      textForHistory = rawAiMessage;
    }

    // Handle long text conversion to interactive display
    if (responseType === 'normal' && textForHistory.length > 400) {
      console.log('[ConversationOrchestrator] Long normal question detected. Converting to interactive display.');
      responseType = 'interactive';
      problemData = {
        taskType: 'long_text',
        description: textForHistory
      };
      textForSpeech = "I have a detailed scenario for you. Please read the information presented on the screen.";
    } else {
      textForSpeech = textForHistory;
    }

    return {
      textForHistory,
      textForSpeech,
      responseType,
      problemData
    };
  };

  // MOCKTAGON INTEGRATION: Conversation flow control
  const startListening = useCallback(() => {
    transitionToState(ConversationState.LISTENING);
  }, [transitionToState]);

  const startCalibration = useCallback(() => {
    transitionToState(ConversationState.CALIBRATING);
  }, [transitionToState]);

  // FIX: This function is simplified to always transition to the LISTENING
  // state after speaking is complete. This removes the ambiguous auto-transition
  // logic and ensures the app is always ready for the next user input.
  const completeSpeaking = useCallback(() => {
    transitionToState(ConversationState.LISTENING);
  }, [transitionToState]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setCurrentInteractiveTask(null);
    setIsWaitingForResponse(false);
    transitionToState(ConversationState.IDLE);
  }, [transitionToState]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    // State
    state,
    messages,
    currentInteractiveTask,
    isWaitingForResponse,
    isInteractive: currentInteractiveTask !== null,

    // Actions
    sendMessage,
    addMessage,
    transitionToState,
    startListening,
    startCalibration,
    completeSpeaking,
    resetConversation,
    cleanup,

    // Utilities
    convertToHistoryFormat,
    
    // Configuration
    config
  };
};