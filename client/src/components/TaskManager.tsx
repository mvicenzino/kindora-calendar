import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { Plus, Trash2, CalendarDays, User, ChevronDown, CheckSquare, Clock } from "lucide-react";
import type { Task, FamilyMember } from "@shared/schema";

interface TaskManagerProps {
  canCreate?: boolean;
  canDelete?: boolean;
  compact?: boolean;
}

const PRIORITY_CONFIG = {
  high:   { label: "High",   className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" },
  normal: { label: "Normal", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  low:    { label: "Low",    className: "bg-muted text-muted-foreground border-border" },
} as const;

function dueDateLabel(date: string | Date | null): { text: string; urgent: boolean } | null {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return { text: "Due today", urgent: true };
  if (isTomorrow(d)) return { text: "Due tomorrow", urgent: false };
  if (isPast(d)) return { text: `Overdue (${format(d, "MMM d")})`, urgent: true };
  return { text: `Due ${format(d, "MMM d")}`, urgent: false };
}

export default function TaskManager({ canCreate = true, canDelete = true, compact = false }: TaskManagerProps) {
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();

  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "normal" | "high">("normal");
  const [newMemberId, setNewMemberId] = useState<string>("none");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members", activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: [`/api/tasks?familyId=${activeFamilyId}`],
    enabled: !!activeFamilyId,
  });

  const pending = allTasks.filter(t => !t.completedAt);
  const completed = allTasks.filter(t => !!t.completedAt);

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks?familyId=${activeFamilyId}`] });
      setNewTitle("");
      setNewPriority("normal");
      setNewMemberId("none");
      setNewDueDate(undefined);
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiRequest("POST", `/api/tasks/${id}/toggle`, { familyId: activeFamilyId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/tasks?familyId=${activeFamilyId}`] }),
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/tasks/${id}?familyId=${activeFamilyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/tasks?familyId=${activeFamilyId}`] }),
    onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !activeFamilyId) return;
    createMutation.mutate({
      familyId: activeFamilyId,
      title: newTitle.trim(),
      priority: newPriority,
      assignedMemberId: newMemberId === "none" ? undefined : newMemberId,
      dueDate: newDueDate?.toISOString(),
    });
  }

  function getMemberName(memberId: string | null) {
    if (!memberId) return null;
    return members.find(m => m.id === memberId)?.name ?? null;
  }

  const TaskRow = ({ task }: { task: Task }) => {
    const due = dueDateLabel(task.dueDate);
    const memberName = getMemberName(task.assignedMemberId);
    const priority = (task.priority ?? "normal") as keyof typeof PRIORITY_CONFIG;
    const isDone = !!task.completedAt;

    return (
      <div
        className={`flex items-start gap-3 py-3 px-1 group border-b border-border last:border-0 ${isDone ? "opacity-50" : ""}`}
        data-testid={`task-row-${task.id}`}
      >
        <Checkbox
          checked={isDone}
          onCheckedChange={() => toggleMutation.mutate({ id: task.id })}
          data-testid={`checkbox-task-${task.id}`}
          className="mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {priority !== "normal" && (
              <Badge variant="outline" className={`text-xs px-1.5 py-0 ${PRIORITY_CONFIG[priority].className}`}>
                {PRIORITY_CONFIG[priority].label}
              </Badge>
            )}
            {memberName && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <User className="h-3 w-3" />{memberName}
              </span>
            )}
            {due && (
              <span className={`flex items-center gap-0.5 text-xs ${due.urgent ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}>
                <Clock className="h-3 w-3" />{due.text}
              </span>
            )}
            {isDone && task.completedAt && (
              <span className="text-xs text-muted-foreground">
                Done {format(new Date(task.completedAt), "MMM d")}
              </span>
            )}
          </div>
        </div>
        {canDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-muted-foreground"
            onClick={() => deleteMutation.mutate(task.id)}
            data-testid={`button-delete-task-${task.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <form onSubmit={handleCreate} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Add a task…"
              data-testid="input-new-task"
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!newTitle.trim() || createMutation.isPending}
              data-testid="button-add-task"
            >
              <Plus className="h-4 w-4" />
              {!compact && <span className="ml-1">Add</span>}
            </Button>
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-2">
              <Select value={newPriority} onValueChange={v => setNewPriority(v as any)}>
                <SelectTrigger className="w-28 h-8 text-xs" data-testid="select-task-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High priority</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low priority</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newMemberId} onValueChange={setNewMemberId}>
                <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-task-member">
                  <SelectValue placeholder="Assign to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Anyone</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover open={showDuePicker} onOpenChange={setShowDuePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 text-xs gap-1.5" data-testid="button-due-date">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {newDueDate ? format(newDueDate, "MMM d") : "Due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDueDate}
                    onSelect={d => { setNewDueDate(d); setShowDuePicker(false); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {newDueDate && (
                <Button variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setNewDueDate(undefined)}>
                  Clear date
                </Button>
              )}
            </div>
          )}
        </form>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading tasks…</div>
      ) : pending.length === 0 && completed.length === 0 ? (
        <div className="py-8 text-center" data-testid="text-no-tasks">
          <CheckSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tasks yet</p>
          {canCreate && <p className="text-xs text-muted-foreground/60 mt-1">Add one above to get started</p>}
        </div>
      ) : (
        <div>
          {pending.map(task => <TaskRow key={task.id} task={task} />)}

          {completed.length > 0 && (
            <div className="mt-2">
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground py-1 hover-elevate rounded-md px-1"
                onClick={() => setShowCompleted(v => !v)}
                data-testid="button-toggle-completed"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCompleted ? "" : "-rotate-90"}`} />
                {completed.length} completed
              </button>
              {showCompleted && completed.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
