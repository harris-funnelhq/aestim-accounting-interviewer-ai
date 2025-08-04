import { useState, useRef, useCallback } from 'react';

interface SpeechToTextOptions {
  onTranscript: (transcript: string) => void;
  onFinish: (transcript: string) => void;
}

export const useSpeechToText = ({ onTranscript, onFinish }: SpeechToTextOptions) => {
  const [isListening, setIsListening] = useState(false);
  // NEW: State to track if we are actively receiving speech from the STT service.
  const [isReceivingSpeech, setIsReceivingSpeech] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessorNode(1024, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2-general&interim_results=true&endpointing=200', ['token', import.meta.env.VITE_DEEPGRAM_API_KEY]);
      socketRef.current = socket;

      socket.onopen = () => {
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          socket.send(inputData);
        };
        setIsListening(true);
        // IMPORTANT: Do not set isReceivingSpeech here.
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const transcript = data.channel.alternatives[0].transcript;
        if (transcript) {
          // NEW: Set receiving state to true only when we get a transcript.
          setIsReceivingSpeech(true);
          onTranscript(transcript);
        }
        if (data.is_final) {
          onFinish(transcript);
        }
      };

      socket.onclose = () => {
        stop();
      };
      socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        stop();
      };

    } catch (error) {
      console.error('Error starting speech-to-text:', error);
    }
  }, [isListening, onTranscript, onFinish]);

  const stop = useCallback(() => {
    if (!isListening) return;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    
    setIsListening(false);
    // NEW: Reset the receiving state when listening stops.
    setIsReceivingSpeech(false);
  }, [isListening]);

  return { isListening, isReceivingSpeech, start, stop };
};