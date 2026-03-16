import { useLocation } from "wouter";
import { useState } from "react";
import { Calendar, MessageCircle, FileText, Image, Heart, Settings, Sparkles, HelpCircle } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";

const logo = "/kindora-logo.jpeg";

const familyNavItems = [
  { title: "Calendar", url: "/", icon: Calendar },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Memories", url: "/memories", icon: Image },
  { title: "Advisor", url: "/advisor", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

const caregiverNavItems = [
  { title: "Care Dashboard", url: "/care", icon: Heart },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Calendar", url: "/", icon: Calendar },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { activeFamily, activeFamilyId } = useActiveFamily();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { setOpenMobile } = useSidebar();
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: userRole } = useQuery({
    queryKey: ["/api/family/" + activeFamilyId + "/role"],
    enabled: !!activeFamilyId,
  });

  const isCaregiver = userRole?.role === "caregiver";
  const isOwnerOrMember = userRole?.role === "owner" || userRole?.role === "member";

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

        </SidebarContent>

        <SidebarFooter className="px-3 py-2">
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
    </>
  );
}
