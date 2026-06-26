import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Calendar, MessageCircle, FileText, Image, Heart, Settings, Sparkles, HelpCircle, MessageSquarePlus, Loader2, Activity, BookOpen, ArrowRight, Shield, History, LayoutDashboard, CheckSquare, Trophy, UtensilsCrossed } from "lucide-react";
import HelpDrawer from "./HelpDrawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const logo = "/kindora-logo.jpeg";

type NavItemType = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const familyNavItems: NavItemType[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Chores & Rewards", url: "/chores", icon: Trophy },
  { title: "Meal Planner", url: "/meals", icon: UtensilsCrossed },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Family Vault", url: "/documents", icon: FileText },
  { title: "Memories", url: "/memories", icon: Image },
  { title: "Health", url: "/health", icon: Activity },
  { title: "Advisor", url: "/advisor", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

const caregiverNavItems = [
  { title: "Care Dashboard", url: "/care", icon: Heart },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Settings", url: "/settings", icon: Settings },
];

const RELEASE_NOTES = [
  {
    date: "June 2026",
    changes: [
      "Meet Kira's Meal Planner — tell it your family size, which days and meals, and any allergies or dislikes, and it builds a full week of meals plus one organized grocery list (find it under Meals). Email or print any plan.",
      "Your AI helper is now named Kira everywhere — one friendly, consistent name across the whole app",
      "Kira now knows your family — add your preferences (allergies, foods you avoid, routines) during setup or in Settings → Family, and Kira remembers them so you never have to re-explain your household",
      "Two-way Google Calendar sync — events now flow both directions between Kindora and your Google Calendar",
      "Sign in with Google — faster, password-free login",
      "Forgot your password? You can now reset it yourself, and verify your email to keep your account secure",
      "Download your data or delete your account anytime from Settings — full control over your information",
      "Merge duplicate family members — if the same person showed up twice, you can now combine them into one from Settings → Family, keeping all their events and history. New sign-ins no longer create duplicates.",
      "Connect Google Calendar right from setup — an optional step when you first create your family",
      "New 'Why Kindora' video page to share what Kindora is all about, plus an updated privacy policy with clear Google data disclosures",
    ],
  },
  {
    date: "May 2026",
    changes: [
      "Kindora Family Plan subscriptions launched — and every feature is free for you during the beta",
      "Help & Support is now a prominent button at the top of the sidebar, so getting help is always one tap away",
      "Smarter AI calendar — Kira can now update and reschedule existing events, and repeating events stay anchored to the right start date",
      "Snap a school form (like a lunch menu) and have its items added straight to your family calendar",
      "Calendar and event polish, plus security hardening to better protect your family's information",
      "Fixed horizontal scrolling so every page sits correctly on any screen size",
    ],
  },
  {
    date: "Apr 10, 2026",
    changes: [
      "New Tasks feature — family members can create, assign, and prioritize tasks right from the Care dashboard; caregivers can check them off as done",
      "Tasks widget added to the Family Dashboard so your to-do list is always visible alongside today's schedule",
      "Tasks support priority levels (high/normal/low), family member assignment, and optional due dates",
      "Onboarding fix: family members typed but not added with the + button are now automatically saved when you continue — no one gets left out",
      "Caregiver invite description updated to accurately reflect permissions: view events, complete tasks, log medications",
    ],
  },
  {
    date: "April 2026",
    changes: [
      "New Family Dashboard is now your home — see today's schedule, upcoming events, medications, and family messages all in one place",
      "Kira now writes a personalized daily insight on your dashboard based on what's actually happening with your family",
      "Ask Kira anything right from the dashboard — just type and go, no need to open a separate page",
      "Events synced from Google Calendar are marked with a blue G badge so you always know where they came from",
      "Video meeting links (Zoom, Google Meet, Teams) are now detected automatically in events and shown as a tap-to-join button",
      "Google Calendar sync: choose which of your calendars to import and sync on demand from Settings → Import",
    ],
  },
  {
    date: "March 2026",
    changes: [
      "Stripe checkout now works on the live site (falls back to test mode until live keys are added)",
      "Kira chat: delete button now always visible, with a confirmation before deleting",
      "Character limits added to all notes, messages, and feedback text fields",
      "Public Resources page launched at /resources — accessible without login",
      "Landing page now features a Caregiver Resources preview section",
      "AI calendar bar now understands reschedule and move requests, and confirms the change with a summary card",
      "Date picker in the event editor replaced with a reliable cross-browser calendar",
    ],
  },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { activeFamily, activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { setOpenMobile } = useSidebar();
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackComments, setFeedbackComments] = useState("");
  const { toast } = useToast();

  const latestReleaseId = RELEASE_NOTES[0]?.date ?? "";
  const SEEN_KEY = user?.id ? `kindora_whatsnew_seen:${user.id}` : "kindora_whatsnew_seen";

  const markReleaseNotesSeen = () => {
    try {
      if (latestReleaseId) localStorage.setItem(SEEN_KEY, latestReleaseId);
    } catch {
      /* ignore storage errors (e.g. private mode) */
    }
  };

  // Auto-open "What's New" once per release. A user only sees it when the
  // latest release differs from what they last dismissed, then it stays
  // closed until the next update. Skips demo sessions.
  useEffect(() => {
    if (!user || (user as any).isDemo) return;
    if (!latestReleaseId) return;
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen !== latestReleaseId) {
        setReleaseNotesOpen(true);
      }
    } catch {
      /* ignore storage errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, latestReleaseId]);

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/feedback", {
        name: feedbackName.trim(),
        email: feedbackEmail.trim(),
        comments: feedbackComments.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Thank you for your feedback!", description: "We read every response and use it to improve Kindora." });
      setFeedbackOpen(false);
      setFeedbackName("");
      setFeedbackEmail("");
      setFeedbackComments("");
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  function openFeedback() {
    setFeedbackName(user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "");
    setFeedbackEmail(user?.email || "");
    setFeedbackOpen(true);
  }

  const { data: userRole } = useQuery<{ role?: string }>({
    queryKey: ["/api/family/" + activeFamilyId + "/role"],
    enabled: !!activeFamilyId,
  });

  const isCaregiver = userRole?.role === "caregiver";
  const isOwnerOrMember = userRole?.role === "owner" || userRole?.role === "member";
  const isAdmin = user?.id === "google-110610540501901085708" || user?.email === "mvicenzino@gmail.com";

  function handleNavClick(e: React.MouseEvent, url: string) {
    e.preventDefault();
    setLocation(url);
    setOpenMobile(false);
  }

  function NavItem({ item }: { item: NavItemType }) {
    const isActive = location === item.url || (item.url === "/" && location === "") || (item.url !== "/" && location.startsWith(item.url + "/"));
    const isMessages = item.url === "/messages";
    const showBadge = isMessages && unreadCount > 0;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="text-[12px] gap-2">
          <a href={item.url} onClick={function(e) { handleNavClick(e, item.url); }} data-testid={"nav-" + item.title.toLowerCase().replace(" ", "-")}>
            <div className="relative flex-shrink-0">
              <item.icon className="w-3.5 h-3.5" />
              {showBadge && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-[3px] leading-none" data-testid="badge-unread-messages">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span>{item.title}</span>
            {showBadge && (
              <span className="group-data-[collapsible=icon]:hidden ml-auto min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      <Sidebar collapsible="icon" data-testid="app-sidebar">
        <SidebarHeader className="px-3 py-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <img src={logo} alt="Kindora" className="w-6 h-6 rounded flex-shrink-0" data-testid="icon-sidebar-logo" />
            <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-primary app-title" data-testid="text-sidebar-brand">Kindora</span>
              </span>
              {activeFamily && (
                <span className="text-[10px] text-sidebar-foreground/60 truncate max-w-[120px] mt-0.5" data-testid="text-sidebar-family">
                  {activeFamily.name}
                </span>
              )}
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="tesla-scrollbar">

          {(isOwnerOrMember || !userRole) && (
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 py-1">
                Family
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-1">
                  {familyNavItems.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {isOwnerOrMember && (
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 py-1">
                Caregiver
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-1">
                  <NavItem item={{ title: "Care Dashboard", url: "/care", icon: Heart }} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {isCaregiver && (
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 py-1">
                Caregiver
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-1">
                  {caregiverNavItems.map((item) => (
                    <NavItem key={item.title} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {isAdmin && (
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 py-1">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-1">
                  <NavItem item={{ title: "Dashboard", url: "/admin", icon: Shield }} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

        </SidebarContent>

        <SidebarFooter className="px-3 py-2">

          {/* Our Story card — expanded view only */}
          <a
            href="/about"
            onClick={(e) => { e.preventDefault(); setLocation('/about'); setOpenMobile(false); }}
            data-testid="link-about-kindora"
            className="block group-data-[collapsible=icon]:hidden mb-2 rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-orange-500/5 p-3 hover-elevate cursor-pointer"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-[11px] font-semibold text-sidebar-foreground">Our Story</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 leading-relaxed mb-1.5">
              Built for families in the sandwich generation — juggling kids, aging parents, and everything in between.
            </p>
            <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              Read more <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </a>

          {/* Our Story icon — collapsed view only */}
          <button
            onClick={() => { setLocation('/about'); setOpenMobile(false); }}
            title="Our Story"
            data-testid="button-about-icon"
            className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full px-2 py-1.5 rounded-md text-primary/70 hover:text-primary hover:bg-sidebar-accent transition-colors mb-0.5"
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
          </button>

          <button onClick={function() { setHelpOpen(true); }} data-testid="button-sidebar-support" className="flex items-center gap-2 w-full px-2.5 py-2 rounded-md bg-primary/10 border border-primary/20 text-primary hover-elevate active-elevate-2 transition-colors mb-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2" title="Help and Support">
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold group-data-[collapsible=icon]:hidden">Help &amp; Support</span>
          </button>
          <button onClick={() => setReleaseNotesOpen(true)} data-testid="button-release-notes" className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-0.5 group-data-[collapsible=icon]:justify-center" title="What's New">
            <History className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] font-medium group-data-[collapsible=icon]:hidden">What's New</span>
          </button>
          <button onClick={openFeedback} data-testid="button-beta-feedback" className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-1 group-data-[collapsible=icon]:justify-center" title="Share Beta Feedback">
            <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] font-medium group-data-[collapsible=icon]:hidden">Beta Feedback</span>
          </button>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="w-5 h-5 flex-shrink-0">
              <AvatarFallback className="text-[9px] font-semibold bg-primary/20 text-primary">
                {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden min-w-0">
              <span className="text-[11px] font-medium text-sidebar-foreground truncate" data-testid="text-sidebar-user">
                {user?.firstName || user?.email?.split("@")[0] || "User"}
              </span>
              <span className="text-[9px] text-sidebar-foreground/50 truncate mt-0.5">
                {user?.email || ""}
              </span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <HelpDrawer open={helpOpen} onClose={function() { setHelpOpen(false); }} />

      <Dialog open={releaseNotesOpen} onOpenChange={(open) => {
        setReleaseNotesOpen(open);
        if (!open) markReleaseNotesSeen();
      }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              What's New
            </DialogTitle>
            <DialogDescription>
              Recent updates and improvements to Kindora.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 pt-1">
            {RELEASE_NOTES.map((release) => (
              <div key={release.date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {release.date}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <ul className="space-y-1.5">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1 flex-shrink-0">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-primary" />
              Share Your Feedback
            </DialogTitle>
            <DialogDescription>
              You're one of our first beta users. Your experience helps shape Kindora — tell us what's working, what's missing, or anything on your mind.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="feedback-name" className="text-xs">Your name</Label>
                <Input
                  id="feedback-name"
                  data-testid="input-feedback-name"
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feedback-email" className="text-xs">Email</Label>
                <Input
                  id="feedback-email"
                  data-testid="input-feedback-email"
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feedback-comments" className="text-xs">Comments</Label>
              <Textarea
                id="feedback-comments"
                data-testid="input-feedback-comments"
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="What's working well? What would make Kindora more useful for your family?"
                className="resize-none min-h-[120px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setFeedbackOpen(false)} data-testid="button-feedback-cancel">
                Cancel
              </Button>
              <Button
                onClick={() => feedbackMutation.mutate()}
                disabled={feedbackMutation.isPending || !feedbackName.trim() || !feedbackEmail.trim() || !feedbackComments.trim()}
                data-testid="button-feedback-submit"
              >
                {feedbackMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Feedback"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
