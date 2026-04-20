import { CheckSquare } from "lucide-react";
import TaskManager from "@/components/TaskManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";

export default function Tasks() {
  const { activeFamilyId } = useActiveFamily();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <CheckSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-tasks-title">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Track to-dos for your family — assign them, set due dates, and check them off together.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Family Tasks</CardTitle>
          <CardDescription>
            Anything that needs to get done. Assign to a family member or leave it open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeFamilyId ? (
            <TaskManager />
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-family">
              Select or create a family to manage tasks.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
