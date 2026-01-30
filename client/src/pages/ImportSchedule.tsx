import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Calendar, Upload, Check, Loader2, ArrowLeft, Sun } from "lucide-react";
import { format, addDays, parse, eachDayOfInterval, isWeekend } from "date-fns";
import type { FamilyMember } from "@shared/schema";

interface ParsedCampWeek {
  week: number;
  startDate: Date;
  endDate: Date;
  type: "full" | "half";
  cost: number;
  days: Date[];
}

const SUMMER_CAMP_COLOR = "#F59E0B";

export default function ImportSchedule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [campName, setCampName] = useState("Summer Camp");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [year, setYear] = useState(new Date().getFullYear());
  
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const parsedWeeks: ParsedCampWeek[] = [
    { week: 1, startDate: new Date(year, 5, 22), endDate: new Date(year, 5, 26), type: "full", cost: 380, days: [] },
    { week: 2, startDate: new Date(year, 5, 29), endDate: new Date(year, 6, 3), type: "half", cost: 240, days: [] },
    { week: 3, startDate: new Date(year, 6, 6), endDate: new Date(year, 6, 10), type: "full", cost: 380, days: [] },
    { week: 4, startDate: new Date(year, 6, 13), endDate: new Date(year, 6, 17), type: "full", cost: 380, days: [] },
    { week: 5, startDate: new Date(year, 6, 20), endDate: new Date(year, 6, 24), type: "full", cost: 380, days: [] },
    { week: 6, startDate: new Date(year, 6, 27), endDate: new Date(year, 6, 31), type: "full", cost: 380, days: [] },
    { week: 7, startDate: new Date(year, 7, 3), endDate: new Date(year, 7, 7), type: "full", cost: 380, days: [] },
    { week: 8, startDate: new Date(year, 7, 10), endDate: new Date(year, 7, 14), type: "full", cost: 380, days: [] },
  ];

  parsedWeeks.forEach(week => {
    week.days = eachDayOfInterval({ start: week.startDate, end: week.endDate })
      .filter(day => !isWeekend(day));
  });

  const totalDays = parsedWeeks.reduce((sum, week) => sum + week.days.length, 0);
  const totalCost = parsedWeeks.reduce((sum, week) => sum + week.cost, 0);

  const importMutation = useMutation({
    mutationFn: async () => {
      const events = parsedWeeks.flatMap(week => 
        week.days.map(day => {
          const startHour = 9;
          const endHour = week.type === "full" ? 16 : 12;
          
          const startTime = new Date(day);
          startTime.setHours(startHour, 0, 0, 0);
          
          const endTime = new Date(day);
          endTime.setHours(endHour, 0, 0, 0);
          
          return {
            title: `${campName} - Week ${week.week}`,
            description: `${week.type === "full" ? "Full day" : "Half day"} camp session ($${week.cost}/week)`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            memberIds: selectedMemberId ? [selectedMemberId] : [],
            color: SUMMER_CAMP_COLOR,
          };
        })
      );

      const res = await apiRequest("POST", "/api/events/bulk-import", {
        events,
        source: "summer-camp-import"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Schedule Imported!",
        description: `Successfully added ${data.imported} camp days to your calendar`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import schedule",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-import-title">
              Import Summer Camp Schedule
            </h1>
            <p className="text-white/60 text-sm">
              Add your son's summer camp days to the calendar
            </p>
          </div>
        </div>

        <Card className="titanium-glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              Camp Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Camp Name</Label>
                <Input
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="Summer Camp"
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-camp-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-year"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Assign to Family Member</Label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/20 text-white"
                data-testid="select-member"
              >
                <option value="">No specific member</option>
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="titanium-glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Preview
            </CardTitle>
            <CardDescription className="text-white/60">
              {totalDays} camp days across 8 weeks (Total: ${totalCost})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsedWeeks.map((week) => (
                <div 
                  key={week.week}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-10 rounded-full"
                      style={{ backgroundColor: SUMMER_CAMP_COLOR }}
                    />
                    <div>
                      <div className="text-white font-medium">
                        Week {week.week}: {format(week.startDate, "MMM d")} - {format(week.endDate, "MMM d")}
                      </div>
                      <div className="text-white/60 text-sm">
                        {week.days.length} days ({week.type === "full" ? "9am-4pm" : "9am-12pm"})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={week.type === "full" ? "default" : "secondary"}
                      className={week.type === "full" ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/70"}
                    >
                      {week.type === "full" ? "Full Day" : "Half Day"}
                    </Badge>
                    <span className="text-white/60 text-sm">${week.cost}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/")}
            className="border-white/20 text-white"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black"
            data-testid="button-import"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {totalDays} Camp Days
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
