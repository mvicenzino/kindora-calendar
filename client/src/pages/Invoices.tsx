import { Mail, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Invoices() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-3 md:p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invoice Scanner
            </CardTitle>
            <CardDescription className="text-xs">
              Automatically find and track payment notices from your email
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6">
            <div className="relative inline-block mb-4">
              <DollarSign className="w-8 h-8 text-muted-foreground" />
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                Coming Soon
              </div>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Gmail Invoice Scanning
            </h3>
            <p className="text-muted-foreground text-xs mb-4 max-w-md mx-auto">
              This feature will automatically scan your Gmail for bills, invoices, and payment notices, 
              then help you add them as calendar reminders.
            </p>
            <p className="text-muted-foreground text-xs mb-6 max-w-md mx-auto">
              We're working on getting the necessary permissions to read your emails securely. 
              Check back soon!
            </p>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
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
