import { useLocation } from "wouter";
import { Calendar, MessageCircle, FileText, Image, Heart, Settings, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import calendoraIcon from "@assets/IMG_4040_1773507883126.jpeg";

const navItems = [
  { title: "Calendar", url: "/", icon: Calendar },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Memories", url: "/memories", icon: Image },
  { title: "Care", url: "/care", icon: Heart },
  { title: "Advisor", url: "/advisor", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { activeFamily } = useActiveFamily();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" data-testid="app-sidebar">
      <SidebarHeader className="px-3 py-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <img
            src={calendoraIcon}
            alt="Kindora"
            className="w-6 h-6 rounded flex-shrink-0"
            data-testid="icon-sidebar-logo"
          />
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-bold text-primary app-title" data-testid="text-sidebar-brand">Kindora</span>
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
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 px-3 py-1">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-1">
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url === '/' && location === '') || (item.url !== '/' && location.startsWith(item.url + '/'));
                const isMessages = item.url === "/messages";
                const showBadge = isMessages && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isMessages && unreadCount > 0 ? `Messages (${unreadCount} unread)` : item.title}
                      className="text-[12px] gap-2"
                    >
                      <a
                        href={item.url}
                        onClick={(e) => { e.preventDefault(); setLocation(item.url); setOpenMobile(false); }}
                        data-testid={`nav-${item.title.toLowerCase()}`}
                      >
                        <div className="relative flex-shrink-0">
                          <item.icon className="w-3.5 h-3.5" />
                          {showBadge && (
                            <span
                              className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-[3px] leading-none"
                              data-testid="badge-unread-messages"
                            >
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="w-5 h-5 flex-shrink-0">
            <AvatarFallback className="text-[9px] font-semibold bg-primary/20 text-primary">
              {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden min-w-0">
            <span className="text-[11px] font-medium text-sidebar-foreground truncate" data-testid="text-sidebar-user">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </span>
            <span className="text-[9px] text-sidebar-foreground/50 truncate mt-0.5">
              {user?.email || ''}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
