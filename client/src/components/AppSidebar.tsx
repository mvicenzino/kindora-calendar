import { useState } from "react";
import { useLocation } from "wouter";
import { Calendar, Users, MessageCircle, FileText, Image, Heart, Settings, Upload, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import type { UiFamilyMember } from "@shared/types";
import calendoraIcon from "@assets/generated_images/simple_clean_calendar_logo.png";

interface AppSidebarProps {
  members?: UiFamilyMember[];
  selectedMemberIds?: string[];
  onToggleMember?: (memberId: string) => void;
  onSelectAllMembers?: () => void;
}

const navItems = [
  { title: "Calendar", url: "/", icon: Calendar },
  { title: "Messages", url: "/messages", icon: MessageCircle },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Memories", url: "/memories", icon: Image },
  { title: "Care", url: "/care", icon: Heart },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Family", url: "/family", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AppSidebar({ members = [], selectedMemberIds = [], onToggleMember, onSelectAllMembers }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const { activeFamily } = useActiveFamily();
  const { user } = useAuth();

  const showMemberFilter = members.length > 0 && onToggleMember && onSelectAllMembers;
  const allSelected = selectedMemberIds.length === 0 || selectedMemberIds.length === members.length;

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
        {showMemberFilter && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Family
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 py-1 space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onSelectAllMembers}
                        className={`
                          flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors
                          group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0
                          ${allSelected ? 'text-primary' : 'text-muted-foreground'}
                        `}
                        data-testid="button-filter-all-members"
                      >
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-all
                          ${allSelected
                            ? 'bg-primary/20 text-primary member-avatar-ring active'
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="truncate group-data-[collapsible=icon]:hidden">Everyone</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Show all members</TooltipContent>
                  </Tooltip>

                  {members.map((member) => {
                    const isSelected = allSelected || selectedMemberIds.includes(member.id);
                    return (
                      <Tooltip key={member.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onToggleMember!(member.id)}
                            className={`
                              flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors
                              group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0
                              ${isSelected ? 'text-foreground' : 'text-muted-foreground opacity-50'}
                            `}
                            data-testid={`button-filter-member-${member.id}`}
                          >
                            <Avatar className={`w-8 h-8 flex-shrink-0 transition-all ${isSelected ? 'member-avatar-ring active' : ''}`}>
                              <AvatarFallback
                                className="text-xs font-semibold"
                                style={{
                                  backgroundColor: member.color + '30',
                                  color: member.color,
                                }}
                              >
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate group-data-[collapsible=icon]:hidden">{member.name}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{member.name}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />
          </>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url === '/' && location === '');
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
