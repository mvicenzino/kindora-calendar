import { Link } from "wouter";
const logoLight = "/kindora-logo-light.png";
const logoDark = "/kindora-logo.jpeg";

export default function AppFooter() {
  return (
    <footer className="border-t border-border bg-card backdrop-blur-sm px-4 md:px-6 py-6" data-testid="app-footer">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoLight} alt="Kindora" className="block dark:hidden w-5 h-5 rounded-sm" />
            <img src={logoDark} alt="Kindora" className="hidden dark:block w-5 h-5 rounded-sm" />
            <span className="text-muted-foreground text-xs">
              © {new Date().getFullYear()} Kindora Family, Inc.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground text-xs transition-colors" data-testid="footer-link-terms">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground text-xs transition-colors" data-testid="footer-link-privacy">
              Privacy Policy
            </Link>
            <a href="https://kindora.ai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground text-xs transition-colors" data-testid="footer-link-kindora">
              Kindora.ai
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
