import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Trophy, Star, Plus, Gift, Check, Trash2, Pencil, Loader2, Sparkles,
  Crown, PartyPopper, Target, ListChecks, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import type { Chore, Reward, FamilyMember } from "@shared/schema";

type BoardMember = FamilyMember & { earned: number; spent: number; balance: number };
type BoardData = {
  date: string;
  members: BoardMember[];
  chores: Chore[];
  completions: { choreId: string; memberId: string }[];
  rewards: Reward[];
  redemptions: { id: string; memberId: string; rewardTitle: string; pointsSpent: number; status: string; createdAt: string }[];
};

const RRULE_OPTIONS = [
  { label: "One time", value: "none" },
  { label: "Every day", value: "FREQ=DAILY" },
  { label: "Every week", value: "FREQ=WEEKLY" },
  { label: "Every weekday (Mon–Fri)", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
  { label: "Every month", value: "FREQ=MONTHLY" },
];

const CHORE_PRESETS: { title: string; points: number }[] = [
  { title: "Make the bed", points: 5 },
  { title: "Take out the trash", points: 5 },
  { title: "Do homework", points: 10 },
  { title: "Feed the pet", points: 5 },
  { title: "Set the table", points: 5 },
  { title: "Tidy up room", points: 10 },
  { title: "Load the dishwasher", points: 10 },
  { title: "Brush teeth", points: 3 },
];

const REWARD_PRESETS: { title: string; cost: number }[] = [
  { title: "30 min extra screen time", cost: 20 },
  { title: "Pick the movie", cost: 30 },
  { title: "Stay up 30 min late", cost: 40 },
  { title: "Choose dinner", cost: 50 },
  { title: "$5 allowance", cost: 100 },
];

type ChoreInitial = { title?: string; points?: number };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function Chores() {
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [tab, setTab] = useState("board");

  // Lifted chore dialog so it can be opened from the header, the empty state,
  // the quick-add presets, and the Manage tab — not just buried in Manage.
  const [choreDialogOpen, setChoreDialogOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [choreInitial, setChoreInitial] = useState<ChoreInitial | undefined>(undefined);

  const openAddChore = (initial?: ChoreInitial) => {
    setEditingChore(null);
    setChoreInitial(initial);
    setChoreDialogOpen(true);
  };
  const openEditChore = (c: Chore) => {
    setEditingChore(c);
    setChoreInitial(undefined);
    setChoreDialogOpen(true);
  };

  // These routes take familyId (and date) as query-string params, but the
  // default fetcher would join the query key with "/" and hit the wrong URL.
  // Explicit queryFns build the correct ?familyId=…&date=… URLs.
  const { data: board, isLoading } = useQuery<BoardData>({
    queryKey: ["/api/chores/board", activeFamilyId, today],
    enabled: !!activeFamilyId,
    queryFn: async () => {
      const res = await fetch(`/api/chores/board?familyId=${activeFamilyId}&date=${today}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chore board");
      return res.json();
    },
  });

  const allChoresQuery = useQuery<Chore[]>({
    queryKey: ["/api/chores", activeFamilyId],
    enabled: !!activeFamilyId,
    queryFn: async () => {
      const res = await fetch(`/api/chores?familyId=${activeFamilyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load chores");
      return res.json();
    },
  });
  const allRewardsQuery = useQuery<Reward[]>({
    queryKey: ["/api/rewards", activeFamilyId],
    enabled: !!activeFamilyId,
    queryFn: async () => {
      const res = await fetch(`/api/rewards?familyId=${activeFamilyId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load rewards");
      return res.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/chores/board"] });
    queryClient.invalidateQueries({ queryKey: ["/api/chores"] });
    queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
  };

  const completeMutation = useMutation({
    mutationFn: async ({ choreId, memberId, completed }: { choreId: string; memberId: string; completed: boolean }) => {
      const url = completed ? `/api/chores/${choreId}/uncomplete` : `/api/chores/${choreId}/complete`;
      return apiRequest("POST", url, { familyId: activeFamilyId, memberId, date: today });
    },
    onSuccess: invalidate,
    onError: () => toast({ title: "Something went wrong", description: "Could not update the chore.", variant: "destructive" }),
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ rewardId, memberId }: { rewardId: string; memberId: string }) =>
      apiRequest("POST", `/api/rewards/${rewardId}/redeem`, { familyId: activeFamilyId, memberId }),
    onSuccess: () => {
      invalidate();
      toast({ title: "Reward redeemed!", description: "Points have been deducted." });
    },
    onError: async (err: any) => {
      toast({ title: "Not enough points", description: "This family member doesn't have enough points yet.", variant: "destructive" });
    },
  });

  if (!activeFamilyId) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-5xl">
        <p className="text-sm text-muted-foreground" data-testid="text-no-family">
          Select or create a family to manage chores and rewards.
        </p>
      </div>
    );
  }

  const members = board?.members ?? [];
  const completionSet = new Set((board?.completions ?? []).map((c) => `${c.choreId}:${c.memberId}`));
  const activeMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId)
    : members[0];

  const hasAnyChores = (allChoresQuery.data ?? []).length > 0;
  const todaysChores = board?.chores ?? [];

  // Daily progress: how many chore "slots" have been checked off today.
  const totalSlots = todaysChores.reduce(
    (acc, c) => acc + (c.assignedMemberId ? 1 : Math.max(members.length, 0)),
    0,
  );
  const completedCount = todaysChores.reduce(
    (acc, c) => {
      const eligible = c.assignedMemberId ? members.filter((m) => m.id === c.assignedMemberId) : members;
      return acc + eligible.filter((m) => completionSet.has(`${c.id}:${m.id}`)).length;
    },
    0,
  );
  const pct = totalSlots > 0 ? Math.round((completedCount / totalSlots) * 100) : 0;
  const allDone = totalSlots > 0 && completedCount === totalSlots;

  // Leaderboard ordering — highest balance first, crown the leader.
  const ranked = [...members].sort((a, b) => b.balance - a.balance);
  const leaderId = ranked[0] && ranked[0].balance > 0 ? ranked[0].id : null;
  const totalEarnedToday = completedCount; // slot count, not points; points shown per member

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/15">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-chores-title">Chores &amp; Rewards</h1>
              <p className="text-sm text-muted-foreground">
                Turn everyday tasks into points the whole family can cheer for.
              </p>
            </div>
          </div>
          <Button onClick={() => openAddChore()} data-testid="button-add-chore-header">
            <Plus className="h-4 w-4" /> Add chore
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="board" data-testid="tab-board">Today's Board</TabsTrigger>
          <TabsTrigger value="store" data-testid="tab-store">Reward Store</TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">Manage</TabsTrigger>
        </TabsList>

        {/* ── Today's Board ── */}
        <TabsContent value="board" className="space-y-6">
          {isLoading || allChoresQuery.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Add family members to get started"
              description="Chores are checked off per person. Add your family from the profile menu (top-right), then come back to set up chores."
            />
          ) : (
            <>
              {/* Leaderboard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" data-testid="grid-leaderboard">
                {ranked.map((m, idx) => {
                  const isLeader = m.id === leaderId;
                  return (
                    <Card
                      key={m.id}
                      className={`text-center relative overflow-hidden ${isLeader ? "ring-2 ring-primary/60" : ""}`}
                      data-testid={`card-balance-${m.id}`}
                    >
                      {isLeader && (
                        <div className="absolute right-2 top-2" title="Top scorer">
                          <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400 fill-current" />
                        </div>
                      )}
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 ring-background" style={{ boxShadow: `0 0 0 2px ${m.color}` }}>
                            <AvatarFallback style={{ backgroundColor: m.color, color: "white" }}>
                              {initials(m.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                            {idx + 1}
                          </span>
                        </div>
                        <div className="font-medium truncate w-full" data-testid={`text-member-name-${m.id}`}>{m.name}</div>
                        <div className="flex items-center gap-1 text-lg font-bold text-primary" data-testid={`text-balance-${m.id}`}>
                          <Star className="h-4 w-4 fill-current" />
                          {m.balance}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Today's chores */}
              {!hasAnyChores ? (
                <EmptyState
                  icon={ListChecks}
                  title="No chores yet — let's add your first one"
                  description="Create a chore, give it points, and assign it to a family member. Or tap a popular one below to get started fast."
                  action={
                    <Button onClick={() => openAddChore()} data-testid="button-add-first-chore">
                      <Plus className="h-4 w-4" /> Add your first chore
                    </Button>
                  }
                >
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {CHORE_PRESETS.map((p) => (
                      <Button
                        key={p.title}
                        variant="outline"
                        size="sm"
                        onClick={() => openAddChore({ title: p.title, points: p.points })}
                        data-testid={`button-preset-${p.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Plus className="h-3.5 w-3.5" /> {p.title}
                      </Button>
                    ))}
                  </div>
                </EmptyState>
              ) : todaysChores.length === 0 ? (
                <EmptyState
                  icon={PartyPopper}
                  title="Nothing due today"
                  description="You're all caught up. Repeating chores will show up here on their days — or add a one-time chore for today."
                  action={
                    <Button variant="outline" onClick={() => openAddChore()} data-testid="button-add-chore-empty-today">
                      <Plus className="h-4 w-4" /> Add a chore for today
                    </Button>
                  }
                />
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Target className="h-5 w-5 text-primary" /> Today's Chores
                        </CardTitle>
                        <CardDescription>Tap a family member's name to check off who did it.</CardDescription>
                      </div>
                      {allDone ? (
                        <Badge className="gap-1" data-testid="badge-all-done">
                          <PartyPopper className="h-3.5 w-3.5" /> All done!
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid="badge-progress">
                          {completedCount}/{totalSlots} done
                        </Badge>
                      )}
                    </div>
                    <Progress value={pct} className="mt-3 h-2" data-testid="progress-today" />
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {todaysChores.map((chore) => {
                      const eligibleMembers = chore.assignedMemberId
                        ? members.filter((m) => m.id === chore.assignedMemberId)
                        : members;
                      const choreDone = eligibleMembers.length > 0 &&
                        eligibleMembers.every((m) => completionSet.has(`${chore.id}:${m.id}`));
                      return (
                        <div
                          key={chore.id}
                          className={`rounded-md border p-3 transition-colors ${choreDone ? "bg-primary/5 border-primary/30" : ""}`}
                          data-testid={`row-chore-${chore.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <div className={`font-medium ${choreDone ? "line-through text-muted-foreground" : ""}`}>{chore.title}</div>
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3 fill-current" /> {chore.points} pts
                            </Badge>
                          </div>
                          {chore.description && (
                            <p className="text-sm text-muted-foreground mb-2">{chore.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {eligibleMembers.map((m) => {
                              const done = completionSet.has(`${chore.id}:${m.id}`);
                              return (
                                <Button
                                  key={m.id}
                                  size="sm"
                                  variant={done ? "default" : "outline"}
                                  disabled={completeMutation.isPending}
                                  onClick={() => completeMutation.mutate({ choreId: chore.id, memberId: m.id, completed: done })}
                                  data-testid={`button-complete-${chore.id}-${m.id}`}
                                >
                                  {done ? <Check className="h-4 w-4" /> : (
                                    <span
                                      className="h-3.5 w-3.5 rounded-full"
                                      style={{ backgroundColor: m.color }}
                                    />
                                  )}
                                  {m.name}
                                </Button>
                              );
                            })}
                            {eligibleMembers.length === 0 && (
                              <span className="text-sm text-muted-foreground">No eligible family member.</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Reward Store ── */}
        <TabsContent value="store" className="space-y-6">
          {(board?.rewards ?? []).length === 0 && !allRewardsQuery.isLoading ? (
            <EmptyState
              icon={Gift}
              title="Set up rewards kids can work toward"
              description="Add a reward and a point cost. As family members earn points, they can trade them in here."
              action={
                <Button onClick={() => setTab("manage")} data-testid="button-go-add-reward">
                  <Plus className="h-4 w-4" /> Add a reward
                </Button>
              }
            />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
                <div>
                  <CardTitle className="text-lg">Who's shopping?</CardTitle>
                  <CardDescription>Pick a family member to spend their points.</CardDescription>
                </div>
                <Select value={activeMember?.id ?? ""} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="w-44" data-testid="select-shopper">
                    <SelectValue placeholder="Choose member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} · {m.balance} pts</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {activeMember && (
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    <Star className="h-4 w-4 text-primary fill-current" />
                    <span data-testid="text-shopper-balance">
                      {activeMember.name} has <strong>{activeMember.balance}</strong> points
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(board?.rewards ?? []).map((reward) => {
                    const canAfford = (activeMember?.balance ?? 0) >= reward.cost;
                    return (
                      <div key={reward.id} className="rounded-md border p-4 flex items-center justify-between gap-3 flex-wrap" data-testid={`card-reward-${reward.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                            <Gift className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{reward.title}</div>
                            {reward.description && (
                              <div className="text-sm text-muted-foreground truncate">{reward.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-current" /> {reward.cost}</Badge>
                          <Button
                            size="sm"
                            disabled={!activeMember || !canAfford || redeemMutation.isPending}
                            onClick={() => activeMember && redeemMutation.mutate({ rewardId: reward.id, memberId: activeMember.id })}
                            data-testid={`button-redeem-${reward.id}`}
                          >
                            Redeem
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Manage ── */}
        <TabsContent value="manage" className="space-y-6">
          <ManageChores
            chores={allChoresQuery.data ?? []}
            members={members}
            isLoading={allChoresQuery.isLoading}
            onAdd={() => openAddChore()}
            onEdit={openEditChore}
            familyId={activeFamilyId}
            onChanged={invalidate}
          />
          <ManageRewards
            familyId={activeFamilyId}
            rewards={allRewardsQuery.data ?? []}
            isLoading={allRewardsQuery.isLoading}
            onChanged={invalidate}
          />
        </TabsContent>
      </Tabs>

      <ChoreFormDialog
        open={choreDialogOpen}
        onOpenChange={setChoreDialogOpen}
        editing={editingChore}
        initial={choreInitial}
        familyId={activeFamilyId}
        members={members}
        onChanged={invalidate}
      />
    </div>
  );
}

/* ─────────────── Shared empty state ─────────────── */
function EmptyState({
  icon: Icon, title, description, action, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center text-center gap-3 py-10 px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
        {children}
      </CardContent>
    </Card>
  );
}

/* ─────────────── Chore form dialog (shared) ─────────────── */
function ChoreFormDialog({
  open, onOpenChange, editing, initial, familyId, members, onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Chore | null;
  initial?: ChoreInitial;
  familyId: string;
  members: FamilyMember[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(5);
  const [assignedMemberId, setAssignedMemberId] = useState("any");
  const [rrule, setRrule] = useState("none");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? "");
      setPoints(editing.points);
      setAssignedMemberId(editing.assignedMemberId ?? "any");
      setRrule(editing.rrule ?? "none");
    } else {
      setTitle(initial?.title ?? "");
      setDescription("");
      setPoints(initial?.points ?? 5);
      setAssignedMemberId("any");
      setRrule("none");
    }
  }, [open, editing, initial]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        familyId,
        title,
        description: description || null,
        points,
        assignedMemberId: assignedMemberId === "any" ? null : assignedMemberId,
        rrule: rrule === "none" ? null : rrule,
      };
      if (editing) return apiRequest("PUT", `/api/chores/${editing.id}`, payload);
      return apiRequest("POST", "/api/chores", payload);
    },
    onSuccess: () => {
      onChanged();
      onOpenChange(false);
      toast({ title: editing ? "Chore updated" : "Chore added" });
    },
    onError: () => toast({ title: "Could not save chore", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit chore" : "New chore"}</DialogTitle>
          <DialogDescription>Chores can repeat daily, weekly, or be a one-time task.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="chore-title">Title</Label>
            <Input id="chore-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Make the bed" data-testid="input-chore-title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chore-desc">Description (optional)</Label>
            <Textarea id="chore-desc" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-chore-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="chore-points">Points</Label>
              <Input id="chore-points" type="number" min={0} value={points} onChange={(e) => setPoints(Number(e.target.value))} data-testid="input-chore-points" />
            </div>
            <div className="space-y-2">
              <Label>Repeats</Label>
              <Select value={rrule} onValueChange={setRrule}>
                <SelectTrigger data-testid="select-chore-rrule"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RRULE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign to</Label>
            <Select value={assignedMemberId} onValueChange={setAssignedMemberId}>
              <SelectTrigger data-testid="select-chore-member"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Anyone</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-chore">Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending} data-testid="button-save-chore">
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────── Manage Chores ─────────────── */
function ManageChores({
  chores, members, isLoading, onAdd, onEdit, familyId, onChanged,
}: {
  chores: Chore[];
  members: FamilyMember[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (c: Chore) => void;
  familyId: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/chores/${id}?familyId=${familyId}`),
    onSuccess: () => { onChanged(); toast({ title: "Chore deleted" }); },
    onError: () => toast({ title: "Could not delete chore", variant: "destructive" }),
  });

  const rruleLabel = (r: string | null) =>
    RRULE_OPTIONS.find((o) => o.value === (r ?? "none"))?.label ?? "Recurring";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
        <div>
          <CardTitle className="text-lg">Chores</CardTitle>
          <CardDescription>Set up one-time or repeating chores and how many points they're worth.</CardDescription>
        </div>
        <Button size="sm" onClick={onAdd} data-testid="button-add-chore"><Plus className="h-4 w-4" /> Add chore</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : chores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chores yet — tap “Add chore” to create one.</p>
        ) : (
          chores.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border p-3 flex-wrap" data-testid={`row-manage-chore-${c.id}`}>
              <div className="min-w-0">
                <div className="font-medium truncate">{c.title}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{c.points} pts</span>
                  <span>·</span>
                  <span>{rruleLabel(c.rrule)}</span>
                  {c.assignedMemberId && (
                    <>
                      <span>·</span>
                      <span>{members.find((m) => m.id === c.assignedMemberId)?.name ?? "Assigned"}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(c)} data-testid={`button-edit-chore-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-delete-chore-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────── Manage Rewards ─────────────── */
function ManageRewards({
  familyId, rewards, isLoading, onChanged,
}: {
  familyId: string;
  rewards: Reward[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(10);

  const reset = () => { setEditing(null); setTitle(""); setDescription(""); setCost(10); };

  const startEdit = (r: Reward) => {
    setEditing(r); setTitle(r.title); setDescription(r.description ?? ""); setCost(r.cost); setOpen(true);
  };

  const openAdd = (preset?: { title: string; cost: number }) => {
    setEditing(null);
    setTitle(preset?.title ?? "");
    setDescription("");
    setCost(preset?.cost ?? 10);
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { familyId, title, description: description || null, cost };
      if (editing) return apiRequest("PUT", `/api/rewards/${editing.id}`, payload);
      return apiRequest("POST", "/api/rewards", payload);
    },
    onSuccess: () => {
      onChanged(); setOpen(false); reset();
      toast({ title: editing ? "Reward updated" : "Reward added" });
    },
    onError: () => toast({ title: "Could not save reward", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/rewards/${id}?familyId=${familyId}`),
    onSuccess: () => { onChanged(); toast({ title: "Reward deleted" }); },
    onError: () => toast({ title: "Could not delete reward", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
        <div>
          <CardTitle className="text-lg">Rewards</CardTitle>
          <CardDescription>Things kids can trade their points in for.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <Button size="sm" onClick={() => openAdd()} data-testid="button-add-reward"><Plus className="h-4 w-4" /> Add reward</Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit reward" : "New reward"}</DialogTitle>
              <DialogDescription>Set a name and how many points it costs.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reward-title">Title</Label>
                <Input id="reward-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Extra screen time" data-testid="input-reward-title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-desc">Description (optional)</Label>
                <Textarea id="reward-desc" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-reward-description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward-cost">Cost (points)</Label>
                <Input id="reward-cost" type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} data-testid="input-reward-cost" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); reset(); }} data-testid="button-cancel-reward">Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending} data-testid="button-save-reward">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rewards.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">No rewards yet. Add one, or start with a popular idea:</p>
            <div className="flex flex-wrap gap-2">
              {REWARD_PRESETS.map((p) => (
                <Button
                  key={p.title}
                  variant="outline"
                  size="sm"
                  onClick={() => openAdd(p)}
                  data-testid={`button-reward-preset-${p.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Plus className="h-3.5 w-3.5" /> {p.title}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          rewards.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border p-3 flex-wrap" data-testid={`row-manage-reward-${r.id}`}>
              <div className="min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-sm text-muted-foreground">{r.cost} points{r.description ? ` · ${r.description}` : ""}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(r)} data-testid={`button-edit-reward-${r.id}`}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} data-testid={`button-delete-reward-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
