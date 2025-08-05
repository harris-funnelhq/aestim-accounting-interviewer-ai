"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";

export interface CartesiaSpeakerHandle {
  stop: () => void;
}

interface CartesiaSpeakerProps {
  text: string;
  trigger?: boolean; // MOCKTAGON: Trigger-based activation
  mode?: "first" | "full"; // MOCKTAGON: Speaking modes  
  speechRate?: "slow" | "normal" | "fast"; // Speech speed: Cartesia enum values
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onComplete?: () => void; // MOCKTAGON: Completion callback
}

const CartesiaSpeaker = forwardRef<CartesiaSpeakerHandle, CartesiaSpeakerProps>(
  ({ text, trigger = false, mode = "full", speechRate = "normal", onSpeakingStateChange, onComplete }, ref) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const playbackTimeRef = useRef<number>(0);
    const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const lastSpokenTextRef = useRef<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Grace
    // const graceVoiceId = "a38e4e85-e815-43ab-acf1-907c4688dd6c";

    // Priya
    const graceVoiceId = "f6141af3-5f94-418c-80ed-a45d450e7e2e";

    // Janvi
    // const graceVoiceId = "7ea5e9c2-b719-4dc3-b870-5ba5f14d31d8";
    
    const pauseDurationMs = 500;

    const stopPlayback = () => {
      playingSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) { /* Ignore errors */ }
      });
      playingSourcesRef.current.clear();

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;

      if (isSpeaking) {
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
      }
      playbackTimeRef.current = 0;
      lastSpokenTextRef.current = text;
    };

    useImperativeHandle(ref, () => ({
      stop: stopPlayback,
    }));

    const splitSentences = (text: string): string[] => {
      const sentenceEndings = /([.?!])\s+/g;
      const sentences: string[] = [];
      let lastIndex = 0;
      text.replace(sentenceEndings, (match, _p1, offset) => {
        sentences.push(text.slice(lastIndex, offset + 1).trim());
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) {
        sentences.push(text.slice(lastIndex).trim());
      }
      return sentences.filter(Boolean);
    };

    const playPcmChunk = async (chunk: Uint8Array) => {
      if (!audioCtxRef.current) return;
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const float32 = new Float32Array(chunk.buffer);
      const buffer = audioCtx.createBuffer(1, float32.length, 44100);
      buffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      const nextTime = Math.max(now, playbackTimeRef.current);
      source.start(nextTime);

      playbackTimeRef.current = nextTime + buffer.duration;
      playingSourcesRef.current.add(source);

      source.onended = () => {
        playingSourcesRef.current.delete(source);
        if (playingSourcesRef.current.size === 0) {
          setTimeout(() => {
            setIsSpeaking(false);
            onSpeakingStateChange?.(false);
            onComplete?.(); // MOCKTAGON: Trigger completion callback
          }, pauseDurationMs);
        }
      };
    };

    const speakSentences = async (textToSpeak: string) => {
      if (isSpeaking || !textToSpeak) return;
      setIsSpeaking(true);
      onSpeakingStateChange?.(true);

      const sentences = splitSentences(textToSpeak);
      if (sentences.length === 0) {
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
        onComplete?.(); // MOCKTAGON: Call completion callback even when no sentences
        return;
      }

      const apiKey = import.meta.env.VITE_CARTESIA_API_KEY;
      if (!apiKey) {
        console.error("[Cartesia] Missing VITE_CARTESIA_API_KEY in your .env file!");
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
        onComplete?.(); // MOCKTAGON: Call completion callback on API key error
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }

      const contextId = `context-${Date.now()}`;
      const wsUrl = `wss://api.cartesia.ai/tts/websocket?api_key=${apiKey}&cartesia_version=2025-04-16`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        // MOCKTAGON: Support different speaking modes
        if (mode === "first") {
          // Only speak the first sentence
          const firstSentence = sentences[0];
          const message = {
            model_id: 'sonic-2',
            voice: { mode: 'id', id: graceVoiceId },
            language: 'en',
            context_id: contextId,
            transcript: firstSentence,
            continue: false,
            speed: speechRate, // Control speech speed (Cartesia enum)
            output_format: {
              container: 'raw',
              encoding: 'pcm_f32le',
              sample_rate: 44100,
            },
          };
          console.log('[CartesiaSpeaker] Sending message with speed:', speechRate, message);
          ws.send(JSON.stringify(message));
        } else {
          // Full mode: speak all sentences
          sentences.forEach((sentence, index) => {
            const message = {
              model_id: 'sonic-2',
              voice: { mode: 'id', id: graceVoiceId },
              language: 'en',
              context_id: contextId,
              transcript: sentence,
              continue: index !== sentences.length - 1,
              speed: speechRate, // Control speech speed (Cartesia enum)
              output_format: {
                container: 'raw',
                encoding: 'pcm_f32le',
                sample_rate: 44100,
              },
            };
            if (index === 0) console.log('[CartesiaSpeaker] Sending message with speed:', speechRate, message);
            ws.send(JSON.stringify(message));
          });
        }
      };

      ws.onmessage = async (event) => {
        try {
          const dataText = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
          const parsed = JSON.parse(dataText);
          if (parsed?.type === 'chunk' && parsed?.data) {
            const decoded = Uint8Array.from(atob(parsed.data), (c) => c.charCodeAt(0));
            playPcmChunk(decoded);
          }
        } catch { /* Not JSON, ignore */ }
      };

      ws.onerror = (err) => {
        console.error("[Cartesia] WebSocket error:", err);
        setIsSpeaking(false);
        onSpeakingStateChange?.(false);
        onComplete?.(); // MOCKTAGON: Call completion callback on WebSocket error
      };

      ws.onclose = () => {
        // Ensure completion callback is called if WebSocket closes unexpectedly
        if (isSpeaking && playingSourcesRef.current.size === 0) {
          setIsSpeaking(false);
          onSpeakingStateChange?.(false);
          onComplete?.();
        }
      };
    };

    useEffect(() => {
      // MOCKTAGON: Trigger-based activation - only speak when trigger is true or changes
      if (trigger && text && text !== lastSpokenTextRef.current) {
        lastSpokenTextRef.current = text;
        speakSentences(text);
      } else if (!trigger && text && text !== lastSpokenTextRef.current) {
        // Fallback: Auto-speak when trigger is false (backward compatibility)
        lastSpokenTextRef.current = text;
        speakSentences(text);
      }
    }, [text, trigger, mode, speechRate]);

    return <div className="hidden" />;
  }
);

export default CartesiaSpeaker;