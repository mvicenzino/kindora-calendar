import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, parseISO, startOfDay, isBefore } from "date-fns";
import type { Event, FamilyMember, User } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb, type UiEvent } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarDays, 
  Pill, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  ChevronRight,
  Calendar,
  Heart,
  Activity,
  Sun,
  Moon,
  Sunrise,
  Users
} from "lucide-react";
import { Link } from "wouter";
import Header from "@/components/Header";

type MedicationWithMember = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  scheduledTimes: string[] | null;
  memberId: string;
  isActive: boolean;
  member: { id: string; name: string; color: string } | null;
};

type MedicationLog = {
  id: string;
  medicationId: string;
  administeredBy: string;
  administeredAt: string | Date;
  scheduledTime: string | Date | null;
  status: string;
  notes: string | null;
  medication?: { id: string; name: string; dosage: string };
  administeredByUser?: { id: string; firstName: string; lastName: string };
};

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("today");

  const { data: rawMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members', activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: rawEvents = [] } = useQuery<Event[]>({
    queryKey: ['/api/events?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: medications = [] } = useQuery<MedicationWithMember[]>({
    queryKey: ['/api/medications?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: todayLogs = [] } = useQuery<MedicationLog[]>({
    queryKey: ['/api/medication-logs/today?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const members = useMemo(() => rawMembers.map(mapFamilyMemberFromDb), [rawMembers]);
  const events = useMemo(() => rawEvents.map(e => ({
    ...mapEventFromDb(e),
    members: members.filter(m => e.memberIds.includes(m.id))
  })), [rawEvents, members]);

  const todayEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => isToday(e.startTime))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => !isToday(e.startTime) && e.startTime > now)
      .slice(0, 5);
  }, [events]);

  const medicalEvents = useMemo(() => 
    todayEvents.filter(e => 
      e.title.toLowerCase().includes('doctor') ||
      e.title.toLowerCase().includes('appointment') ||
      e.title.toLowerCase().includes('therapy') ||
      e.title.toLowerCase().includes('medical') ||
      e.title.toLowerCase().includes('medication') ||
      e.title.toLowerCase().includes('check-up')
    ), [todayEvents]
  );

  const logMedicationMutation = useMutation({
    mutationFn: async ({ medicationId, status, notes }: { medicationId: string; status: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/medications/${medicationId}/logs`, {
        status,
        notes,
        administeredAt: new Date(),
        familyId: activeFamilyId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medication-logs/today', activeFamilyId] });
      toast({
        title: "Medication logged",
        description: "The dose has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to log medication",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const getMedicationStatus = (medication: MedicationWithMember) => {
    const logs = todayLogs.filter(l => l.medicationId === medication.id);
    if (logs.some(l => l.status === 'given')) {
      return 'given';
    }
    if (logs.some(l => l.status === 'skipped' || l.status === 'refused')) {
      return 'skipped';
    }
    return 'pending';
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { icon: Sunrise, label: "Good Morning", greeting: "morning" };
    if (hour < 17) return { icon: Sun, label: "Good Afternoon", greeting: "afternoon" };
    return { icon: Moon, label: "Good Evening", greeting: "evening" };
  };

  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay.icon;

  const pendingMeds = medications.filter(m => getMedicationStatus(m) === 'pending');
  const completedMeds = medications.filter(m => getMedicationStatus(m) === 'given');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
      <Header currentView="day" onViewChange={() => {}} />
      
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white/70">
              <TimeIcon className="h-5 w-5" />
              <span className="text-sm font-medium">{timeOfDay.label}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-dashboard-title">
              Today's Care Dashboard
            </h1>
            <p className="text-white/70" data-testid="text-dashboard-date">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" data-testid="link-calendar">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar View
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-stat-events">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <CalendarDays className="h-5 w-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{todayEvents.length}</p>
                  <p className="text-sm text-white/60">Today's Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-stat-medical">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Heart className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{medicalEvents.length}</p>
                  <p className="text-sm text-white/60">Medical Appts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-stat-meds-pending">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Pill className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{pendingMeds.length}</p>
                  <p className="text-sm text-white/60">Meds Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-stat-meds-done">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{completedMeds.length}</p>
                  <p className="text-sm text-white/60">Meds Given</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-medications">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Medication Schedule
              </CardTitle>
              <Badge variant="outline" className="border-white/30 text-white/80">
                {medications.length} Total
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {medications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-white/50">
                    <Pill className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-center">No medications scheduled</p>
                    <p className="text-sm text-center mt-1">Family members can add medications in settings</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medications.map((med) => {
                      const status = getMedicationStatus(med);
                      const member = members.find(m => m.id === med.memberId);
                      
                      return (
                        <div 
                          key={med.id}
                          className={`p-4 rounded-xl border ${
                            status === 'given' 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : status === 'skipped'
                              ? 'bg-gray-500/10 border-gray-500/30'
                              : 'bg-white/5 border-white/10'
                          }`}
                          data-testid={`card-medication-${med.id}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {member && (
                                <Avatar className="h-8 w-8 ring-2" style={{ ['--tw-ring-color' as string]: member.color }}>
                                  <AvatarFallback 
                                    className="text-xs text-white"
                                    style={{ backgroundColor: member.color }}
                                  >
                                    {member.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div>
                                <p className="font-semibold text-white" data-testid={`text-med-name-${med.id}`}>
                                  {med.name}
                                </p>
                                <p className="text-sm text-white/70">{med.dosage} • {med.frequency}</p>
                                {med.instructions && (
                                  <p className="text-xs text-white/50 mt-1">{med.instructions}</p>
                                )}
                                {med.scheduledTimes && med.scheduledTimes.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {med.scheduledTimes.map((time, i) => (
                                      <Badge key={i} variant="outline" className="text-xs border-white/20 text-white/60">
                                        {time}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {status === 'given' ? (
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Given
                                </Badge>
                              ) : status === 'skipped' ? (
                                <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">
                                  Skipped
                                </Badge>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30"
                                    onClick={() => logMedicationMutation.mutate({ medicationId: med.id, status: 'given' })}
                                    disabled={logMedicationMutation.isPending}
                                    data-testid={`button-log-med-${med.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Log Dose
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-today-events">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <Badge variant="outline" className="border-white/30 text-white/80">
                {todayEvents.length} Events
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {todayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-white/50">
                    <CalendarDays className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-center">No events scheduled for today</p>
                    <Link href="/">
                      <Button variant="ghost" className="text-white/70 mt-2">
                        View calendar
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayEvents.map((event) => {
                      const isMedical = 
                        event.title.toLowerCase().includes('doctor') ||
                        event.title.toLowerCase().includes('appointment') ||
                        event.title.toLowerCase().includes('medical') ||
                        event.title.toLowerCase().includes('therapy');
                      
                      return (
                        <div 
                          key={event.id}
                          className={`p-4 rounded-xl border ${
                            isMedical 
                              ? 'bg-red-500/10 border-red-500/30' 
                              : 'bg-white/5 border-white/10'
                          }`}
                          data-testid={`card-event-${event.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isMedical ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                              {isMedical ? (
                                <Heart className="h-4 w-4 text-red-300" />
                              ) : (
                                <CalendarDays className="h-4 w-4 text-blue-300" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-white" data-testid={`text-event-title-${event.id}`}>
                                {event.title}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-white/70 mt-1">
                                <Clock className="h-3 w-3" />
                                <span>{format(event.startTime, "h:mm a")}</span>
                              </div>
                              {event.members && event.members.length > 0 && (
                                <div className="flex -space-x-2 mt-2">
                                  {event.members.map((member) => (
                                    <Avatar 
                                      key={member.id} 
                                      className="h-6 w-6 ring-2 ring-white/20"
                                    >
                                      <AvatarFallback 
                                        className="text-xs text-white"
                                        style={{ backgroundColor: member.color }}
                                      >
                                        {member.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              )}
                            </div>
                            {event.completed && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                Done
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-activity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/50">
                <Activity className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-center">No activity logged today</p>
                <p className="text-sm text-center mt-1">Medication logs will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayLogs.slice(0, 10).map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    data-testid={`card-log-${log.id}`}
                  >
                    <div className={`p-2 rounded-lg ${
                      log.status === 'given' ? 'bg-green-500/20' : 'bg-gray-500/20'
                    }`}>
                      {log.status === 'given' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-300" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {log.medication?.name || 'Medication'} - {log.medication?.dosage}
                      </p>
                      <p className="text-sm text-white/60">
                        {log.status === 'given' ? 'Given' : 'Skipped'} at {format(new Date(log.administeredAt), "h:mm a")}
                        {log.administeredByUser && (
                          <span> by {log.administeredByUser.firstName}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
