import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Users,
  Calendar,
  Pill,
  FileText,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Search,
  Heart,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const logo = "/kindora-logo.jpeg";

type FAQItem = {
  question: string;
  answer: string;
  category: string;
};

const FAQ_ITEMS: FAQItem[] = [
  { category: "Getting Started", question: "How do I invite family members?", answer: "Go to Settings → Family, then click 'Invite Member'. You'll get a unique invite link or code you can share via text or email. They'll create their own account and be added to your family automatically." },
  { category: "Getting Started", question: "How do I add a caregiver?", answer: "Go to Settings → Family → Invite Member, and select the 'Caregiver' role. Caregivers get access to the Care dashboard including time tracking and medication logging, but have limited access to personal family events." },
  { category: "Getting Started", question: "How do I switch between multiple families?", answer: "Use the family selector at the top of the sidebar. If you belong to more than one family group, you can switch between them there. Each family has its own calendar, members, and care data." },
  { category: "Calendar", question: "How do I create a recurring event?", answer: "When creating or editing an event, scroll down to the 'Repeat' section and choose your frequency — daily, weekly, biweekly, monthly, or yearly. You can also set an end date or number of occurrences." },
  { category: "Calendar", question: "How do I use the AI schedule parser?", answer: "Tap the sparkle/wand icon in the calendar header or use 'Import Schedule'. You can paste text, upload an image, or import a PDF. Kindora's AI will extract the events and add them to your calendar automatically." },
  { category: "Caregiving", question: "How do I log a medication?", answer: "Go to the Care section in the sidebar. Under the Medications tab, you'll see all scheduled medications. Tap 'Given' next to a medication to log it as administered. You can also view the full log history." },
  { category: "Caregiving", question: "How does caregiver time tracking work?", answer: "In the Care section, caregivers can log their hours under the Time Tracking tab. Family owners can set an hourly pay rate in Settings. The dashboard shows total hours worked and earnings for the current period." },
  { category: "Caregiving", question: "What is Emergency Bridge mode?", answer: "Emergency Bridge creates a temporary secure link you can share with a doctor or emergency contact. It gives them read-only access to relevant care information — medications, conditions, emergency contacts — without needing a Kindora account." },
  { category: "Documents", question: "What can I store in the Documents vault?", answer: "Insurance cards, medical records, care plans, legal documents, and advance directives. Only family owners and caregivers with permission can access them." },
  { category: "Account", question: "How do I contact support or give feedback?", answer: "Use the Contact Support button below, or email us directly at mvicenzino@gmail.com. During beta, every message goes directly to our founder and we typically respond within 24 hours." },
];

const CATEGORIES = ["All", "Getting Started", "Calendar", "Caregiving", "Documents", "Account"];

const CATEGORY_ICONS: Record<string, any> = {
  "Getting Started": Users,
  Calendar: Calendar,
  Caregiving: Heart,
  Documents: FileText,
  Account: MessageSquare,
};

export default function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = FAQ_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = search.trim() === "" || item.question.toLowerCase().includes(search.toLowerCase()) || item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Help Center - Kindora</title>
        <meta name="description" content="Get help with Kindora — family calendar, caregiver tools, medication logging, and more." />
      </Helmet>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button></Link>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Kindora" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-bold text-foreground">Kindora Help</span>
            </div>
          </div>
          <Link href="/support"><Button size="sm" variant="outline" className="gap-2"><MessageSquare className="w-4 h-4" />Contact Support</Button></Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-['Space_Grotesk']">How can we help?</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Find answers to common questions about Kindora's family calendar and caregiver tools.</p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search help articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {search === "" && activeCategory === "All" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
              { label: "Invite Members", icon: Users },
              { label: "Add Caregiver", icon: Heart },
              { label: "Log Medication", icon: Pill },
              { label: "Emergency Bridge", icon: AlertTriangle },
            ].map((item) => (
              <button key={item.label} onClick={() => setSearch(item.label.toLowerCase())} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/20 transition-all text-center group">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat !== "All" ? CATEGORY_ICONS[cat] : null;
            return (
              <button key={cat} onClick={() => { setActiveCategory(cat); setOpenIndex(null); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"}`}>
                {Icon && <Icon className="w-3 h-3" />}
                {cat}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 mb-12">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term or browse by category</p>
            </div>
          ) : filtered.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className={`rounded-xl border transition-all ${isOpen ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-primary/20"}`}>
                <button onClick={() => setOpenIndex(isOpen ? null : index)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/15 whitespace-nowrap">{item.category}</span>
                    <span className="text-sm font-medium text-foreground">{item.question}</span>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed ml-16">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Still need help?</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">During beta, every support message goes directly to our founder. We typically respond within 24 hours.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/support"><Button className="gap-2">Contact Support<ArrowRight className="w-4 h-4" /></Button></Link>
            <a href="mailto:mvicenzino@gmail.com"><Button variant="outline">Email directly</Button></a>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 md:px-6 py-6 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">© 2026 Kindora Family, Inc.</p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
