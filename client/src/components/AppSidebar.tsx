import { useLocation } from "wouter";
import { useState } from "react";
import { Calendar, MessageCircle, FileText, Image, Heart, Settings, Sparkles, HelpCircle, MessageSquarePlus, Loader2, Activity, BookOpen, ArrowRight, Shield, History, LayoutDashboard } from "lucide-react";
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

const familyNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Calendar", url: "/calendar", icon: Calendar },
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
    date: "Mar 27, 2026",
    changes: [
      "Stripe checkout now works on the live site (falls back to test mode until live keys are added)",
      "Admin dashboard now always loads fresh data — no more stale cache",
      "Admin API access fixed — was returning 403 for all admin routes",
      "Kira chat: delete button now always visible; added confirmation before deleting",
      "Character limits added to all notes, messages, and feedback text fields",
      "Time field colon alignment fixed in the event editor",
    ],
  },
  {
    date: "Mar 23, 2026",
    changes: [
      "Public Resources page launched at /resources — accessible without login",
      "Landing page now features a Caregiver Resources preview section",
      "Beta feedback now correctly returns server errors and logs every saved entry",
      "Admin dashboard added a Refresh button to reload all data on demand",
    ],
  },
  {
    date: "Mar 18, 2026",
    changes: [
      "AI calendar bar now understands reschedule and move requests",
      "Date picker in event editor replaced with a reliable cross-browser calendar",
      "Event rescheduling via AI confirms the change with a summary card",
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

  const { data: userRole } = useQuery({
    queryKey: ["/api/family/" + activeFamilyId + "/role"],
    enabled: !!activeFamilyId,
  });

  const isCaregiver = userRole?.role === "caregiver";
  const isOwnerOrMember = userRole?.role === "owner" || userRole?.role === "member";
  const isAdmin = user?.id === "google-110610540501901085708" || user?.email === "mvicenzino@gmail.com";

  function handleNavClick(e, url) {
    e.preventDefault();
    setLocation(url);
    setOpenMobile(false);
  }

  function NavItem({ item }) {
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
                <span className="text-[9px] font-semibold px-1 py-px rounded-full border border-primary/40 text-primary/70 leading-none tracking-wide">beta</span>
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

          <button onClick={() => setReleaseNotesOpen(true)} data-testid="button-release-notes" className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-0.5 group-data-[collapsible=icon]:justify-center" title="What's New">
            <History className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] font-medium group-data-[collapsible=icon]:hidden">What's New</span>
          </button>
          <button onClick={openFeedback} data-testid="button-beta-feedback" className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-0.5 group-data-[collapsible=icon]:justify-center" title="Share Beta Feedback">
            <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] font-medium group-data-[collapsible=icon]:hidden">Beta Feedback</span>
          </button>
          <button onClick={function() { setHelpOpen(true); }} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-1 group-data-[collapsible=icon]:justify-center" title="Help and Support">
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] font-medium group-data-[collapsible=icon]:hidden">Help & Support</span>
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

      <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
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
