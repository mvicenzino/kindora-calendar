import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ResourcesSection } from "@/components/ResourcesSection";
import { ArrowLeft } from "lucide-react";

const logo = "/kindora-logo.jpeg";

export default function PublicResources() {
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Kindora" className="w-7 h-7 rounded-md" />
              <span className="font-bold text-base tracking-tight">Kindora</span>
            </a>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" data-testid="button-resources-signin">
                Sign in to save your progress
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Page heading */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Free Caregiver Resources
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          Checklists, guides, templates, and assessments — free to use, no account needed.
          Create a free Kindora account to save your progress across devices.
        </p>
      </div>

      {/* Resources */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <ResourcesSection familyId="" />
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-border/40 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Want to save your progress, coordinate with family, and access your full care circle?
          </p>
          <Link href="/">
            <Button data-testid="button-resources-signup-cta">
              Create a free Kindora account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
