"use client";

export interface StreamMetrics {
  noiseFloor: number;
  silenceThreshold: number;
  speechThreshold: number;
  isCalibrating: boolean;
  currentRms: number;
  silenceCountdown: number;
  lastCalibration: Date;
}

export default class LiveAudioStreamer {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isStreaming = false;
  private isMuted = false;

  // --- ADDING MISSING PROPERTIES ---
  private silenceTimer: number | null = null;
  private readonly SILENCE_IDLE_MS = 4000;
  private lastTranscript = "";
  // --- END OF ADDITIONS ---

  private sessionId: string;
  private config: any;
  private onTranscriptUpdate: (txt: string, ready: boolean) => void;
  private onMetricsUpdate: (m: StreamMetrics) => void;
  private onConnectionOpen: () => void;
  private onConnectionError: (error: string) => void;
  private audioDeviceId?: string;
  private wsUrl: string;

  constructor(
    sessionId: string,
    config: any,
    onTranscriptUpdate: (txt: string, ready: boolean) => void,
    onMetricsUpdate: (m: StreamMetrics) => void,
    onConnectionOpen: () => void,
    onConnectionError: (error: string) => void,
    wsUrl: string,
    audioDeviceId?: string
  ) {
    this.sessionId = sessionId;
    this.config = config;
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onMetricsUpdate = onMetricsUpdate;
    this.onConnectionOpen = onConnectionOpen;
    this.onConnectionError = onConnectionError;
    this.wsUrl = wsUrl;
    this.audioDeviceId = audioDeviceId;
  }

  // --- ADDING MISSING METHODS FOR SILENCE DETECTION ---
  private clearSilenceTimer() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private startSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = window.setTimeout(() => {
      this.silenceTimer = null;
      this.finishUtterance();
    }, this.SILENCE_IDLE_MS);
  }

  private finishUtterance() {
    const txt = this.lastTranscript.trim();
    console.log(`[LiveAudioStreamer] Silence timer fired. Finishing utterance with text: "${txt}"`);
    if (txt) {
      this.onTranscriptUpdate(txt, true);
    }
    this.lastTranscript = "";
  }
  // --- END OF ADDITIONS ---

  async startStreaming() {
    if (this.isStreaming) {
      console.log("[LiveAudioStreamer] Already streaming.");
      return;
    }
    this.isStreaming = true;
    console.log("[LiveAudioStreamer] Attempting to start streaming...");

    try {
      // Ensure the URL has a trailing slash before appending the session ID.
      const baseUrl = this.wsUrl.endsWith('/') ? this.wsUrl : `${this.wsUrl}/`;
      const fullWsUrl = `${baseUrl}${this.sessionId}`;
      
      console.log(`[LiveAudioStreamer] Connecting to WebSocket at ${fullWsUrl}`);
      this.ws = new WebSocket(fullWsUrl);
    } catch (error) {
      console.error("[LiveAudioStreamer] Failed to create WebSocket.", error);
      this.onConnectionError("Failed to initialize connection.");
      this.cleanup();
      return;
    }

    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = async () => {
      console.log("[LiveAudioStreamer] WebSocket connection opened successfully.");
      this.onConnectionOpen();

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "config", payload: this.config }));
      }

      try {
        const audioConstraint = this.audioDeviceId ? { deviceId: { exact: this.audioDeviceId } } : true;
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      } catch (err) {
        console.error("[LiveAudioStreamer] ERROR: Could not get microphone access.", err);
        this.onConnectionError("Microphone access denied.");
        this.cleanup();
        return;
      }

      this.audioContext = new AudioContext({ sampleRate: this.config.sample_rate });
      try {
        await this.audioContext.audioWorklet.addModule("/recorder-worklet.js");
      } catch (err) {
        console.error("[LiveAudioStreamer] ERROR: Failed to load audio worklet.", err);
        this.onConnectionError("Audio processor failed.");
        this.cleanup();
        return;
      }

      if (this.audioContext && this.mediaStream) {
        this.workletNode = new AudioWorkletNode(this.audioContext, "recorder-processor");
        this.workletNode.port.onmessage = (ev: MessageEvent) => {
          const msg = ev.data;
          if (msg.type === "metrics") {
            this.onMetricsUpdate(msg);
          } else if (msg instanceof Float32Array && this.ws?.readyState === WebSocket.OPEN && !this.isMuted) {
            const pcm = msg;
            const int16 = Int16Array.from(pcm, v => {
              const s = Math.max(-1, Math.min(1, v));
              return s < 0 ? s * 0x8000 : s * 0x7fff;
            });
            this.ws.send(int16.buffer);
          }
        };
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.workletNode).connect(this.audioContext.destination);
      }
    };

    this.ws.onmessage = (ev) => {
      console.log("[LiveAudioStreamer] WebSocket message received:", ev.data);
      let t: string;
      try {
        // This line was missing, causing the "data is not defined" error.
        const data = JSON.parse(ev.data as string);
        t = data.transcript ?? JSON.stringify(data);
      } catch {
        t = (ev.data as string).trim();
      }
      this.lastTranscript = t;
      this.onTranscriptUpdate(t, false);
      this.startSilenceTimer();
    };

    this.ws.onclose = (event) => {
      console.log(`[LiveAudioStreamer] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      if (!event.wasClean) {
        this.onConnectionError("Connection closed unexpectedly.");
      }
      this.cleanup();
    };

    this.ws.onerror = (err) => {
      console.error("[LiveAudioStreamer] WebSocket error.", err);
      this.onConnectionError("WebSocket connection failed.");
      this.cleanup();
    };
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  stopStreaming() {
    this.cleanup();
  }

  private cleanup() {
    this.clearSilenceTimer(); // Add this call back
    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(console.error);
    }
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
    }
    this.ws = null;
    this.isStreaming = false;
    this.lastTranscript = ""; // Add this property reset back
  }
}