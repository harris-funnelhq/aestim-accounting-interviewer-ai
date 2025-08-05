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
    // NEW: Question tracking
    questionId?: string;
    questionStatus?: 'pending' | 'addressed' | 'dodged';
    attemptCount?: number;
    competencyArea?: string;
  };
}

// Aestim-compatible history item for backend communication
export interface HistoryItem {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// NEW: Question validation state
export interface QuestionState {
  id: string;
  text: string;
  competencyArea: 'foundational' | 'transaction' | 'reporting' | 'practical';
  status: 'pending' | 'addressed' | 'dodged' | 'follow_up_needed';
  attempts: number;
  maxAttempts: 3;
  timestamp: Date;
}

export interface QuestionValidationState {
  currentQuestion?: QuestionState;
  completedQuestions: QuestionState[];
  dodgedQuestions: QuestionState[];
  competencyCoverage: {
    foundational: number; // 0-100%
    transaction: number;
    reporting: number;
    practical: number;
  };
}

export interface ResponseAnalysis {
  type: 'question_addressed' | 'question_dodged' | 'unclear';
  confidence: number;
  accountingTerms?: string[];
  reasoning: string;
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
  
  // NEW: Question validation state
  const [questionValidationState, setQuestionValidationState] = useState<QuestionValidationState>({
    currentQuestion: undefined,
    completedQuestions: [],
    dodgedQuestions: [],
    competencyCoverage: {
      foundational: 0,
      transaction: 0,
      reporting: 0,
      practical: 0
    }
  });
  
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

  // NEW: Helper functions for question validation
  const extractAccountingTerms = (text: string): string[] => {
    const accountingTerms = [
      // Fundamental terms
      'accounting', 'equation', 'assets', 'liabilities', 'equity', 'balance', 'sheet',
      'debit', 'credit', 'double-entry', 'bookkeeping', 'journal', 'ledger',
      // Financial statements
      'income', 'statement', 'profit', 'loss', 'p&l', 'pnl', 'revenue', 'expense',
      'cash', 'flow', 'balance', 'financial', 'position',
      // Transaction terms
      'transaction', 'receivable', 'payable', 'accounts', 'voucher', 'invoice',
      'payment', 'receipt', 'sale', 'purchase', 'inventory',
      // Practical terms
      'depreciation', 'amortization', 'ratio', 'analysis', 'current', 'fixed',
      'working', 'capital', 'liquidity', 'solvency'
    ];
    
    const words = text.toLowerCase().split(/\W+/);
    return accountingTerms.filter(term => 
      words.some(word => word.includes(term) || term.includes(word))
    );
  };

  const getQuestionKeywords = (question: QuestionState): string[] => {
    const keywordMap: Record<string, string[]> = {
      'foundational': ['accounting', 'equation', 'assets', 'liabilities', 'equity', 'debit', 'credit', 'double-entry'],
      'transaction': ['transaction', 'receivable', 'payable', 'voucher', 'invoice', 'sale', 'purchase'],
      'reporting': ['balance', 'sheet', 'income', 'statement', 'cash', 'flow', 'financial', 'position'],
      'practical': ['depreciation', 'ratio', 'analysis', 'current', 'fixed', 'working', 'capital']
    };
    
    return keywordMap[question.competencyArea] || [];
  };

  // NEW: Response analysis engine
  const analyzeResponse = useCallback((
    userResponse: string, 
    currentQuestion?: QuestionState
  ): ResponseAnalysis => {
    if (!currentQuestion) {
      return {
        type: 'unclear',
        confidence: 0.3,
        reasoning: 'No current question to validate against'
      };
    }

    // Check for accounting keywords relevant to the question
    const accountingTerms = extractAccountingTerms(userResponse);
    const questionKeywords = getQuestionKeywords(currentQuestion);
    const hasRelevantTerms = accountingTerms.some(term => 
      questionKeywords.some(keyword => 
        keyword.toLowerCase().includes(term.toLowerCase()) || 
        term.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // Check for question engagement patterns
    const engagementPatterns = [
      /I think|I believe|In my opinion/i,
      /The answer is|It means|It refers to/i,
      /I would|I'd approach it by/i,
      /I'm not sure but|I don't know but|I think maybe/i,
      /let me think|from what I understand|as far as I know/i
    ];
    
    const showsEngagement = engagementPatterns.some(pattern => 
      pattern.test(userResponse)
    );

    // Check for pure conversation patterns
    const conversationPatterns = [
      /how are you|how's your day|nice weather/i,
      /thank you|thanks|that's interesting/i,
      /^(yes|no|ok|okay|sure)$/i,
      /good morning|good afternoon|hello|hi there/i,
      /how long have you been|do you like your job/i
    ];
    
    const isPureConversation = conversationPatterns.some(pattern => 
      pattern.test(userResponse.trim())
    ) && userResponse.trim().length < 50;

    // Determine response type
    if (hasRelevantTerms || showsEngagement) {
      return {
        type: 'question_addressed',
        confidence: hasRelevantTerms ? 0.9 : 0.6,
        accountingTerms,
        reasoning: hasRelevantTerms 
          ? 'Response contains relevant accounting terminology'
          : 'Response shows question engagement patterns'
      };
    }
    
    if (isPureConversation) {
      return {
        type: 'question_dodged',
        confidence: 0.8,  
        reasoning: 'Response is purely conversational without accounting content'
      };
    }
    
    return {
      type: 'unclear',
      confidence: 0.4,
      reasoning: 'Response analysis inconclusive - needs follow-up'
    };
  }, []);

  // NEW: Update question state based on analysis
  const updateQuestionState = useCallback((
    analysis: ResponseAnalysis,
    userResponse: string
  ): QuestionValidationState => {
    const newState = { ...questionValidationState };
    
    if (!newState.currentQuestion) return newState;

    const updatedQuestion: QuestionState = { ...newState.currentQuestion };
    
    if (analysis.type === 'question_addressed') {
      updatedQuestion.status = 'addressed';
      // Move to completed questions
      newState.completedQuestions = [...newState.completedQuestions, updatedQuestion];
      // Update competency coverage
      const competencyQuestions = newState.completedQuestions.filter(q => q.competencyArea === updatedQuestion.competencyArea);
      const coveragePercentage = Math.min(100, (competencyQuestions.length / 2) * 100); // Assuming 2 questions per competency for 100%
      
      newState.competencyCoverage = {
        ...newState.competencyCoverage,
        [updatedQuestion.competencyArea]: coveragePercentage
      };
      newState.currentQuestion = undefined;
      
    } else if (analysis.type === 'question_dodged') {
      updatedQuestion.attempts += 1;
      updatedQuestion.status = 'dodged';
      
      if (updatedQuestion.attempts >= updatedQuestion.maxAttempts) {
        // Max attempts reached, move to dodged questions and clear current
        newState.dodgedQuestions = [...newState.dodgedQuestions, updatedQuestion];
        newState.currentQuestion = undefined;
      } else {
        // Keep trying with updated attempt count
        newState.currentQuestion = updatedQuestion;
      }
    }
    
    // For unclear responses, just keep the current question unchanged
    setQuestionValidationState(newState);
    return newState;
  }, [questionValidationState]);

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
      // NEW: Analyze user response for question validation
      let responseAnalysis: ResponseAnalysis | null = null;
      if (questionValidationState.currentQuestion && !options?.skipStateTransition) {
        responseAnalysis = analyzeResponse(content, questionValidationState.currentQuestion);
        console.log('[ConversationOrchestrator] Response analysis:', responseAnalysis);
      }

      // Prepare request in Aestim's format
      const historyForAPI = convertToHistoryFormat(messagesRef.current);
      const requestBody = {
        history: historyForAPI,
        newUserMessage: content,
        mode: config.mode || 'prod',
        // NEW: Include question context for backend
        questionContext: {
          currentQuestion: questionValidationState.currentQuestion,
          responseAnalysis,
          competencyCoverage: questionValidationState.competencyCoverage
        }
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
      
      console.log('[ConversationOrchestrator] Raw AI response received:', {
        length: rawAiMessage?.length || 0,
        startsWithJson: rawAiMessage?.trim().startsWith('{'),
        containsJsonBlock: rawAiMessage?.includes('```json'),
        preview: rawAiMessage?.substring(0, 150) + '...'
      });

      // Check for interview termination signal
      if (typeof rawAiMessage === 'string' && rawAiMessage.includes('[END_INTERVIEW]')) {
        console.log('[ConversationOrchestrator] Interview termination signal received');
        transitionToState(ConversationState.IDLE);
        // Handle termination (could trigger navigation)
        return { terminated: true };
      }

      // AESTIM INTEGRATION: Parse response and handle interactive tasks
      const parsedResponse = parseAIResponse(rawAiMessage);
      
      // NEW: Update question state based on response analysis
      if (responseAnalysis && questionValidationState.currentQuestion) {
        updateQuestionState(responseAnalysis, content);
      }

      // Add AI message to conversation
      const aiMessage = addMessage('ai', parsedResponse.textForHistory, {
        isInteractive: parsedResponse.responseType === 'interactive',
        taskType: parsedResponse.problemData?.taskType,
        // NEW: Include question tracking in AI message metadata
        questionId: questionValidationState.currentQuestion?.id,
        questionStatus: responseAnalysis?.type === 'question_addressed' ? 'addressed' : 
                      responseAnalysis?.type === 'question_dodged' ? 'dodged' : 'pending'
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

  // Helper function to extract meaningful text from malformed JSON
  const extractTextFromMalformedJson = (rawMessage: string): string | null => {
    try {
      // Look for common patterns in malformed AI responses
      const patterns = [
        /"response":\s*"([^"]+)"/,
        /"message":\s*"([^"]+)"/,
        /"text":\s*"([^"]+)"/,
        /"content":\s*"([^"]+)"/
      ];
      
      for (const pattern of patterns) {
        const match = rawMessage.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // If no patterns match, try to find any quoted text that looks like a response
      const quotedTextRegex = /"([^"]{20,})"/g;
      const matches = [...rawMessage.matchAll(quotedTextRegex)];
      if (matches.length > 0) {
        // Return the longest quoted string, which is likely the main response
        return matches.reduce((longest, current) => 
          current[1].length > longest.length ? current[1] : longest, ''
        );
      }
      
      return null;
    } catch (e) {
      console.warn('[ConversationOrchestrator] Error extracting text from malformed JSON:', e);
      return null;
    }
  };

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
        // Clean up common JSON formatting issues
        let cleanJsonString = jsonString.trim();
        
        // Remove any trailing commas before closing braces/brackets
        cleanJsonString = cleanJsonString.replace(/,(\s*[}\]])/g, '$1');
        
        // Fix common quote issues
        cleanJsonString = cleanJsonString.replace(/'/g, '"');
        
        // Try to find and fix incomplete JSON objects
        const braces = (cleanJsonString.match(/\{/g) || []).length;
        const closingBraces = (cleanJsonString.match(/\}/g) || []).length;
        
        if (braces > closingBraces) {
          console.warn('[ConversationOrchestrator] Incomplete JSON detected, attempting to fix...');
          cleanJsonString += '}';
        }
        
        const parsedResponse = JSON.parse(cleanJsonString);
        textForHistory = parsedResponse.response || parsedResponse.message || "An interactive task is ready.";
        responseType = parsedResponse.type || parsedResponse.responseType || 'normal';
        problemData = parsedResponse.problem || parsedResponse.task || null;
        
        console.log('[ConversationOrchestrator] Successfully parsed JSON response:', {
          type: responseType,
          hasTask: !!problemData
        });
      } catch (e) {
        console.warn('[ConversationOrchestrator] Failed to parse JSON. Treating as plain text.', e);
        console.log('[ConversationOrchestrator] Raw JSON string that failed:', jsonString.substring(0, 200) + '...');
        
        // Try to extract meaningful text from malformed JSON
        textForHistory = extractTextFromMalformedJson(rawAiMessage) || rawAiMessage;
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
    
    // NEW: Question validation state
    questionValidationState,
    currentQuestion: questionValidationState.currentQuestion,
    competencyCoverage: questionValidationState.competencyCoverage,

    // Actions
    sendMessage,
    addMessage,
    transitionToState,
    startListening,
    startCalibration,
    completeSpeaking,
    resetConversation,
    cleanup,
    
    // NEW: Question validation actions
    analyzeResponse,
    updateQuestionState,

    // Utilities
    convertToHistoryFormat,
    
    // Configuration
    config
  };
};