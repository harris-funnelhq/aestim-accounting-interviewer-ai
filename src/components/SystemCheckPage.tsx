import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Volume2, 
  Mic, 
  Wifi, 
  Focus, 
  RefreshCw, 
  HelpCircle, 
  CheckCircle, 
  XCircle,
  Play
} from "lucide-react";

interface SystemCheckPageProps {
  onStartAssessment: () => void;
}

export const SystemCheckPage = ({ onStartAssessment }: SystemCheckPageProps) => {
  const [microphoneStatus, setMicrophoneStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [speakerStatus, setSpeakerStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [hasReadInstructions, setHasReadInstructions] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup audio context and stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const testMicrophone = async () => {
    setMicrophoneStatus('testing');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        if (average > 10) {
          setMicrophoneStatus('success');
          setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
          }, 1000);
        } else {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      checkAudioLevel();
      
      // Auto-fail after 10 seconds
      setTimeout(() => {
        if (microphoneStatus === 'testing') {
          setMicrophoneStatus('error');
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        }
      }, 10000);
      
    } catch (error) {
      setMicrophoneStatus('error');
    }
  };

  const testSpeaker = () => {
    setSpeakerStatus('testing');
    
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    setTimeout(() => {
      setSpeakerStatus('success');
      audioContext.close();
    }, 600);
  };

  const dosList = [
    {
      icon: Focus,
      title: "Find a quiet space",
      description: "Choose a place where you won't be disturbed for the next 20 minutes."
    },
    {
      icon: Mic,
      title: "Use a good microphone",
      description: "A headset with a microphone is highly recommended for the best audio quality."
    },
    {
      icon: Wifi,
      title: "Check your connection",
      description: "A stable internet connection is necessary to complete the assessment."
    },
    {
      icon: CheckCircle,
      title: "Be yourself",
      description: "This is an opportunity to showcase your unique skills. Relax and answer to the best of your ability."
    }
  ];

  const dontsList = [
    {
      icon: RefreshCw,
      title: "Don't refresh the page",
      description: "Refreshing or closing the browser window will end your assessment."
    },
    {
      icon: HelpCircle,
      title: "Don't seek outside help",
      description: "This assessment must be completed independently."
    }
  ];

  const isReadyToStart = microphoneStatus === 'success' && speakerStatus === 'success' && hasReadInstructions;

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Before You Begin</h1>
          <p className="text-lg text-muted-foreground">
            Let's make sure everything is set up correctly for your assessment
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Instructions */}
          <div className="space-y-6">
            {/* Do's */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                How to Succeed
              </h2>
              <div className="space-y-4">
                {dosList.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <item.icon className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Don'ts */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" />
                Important Precautions
              </h2>
              <div className="space-y-4">
                {dontsList.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <item.icon className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - System Check */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">System Check</h2>
              
              {/* Microphone Test */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">Microphone Check</span>
                  </div>
                  {microphoneStatus === 'success' && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Working
                    </Badge>
                  )}
                  {microphoneStatus === 'error' && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                      <XCircle className="w-3 h-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Please say a few words. We'll show you a visualizer if your microphone is working.
                </p>
                
                {microphoneStatus === 'testing' && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 bg-assessment-listening rounded-full transition-all duration-100"
                          style={{
                            height: `${Math.max(4, (audioLevel / 255) * 32 + Math.random() * 8)}px`
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">Listening...</span>
                  </div>
                )}
                
                <Button
                  variant={microphoneStatus === 'success' ? 'success' : 'default'}
                  onClick={testMicrophone}
                  disabled={microphoneStatus === 'testing'}
                  className="w-full"
                >
                  {microphoneStatus === 'testing' ? 'Testing...' : 
                   microphoneStatus === 'success' ? 'Microphone Working!' : 'Test Microphone'}
                </Button>
              </div>

              {/* Speaker Test */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">Speaker Check</span>
                  </div>
                  {speakerStatus === 'success' && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Working
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  Click the button to play a test sound.
                </p>
                
                <Button
                  variant={speakerStatus === 'success' ? 'success' : 'outline'}
                  onClick={testSpeaker}
                  disabled={speakerStatus === 'testing'}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {speakerStatus === 'testing' ? 'Playing...' : 
                   speakerStatus === 'success' ? 'Sound Played Successfully!' : 'Play Test Sound'}
                </Button>
              </div>

              {/* Final Confirmation */}
              <div className="pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="instructions"
                    checked={hasReadInstructions}
                    onCheckedChange={(checked) => setHasReadInstructions(checked === true)}
                  />
                  <label
                    htmlFor="instructions"
                    className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    I have read the instructions and my system is ready
                  </label>
                </div>
              </div>
            </Card>

            {/* Start Assessment Button */}
            <Button
              variant="assessment"
              size="lg"
              onClick={onStartAssessment}
              disabled={!isReadyToStart}
              className="w-full text-lg py-6 h-auto"
            >
              Start Assessment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};