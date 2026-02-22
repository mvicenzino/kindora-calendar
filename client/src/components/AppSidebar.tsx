import { useLocation } from "wouter";
import { Calendar, MessageCircle, FileText, Image, Heart, Settings } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useAuth } from "@/hooks/useAuth";
import calendoraIcon from "@assets/generated_images/simple_clean_calendar_logo.png";

const navItems = [
  { title: "Calendar", url: "/", icon: Calendar },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Memories", url: "/memories", icon: Image },
  { title: "Care", url: "/care", icon: Heart },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { activeFamily } = useActiveFamily();
  const { user } = useAuth();

  return (
    <Sidebar collapsible="icon" data-testid="app-sidebar">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <img
            src={calendoraIcon}
            alt="Kindora"
            className="w-8 h-8 rounded-md flex-shrink-0"
            data-testid="icon-sidebar-logo"
          />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold text-primary app-title" data-testid="text-sidebar-brand">Kindora</span>
            {activeFamily && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]" data-testid="text-sidebar-family">
                {activeFamily.name}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="tesla-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url === '/' && location === '') || (item.url !== '/' && location.startsWith(item.url + '/'));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <a
                        href={item.url}
                        onClick={(e) => { e.preventDefault(); setLocation(item.url); }}
                        data-testid={`nav-${item.title.toLowerCase()}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarFallback className="text-[10px] font-semibold bg-primary/20 text-primary">
              {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden min-w-0">
            <span className="text-xs font-medium text-foreground truncate" data-testid="text-sidebar-user">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.email || ''}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
