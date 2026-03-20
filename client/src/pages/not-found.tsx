import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CalendarDays, Home } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-404-heading">
          Page not found
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Button
          onClick={() => navigate("/")}
          data-testid="button-go-home"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to calendar
        </Button>
      </div>
    </div>
  );
}
