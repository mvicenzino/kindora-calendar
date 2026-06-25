import { ShieldCheck } from "lucide-react";

export function UnverifiedAppNote({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-muted/40 p-3 flex gap-2.5 ${className}`}
      data-testid="note-google-unverified"
    >
      <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        First time connecting? Google may show a screen that says{" "}
        <span className="font-medium text-foreground">"Google hasn't verified this app."</span>{" "}
        That's expected while Kindora finishes Google's review — your information stays safe. Tap{" "}
        <span className="font-medium text-foreground">Advanced</span>, then{" "}
        <span className="font-medium text-foreground">Continue to kindora.ai</span> to finish connecting.
      </p>
    </div>
  );
}
