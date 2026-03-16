import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, HelpCircle, MessageSquare, ArrowRight, Users, Calendar, Heart, Pill, AlertTriangle, FileText, Search, ExternalLink } from "lucide-react";

type FAQItem = { question: string; answer: string; icon: any; };

const QUICK_FAQ: FAQItem[] = [
  { icon: Users, question: "How do I invite family members?", answer: "Go to Settings → Family → Invite Member. Share the invite link or code via text or email." },
  { icon: Heart, question: "How do I add a caregiver?", answer: "Settings → Family → Invite Member, then select the 'Caregiver' role. They'll get access to the Care dashboard." },
  { icon: Calendar, question: "How do I create a recurring event?", answer: "When creating an event, scroll to the 'Repeat' section and choose your frequency — daily, weekly, monthly, and more." },
  { icon: Pill, question: "How do I log a medication?", answer: "Go to Care in the sidebar → Medications tab. Tap 'Given' next to any scheduled medication to log it." },
  { icon: AlertTriangle, question: "What is Emergency Bridge?", answer: "Creates a temporary secure link for doctors or emergency contacts giving them read-only care info without needing an account." },
  { icon: FileText, question: "What goes in the Documents vault?", answer: "Insurance cards, medical records, care plans, legal documents — anything important your caregiving team might need." },
];

interface HelpDrawerProps { open: boolean; onClose: () => void; }

export default function HelpDrawer({ open, onClose }: HelpDrawerProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = QUICK_FAQ.filter((item) =>
    search.trim() === "" ||
    item.question.toLowerCase().includes(search.toLowerCase()) ||
    item.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-primary" />
            </div>
            <SheetTitle className="text-base font-bold text-foreground font-['Space_Grotesk']">Help & Support</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search help..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Common Questions</p>
            <div className="space-y-1.5">
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No results found</p>
                </div>
              ) : filtered.map((item, index) => {
                const isOpen = openIndex === index;
                const Icon = item.icon;
                return (
                  <div key={index} className={`rounded-lg border transition-all ${isOpen ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-primary/20"}`}>
                    <button onClick={() => setOpenIndex(isOpen ? null : index)} className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-foreground leading-snug">{item.question}</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 ml-12">
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-4">
            <Link href="/help" onClick={onClose}>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/20 transition-all group">
                <div className="flex items-center gap-2.5">
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium text-foreground">View full Help Center</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </Link>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4 flex-shrink-0 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3">Can't find what you need? We respond within 24 hours.</p>
          <div className="flex gap-2">
            <Link href="/support" onClick={onClose} className="flex-1">
              <Button size="sm" className="w-full gap-1.5 text-xs"><MessageSquare className="w-3.5 h-3.5" />Contact Support</Button>
            </Link>
            <a href="mailto:mvicenzino@gmail.com" className="flex-1">
              <Button size="sm" variant="outline" className="w-full text-xs">Email us</Button>
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
