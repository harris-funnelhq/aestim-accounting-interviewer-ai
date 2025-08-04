import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Users, CheckCircle } from "lucide-react";

interface WelcomePageProps {
  candidateName?: string;
  jobTitle?: string;
  companyName?: string;
  onGetStarted: () => void;
}

export const WelcomePage = ({
  candidateName = "Krishna",
  jobTitle = "Accountant",
  companyName = "Graydot Technologies",
  onGetStarted
}: WelcomePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">TC</span>
          </div>
          <span className="text-lg font-semibold text-foreground">{companyName}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-primary">Aestim</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full">
          <Card className="p-8 shadow-assessment-lg border-0 bg-card/80 backdrop-blur-sm">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Welcome, {candidateName}
              </h1>
              <p className="text-xl text-muted-foreground">
                Your assessment for the <span className="font-semibold text-foreground">{jobTitle}</span> position at{" "}
                <span className="font-semibold text-foreground">{companyName}</span> is ready.
              </p>
            </div>

            {/* Key Information */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Assessment Overview</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Duration</div>
                    <div className="text-sm text-muted-foreground">Approx. 20 minutes</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Format</div>
                    <div className="text-sm text-muted-foreground">Conversational & practical</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Requirements</div>
                    <div className="text-sm text-muted-foreground">Computer & microphone</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button 
                variant="assessment" 
                size="lg" 
                onClick={onGetStarted}
                className="text-lg px-12 py-6 h-auto"
              >
                Get Started
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Click the button above when you're ready to begin your assessment
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};