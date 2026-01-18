import { Mail, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Invoices() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="titanium-glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invoice Scanner
            </CardTitle>
            <CardDescription className="text-white/60">
              Automatically find and track payment notices from your email
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <div className="relative inline-block mb-6">
              <DollarSign className="w-20 h-20 text-white/30" />
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Coming Soon
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Gmail Invoice Scanning
            </h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">
              This feature will automatically scan your Gmail for bills, invoices, and payment notices, 
              then help you add them as calendar reminders.
            </p>
            <p className="text-white/50 text-sm mb-8 max-w-md mx-auto">
              We're working on getting the necessary permissions to read your emails securely. 
              Check back soon!
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="border border-white/20"
              data-testid="button-back-to-calendar"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Back to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
