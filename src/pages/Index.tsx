import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, Headphones, Mic, ShieldCheck, BrainCircuit, MessageSquare, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import bgImage from '@/assets/bg.jpg';

const Index = () => {
  return (
    <div className="relative flex items-center justify-center min-h-screen p-4">
      {/* Full-screen background image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center -z-10"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm"></div>
      </div>
      
      <div className="absolute top-4 right-4 text-sm text-white/80">
        Powered by <strong>Aestim AI</strong>
      </div>

      <Card className="w-full max-w-4xl mx-auto shadow-2xl rounded-2xl z-10 bg-white/10 backdrop-blur-lg border border-white/20 text-white animate-fade-in">
        <CardHeader className="text-center p-8">
          <CardTitle className="text-4xl font-extrabold tracking-tight">
            Accounting Assessment
          </CardTitle>
          <CardDescription className="text-xl text-white/80 pt-2">
            Welcome to your interactive evaluation session.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Before you begin:</h3>
              <ul className="space-y-3 text-white/90">
                <li className="flex items-center gap-3"><Headphones className="w-5 h-5 text-sky-400" /><span>Use headphones for the best experience.</span></li>
                <li className="flex items-center gap-3"><Mic className="w-5 h-5 text-sky-400" /><span>Ensure your microphone is enabled.</span></li>
                <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-sky-400" /><span>Find a quiet space to avoid interruptions.</span></li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BrainCircuit className="w-5 h-5" /> What to expect:</h3>
              <ul className="space-y-3 text-white/90">
                <li className="flex items-start gap-3"><MessageSquare className="w-5 h-5 mt-1 text-sky-400" /><span>The AI will ask a series of questions about accounting principles and scenarios.</span></li>
                <li className="flex items-start gap-3"><FileText className="w-5 h-5 mt-1 text-sky-400" /><span>Speak clearly and provide detailed answers. Your session is recorded for analysis.</span></li>
              </ul>
            </div>
          </div>
          <Link to="/interview" className="w-full">
            <Button variant="secondary" size="lg" className="w-full text-lg h-14 font-bold bg-white text-slate-900 hover:bg-slate-200 transition-colors shadow-lg">
              <PlayCircle className="w-6 h-6 mr-3" />
              Begin Assessment
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
