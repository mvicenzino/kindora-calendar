import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ResourceDetail, RESOURCES, SLUG_TO_RESOURCE } from "@/components/ResourcesSection";

const logo = "/kindora-logo.jpeg";

const CATEGORY_STYLES: Record<string, string> = {
  Eldercare:             "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Parenting:             "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Well-Being":          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Sandwich Generation": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const TYPE_STYLES: Record<string, string> = {
  Checklist:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Assessment: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  Template:   "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Guide:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const RESOURCE_INTROS: Record<string, { headline: string; body: string }> = {
  "aging-parents": {
    headline: "Be prepared before a crisis hits.",
    body: "When an aging parent faces a health emergency, finding the right documents and contacts under pressure is overwhelming. This checklist helps adult children gather essential personal, medical, financial, and legal information in advance — so it's there when it matters most.",
  },
  "cant-live-alone": {
    headline: "Recognize the signs and know what to do next.",
    body: "Deciding that a parent can no longer safely live independently is one of the hardest transitions families face. This checklist walks you through warning signs to watch for, home safety modifications to consider, care options available, and how to approach the difficult conversation with compassion.",
  },
  "hospital-discharge": {
    headline: "The days after discharge are the highest-risk period.",
    body: "Hospital readmissions spike in the first week after discharge — often because families aren't sure what to watch for or what to do. This step-by-step checklist covers medication management, follow-up appointments, warning signs, and home preparation so you can support a safe, smooth recovery.",
  },
  "medicare-guide": {
    headline: "Medicare and Medicaid, explained without the jargon.",
    body: "Most families don't understand the difference between Medicare and Medicaid until they desperately need to. This plain-English guide breaks down what each program covers, who qualifies, what falls through the cracks, and what happens when a parent needs long-term or nursing home care.",
  },
  "family-meeting": {
    headline: "Keep everyone aligned, decisions documented.",
    body: "When multiple family members are involved in caregiving, miscommunication and dropped responsibilities are common. This fillable, printable agenda helps families run productive meetings — covering care updates, task assignments, financial decisions, and open questions — so nothing falls through the cracks.",
  },
  "burnout-assessment": {
    headline: "Caregiver burnout is real. This tool helps you spot it early.",
    body: "Research shows that family caregivers experience depression, anxiety, and physical illness at significantly higher rates than non-caregivers. This 10-question self-assessment takes two minutes and gives you an honest picture of where you stand — so you can get support before burnout becomes a crisis.",
  },
  "er-guide": {
    headline: "Know where to go before you're in a panic.",
    body: "When someone gets hurt or sick, the instinct is often to go to the ER — even when urgent care or home monitoring would be safer, faster, and far less expensive. This quick-reference guide helps you make the right call for the most common symptoms in kids and adults.",
  },
  "pediatric-info": {
    headline: "Every caregiver and babysitter should have this.",
    body: "In an emergency, seconds matter and memory fails. This fillable, printable info sheet captures your child's doctors, current medications, allergies, insurance details, and emergency contacts in one place — ready to hand to a babysitter, school nurse, or ER intake team.",
  },
};

export default function PublicResourceDetail({ params }: { params: { slug: string } }) {
  const [, navigate] = useLocation();
  const resource = SLUG_TO_RESOURCE[params.slug];

  if (!resource) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-foreground">Resource not found</h1>
        <p className="text-muted-foreground text-sm">This resource doesn't exist or may have moved.</p>
        <Link href="/resources">
          <Button variant="outline">Browse all resources</Button>
        </Link>
      </div>
    );
  }

  const intro = RESOURCE_INTROS[resource.id];
  const related = RESOURCES.filter(r => r.id !== resource.id && (r.category === resource.category || r.type === resource.type)).slice(0, 3);
  const Icon = resource.icon;

  const pageTitle = `${resource.title} | Free Caregiver Resource — Kindora`;
  const pageDescription = intro
    ? `${intro.headline} ${resource.description}`
    : resource.description;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={`${resource.title} — Kindora`} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://kindora.ai/resources/${resource.slug}`} />
      </Helmet>

      {/* Minimal nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Kindora" className="w-7 h-7 rounded-md" />
              <span className="font-bold text-base tracking-tight">Kindora</span>
            </a>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/resources">
              <Button variant="ghost" size="sm" data-testid="button-back-resources">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                All resources
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" data-testid="button-resource-detail-signin">
                Sign in free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 pt-5">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap" aria-label="Breadcrumb">
          <Link href="/resources">
            <a className="hover:text-foreground transition-colors">Free Caregiver Resources</a>
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-foreground">{resource.title}</span>
        </nav>
      </div>

      {/* Page heading */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-6">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge variant="outline" className={`text-xs ${CATEGORY_STYLES[resource.category]}`}>
            {resource.category}
          </Badge>
          <Badge variant="outline" className={`text-xs ${TYPE_STYLES[resource.type]}`}>
            {resource.type}
          </Badge>
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">{resource.title}</h1>
            <p className="text-sm text-muted-foreground">{resource.description}</p>
          </div>
        </div>

        {intro && (
          <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 mb-2">
            <p className="text-sm font-semibold text-foreground mb-1">{intro.headline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{intro.body}</p>
          </div>
        )}
      </div>

      {/* Resource content */}
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <ResourceDetail
          id={resource.id}
          familyId=""
          onBack={() => navigate("/resources")}
        />
      </div>

      {/* Related resources */}
      {related.length > 0 && (
        <div className="border-t border-border/40 bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <h2 className="text-base font-semibold text-foreground mb-4">Related resources</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {related.map(r => {
                const RIcon = r.icon;
                return (
                  <Link key={r.id} href={`/resources/${r.slug}`}>
                    <a className="group flex flex-col gap-2 rounded-lg border border-border/50 bg-card/50 p-3 hover-elevate">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <RIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${TYPE_STYLES[r.type]}`}>
                          {r.type}
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-snug group-hover:text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.description}</p>
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="border-t border-border/40 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Want to save your progress, coordinate with family, and access your full care circle?
          </p>
          <Link href="/">
            <Button data-testid="button-resource-detail-signup-cta">
              Create a free Kindora account
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">No credit card required</p>
        </div>
      </div>
    </div>
  );
}
