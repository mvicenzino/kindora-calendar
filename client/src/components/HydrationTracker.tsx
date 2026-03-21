import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Droplets, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FamilyMember, HydrationLog } from "@shared/schema";

interface HydrationTrackerProps {
  familyId: string;
  members: FamilyMember[];
  memberId?: string; // if set, only show this member; if "all" or undefined, show all
  compact?: boolean; // compact mode for embedding in smaller areas
}

const TODAY = format(new Date(), "yyyy-MM-dd");
const GOAL = 8;

function GlassIcons({ count, goal }: { count: number; goal: number }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      {Array.from({ length: goal }).map((_, i) => (
        <Droplets
          key={i}
          className={`w-3.5 h-3.5 transition-colors ${
            i < count ? "text-blue-400" : "text-muted-foreground/25"
          }`}
        />
      ))}
    </div>
  );
}

export default function HydrationTracker({ familyId, members, memberId, compact }: HydrationTrackerProps) {
  const { data: logs = [] } = useQuery<HydrationLog[]>({
    queryKey: ["/api/hydration", familyId, TODAY],
    queryFn: () => fetch(`/api/hydration?date=${TODAY}&familyId=${familyId}`).then(r => r.json()),
    enabled: !!familyId,
  });

  const logByMember = useMemo(() => {
    const map: Record<string, HydrationLog> = {};
    logs.forEach(l => { map[l.memberId] = l; });
    return map;
  }, [logs]);

  const mutation = useMutation({
    mutationFn: (data: { memberId: string; glassesCount: number }) =>
      apiRequest("POST", "/api/hydration", { ...data, date: TODAY, goalGlasses: GOAL, familyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hydration", familyId, TODAY] }),
  });

  const visibleMembers = useMemo(() => {
    if (!memberId || memberId === "all") return members;
    return members.filter(m => m.id === memberId);
  }, [members, memberId]);

  function adjust(member: FamilyMember, delta: number) {
    const current = logByMember[member.id]?.glassesCount ?? 0;
    const next = Math.max(0, Math.min(GOAL + 4, current + delta));
    mutation.mutate({ memberId: member.id, glassesCount: next });
  }

  if (visibleMembers.length === 0) return null;

  return (
    <Card className={compact ? "border-blue-500/15 bg-blue-500/5" : ""}>
      <CardHeader className={`${compact ? "pb-2 pt-3 px-3" : "pb-3"} flex flex-row items-center gap-2`}>
        <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <CardTitle className="text-sm">Today's Hydration</CardTitle>
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3 space-y-2" : "space-y-3"}>
        {visibleMembers.map(member => {
          const count = logByMember[member.id]?.glassesCount ?? 0;
          const pct = Math.min(100, Math.round((count / GOAL) * 100));
          return (
            <div key={member.id} className="flex items-center gap-2.5 flex-wrap">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback
                  className="text-[10px] font-bold text-white"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-foreground w-16 truncate flex-shrink-0">
                {member.name.split(" ")[0]}
              </span>
              <GlassIcons count={count} goal={GOAL} />
              <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${count >= GOAL ? "text-blue-400" : "text-muted-foreground"}`}>
                {count}/{GOAL}
              </span>
              {count >= GOAL && (
                <span className="text-[10px] text-blue-400 font-medium flex-shrink-0">Goal!</span>
              )}
              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => adjust(member, -1)}
                  disabled={count <= 0 || mutation.isPending}
                  data-testid={`button-hydration-minus-${member.id}`}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => adjust(member, 1)}
                  disabled={mutation.isPending}
                  data-testid={`button-hydration-plus-${member.id}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
