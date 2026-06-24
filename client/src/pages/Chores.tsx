import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Trophy, Star, Plus, Gift, Check, Trash2, Pencil, Loader2, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
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

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function Chores() {
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: board, isLoading } = useQuery<BoardData>({
    queryKey: ["/api/chores/board", activeFamilyId, today],
    enabled: !!activeFamilyId,
  });

  const allChoresQuery = useQuery<Chore[]>({
    queryKey: ["/api/chores", activeFamilyId],
    enabled: !!activeFamilyId,
  });
  const allRewardsQuery = useQuery<Reward[]>({
    queryKey: ["/api/rewards", activeFamilyId],
    enabled: !!activeFamilyId,
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
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
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

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-chores-title">Chores & Rewards</h1>
          <p className="text-sm text-muted-foreground">
            Give kids chores, earn points, and trade them in for rewards.
          </p>
        </div>
      </div>

      <Tabs defaultValue="board" className="space-y-6">
        <TabsList>
          <TabsTrigger value="board" data-testid="tab-board">Today's Board</TabsTrigger>
          <TabsTrigger value="store" data-testid="tab-store">Reward Store</TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">Manage</TabsTrigger>
        </TabsList>

        {/* ── Today's Board ── */}
        <TabsContent value="board" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Point balances */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {members.map((m) => (
                  <Card key={m.id} className="text-center" data-testid={`card-balance-${m.id}`}>
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback style={{ backgroundColor: m.color, color: "white" }}>
                          {initials(m.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-medium truncate w-full" data-testid={`text-member-name-${m.id}`}>{m.name}</div>
                      <div className="flex items-center gap-1 text-lg font-bold text-primary" data-testid={`text-balance-${m.id}`}>
                        <Star className="h-4 w-4 fill-current" />
                        {m.balance}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full">Add family members first to start tracking chores.</p>
                )}
              </div>

              {/* Today's chores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Today's Chores</CardTitle>
                  <CardDescription>Check off each chore for the family member who did it.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(board?.chores ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-chores">
                      No chores due today. Add some in the Manage tab.
                    </p>
                  )}
                  {(board?.chores ?? []).map((chore) => {
                    const eligibleMembers = chore.assignedMemberId
                      ? members.filter((m) => m.id === chore.assignedMemberId)
                      : members;
                    return (
                      <div key={chore.id} className="rounded-md border p-3" data-testid={`row-chore-${chore.id}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="font-medium">{chore.title}</div>
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" /> {chore.points} pts
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
                                {done ? <Check className="h-4 w-4" /> : null}
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
            </>
          )}
        </TabsContent>

        {/* ── Reward Store ── */}
        <TabsContent value="store" className="space-y-6">
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
                    <Card key={reward.id} data-testid={`card-reward-${reward.id}`}>
                      <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Gift className="h-6 w-6 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{reward.title}</div>
                            {reward.description && (
                              <div className="text-sm text-muted-foreground truncate">{reward.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> {reward.cost}</Badge>
                          <Button
                            size="sm"
                            disabled={!activeMember || !canAfford || redeemMutation.isPending}
                            onClick={() => activeMember && redeemMutation.mutate({ rewardId: reward.id, memberId: activeMember.id })}
                            data-testid={`button-redeem-${reward.id}`}
                          >
                            Redeem
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {(board?.rewards ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full" data-testid="text-no-rewards">
                    No rewards yet. Add some in the Manage tab.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Manage ── */}
        <TabsContent value="manage" className="space-y-6">
          <ManageChores
            familyId={activeFamilyId}
            chores={allChoresQuery.data ?? []}
            members={members}
            isLoading={allChoresQuery.isLoading}
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
    </div>
  );
}

/* ─────────────── Manage Chores ─────────────── */
function ManageChores({
  familyId, chores, members, isLoading, onChanged,
}: {
  familyId: string;
  chores: Chore[];
  members: FamilyMember[];
  isLoading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(5);
  const [assignedMemberId, setAssignedMemberId] = useState("any");
  const [rrule, setRrule] = useState("none");

  const reset = () => {
    setEditing(null); setTitle(""); setDescription(""); setPoints(5); setAssignedMemberId("any"); setRrule("none");
  };

  const startEdit = (c: Chore) => {
    setEditing(c);
    setTitle(c.title);
    setDescription(c.description ?? "");
    setPoints(c.points);
    setAssignedMemberId(c.assignedMemberId ?? "any");
    setRrule(c.rrule ?? "none");
    setOpen(true);
  };

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
      setOpen(false);
      reset();
      toast({ title: editing ? "Chore updated" : "Chore added" });
    },
    onError: () => toast({ title: "Could not save chore", variant: "destructive" }),
  });

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
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-chore"><Plus className="h-4 w-4" /> Add chore</Button>
          </DialogTrigger>
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
              <Button variant="outline" onClick={() => { setOpen(false); reset(); }} data-testid="button-cancel-chore">Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending} data-testid="button-save-chore">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : chores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chores yet.</p>
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
                <Button size="icon" variant="ghost" onClick={() => startEdit(c)} data-testid={`button-edit-chore-${c.id}`}><Pencil className="h-4 w-4" /></Button>
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
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-reward"><Plus className="h-4 w-4" /> Add reward</Button>
          </DialogTrigger>
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
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rewards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rewards yet.</p>
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
