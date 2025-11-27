import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isToday, isTomorrow, parseISO, startOfDay, isBefore, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import type { Event, FamilyMember, User, CaregiverPayRate, CaregiverTimeEntry } from "@shared/schema";
import { mapEventFromDb, mapFamilyMemberFromDb, type UiEvent } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  Users,
  DollarSign,
  Timer,
  Trash2,
  Settings
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

// Validation schemas for forms with trimmed inputs
const payRateFormSchema = z.object({
  hourlyRate: z.string().trim().min(1, "Hourly rate is required")
    .refine(val => !isNaN(parseFloat(val.trim())) && parseFloat(val.trim()) > 0, "Rate must be a positive number"),
});

const timeEntryFormSchema = z.object({
  date: z.string().trim().min(1, "Date is required"),
  hoursWorked: z.string().trim().min(1, "Hours are required")
    .refine(val => !isNaN(parseFloat(val.trim())) && parseFloat(val.trim()) > 0, "Hours must be positive")
    .refine(val => parseFloat(val.trim()) <= 24, "Hours cannot exceed 24"),
  notes: z.string().trim().optional(),
});

type PayRateFormValues = z.infer<typeof payRateFormSchema>;
type TimeEntryFormValues = z.infer<typeof timeEntryFormSchema>;

export default function CaregiverDashboard() {
  const { user } = useAuth();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("today");
  
  // Time tracking dialog state
  const [showLogHoursDialog, setShowLogHoursDialog] = useState(false);
  const [showPayRateDialog, setShowPayRateDialog] = useState(false);
  
  // Form instances with zod validation
  const payRateForm = useForm<PayRateFormValues>({
    resolver: zodResolver(payRateFormSchema),
    defaultValues: { hourlyRate: "" },
  });
  
  const timeEntryForm = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: { 
      date: format(new Date(), "yyyy-MM-dd"),
      hoursWorked: "",
      notes: "",
    },
  });

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
  
  // Get user's role in this family
  const { data: userRole } = useQuery<{ role: string }>({
    queryKey: [`/api/family/${activeFamilyId}/role`],
    enabled: !!activeFamilyId,
  });
  
  const isCaregiver = userRole?.role === 'caregiver';
  
  // Time tracking queries - only for caregivers
  const { data: payRate } = useQuery<CaregiverPayRate | null>({
    queryKey: ['/api/caregiver/pay-rate?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId && isCaregiver,
  });
  
  const { data: timeEntries = [] } = useQuery<CaregiverTimeEntry[]>({
    queryKey: ['/api/caregiver/time-entries?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId && isCaregiver,
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
      queryClient.invalidateQueries({ queryKey: ['/api/medication-logs/today?familyId=' + activeFamilyId] });
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
  
  // Time tracking mutations
  const setPayRateMutation = useMutation({
    mutationFn: async (data: PayRateFormValues) => {
      const res = await apiRequest('PUT', '/api/caregiver/pay-rate', {
        hourlyRate: data.hourlyRate,
        currency: "USD",
        familyId: activeFamilyId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/caregiver/pay-rate?familyId=' + activeFamilyId] });
      setShowPayRateDialog(false);
      payRateForm.reset();
      toast({
        title: "Pay rate updated",
        description: "Your hourly rate has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update pay rate",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const logTimeMutation = useMutation({
    mutationFn: async (data: TimeEntryFormValues) => {
      const res = await apiRequest('POST', '/api/caregiver/time-entries', {
        hoursWorked: data.hoursWorked,
        date: new Date(data.date),
        notes: data.notes || null,
        familyId: activeFamilyId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/caregiver/time-entries?familyId=' + activeFamilyId] });
      setShowLogHoursDialog(false);
      timeEntryForm.reset({ 
        date: format(new Date(), "yyyy-MM-dd"),
        hoursWorked: "",
        notes: "",
      });
      toast({
        title: "Hours logged",
        description: "Your work hours have been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to log hours",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await apiRequest('DELETE', `/api/caregiver/time-entries/${entryId}?familyId=${activeFamilyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/caregiver/time-entries?familyId=' + activeFamilyId] });
      toast({
        title: "Entry deleted",
        description: "The time entry has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete entry",
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
  
  // Time tracking calculations
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  
  const weeklyEntries = useMemo(() => 
    timeEntries.filter(entry => {
      const entryDate = new Date(entry.entryDate);
      return isWithinInterval(entryDate, { start: thisWeekStart, end: thisWeekEnd });
    }), [timeEntries, thisWeekStart, thisWeekEnd]
  );
  
  const weeklyHours = useMemo(() => 
    weeklyEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0), 
    [weeklyEntries]
  );
  
  const weeklyPay = useMemo(() => 
    weeklyEntries.reduce((sum, entry) => sum + parseFloat(entry.calculatedPay), 0), 
    [weeklyEntries]
  );
  
  const totalHours = useMemo(() => 
    timeEntries.reduce((sum, entry) => sum + parseFloat(entry.hoursWorked), 0), 
    [timeEntries]
  );
  
  const totalPay = useMemo(() => 
    timeEntries.reduce((sum, entry) => sum + parseFloat(entry.calculatedPay), 0), 
    [timeEntries]
  );
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: payRate?.currency || 'USD',
    }).format(amount);
  };

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

        {/* Time Tracking Section - Only visible to caregivers */}
        {isCaregiver && <Card className="bg-white/10 backdrop-blur-xl border-white/20" data-testid="card-time-tracking">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Time Tracking
              </CardTitle>
              <CardDescription className="text-white/60 mt-1">
                Log your hours and track pay
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={showPayRateDialog} onOpenChange={setShowPayRateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    data-testid="button-set-pay-rate"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {payRate ? formatCurrency(parseFloat(payRate.hourlyRate)) + "/hr" : "Set Rate"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#3A4A5A] border-white/20">
                  <DialogHeader>
                    <DialogTitle className="text-white">Set Hourly Rate</DialogTitle>
                    <DialogDescription className="text-white/60">
                      Enter your hourly rate. This will be used to calculate pay for new time entries.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...payRateForm}>
                    <form onSubmit={payRateForm.handleSubmit((data) => setPayRateMutation.mutate(data))} className="space-y-4 py-4">
                      <FormField
                        control={payRateForm.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Hourly Rate (USD)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="28.00"
                                  {...field}
                                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                  data-testid="input-hourly-rate"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPayRateDialog(false)}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          data-testid="button-cancel-rate"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={setPayRateMutation.isPending}
                          className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                          data-testid="button-save-rate"
                        >
                          {setPayRateMutation.isPending ? "Saving..." : "Save Rate"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showLogHoursDialog} onOpenChange={setShowLogHoursDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                    disabled={!payRate}
                    data-testid="button-log-hours"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Log Hours
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#3A4A5A] border-white/20">
                  <DialogHeader>
                    <DialogTitle className="text-white">Log Work Hours</DialogTitle>
                    <DialogDescription className="text-white/60">
                      Record the hours you worked. Pay will be calculated at {payRate ? formatCurrency(parseFloat(payRate.hourlyRate)) : "$0.00"}/hr.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...timeEntryForm}>
                    <form onSubmit={timeEntryForm.handleSubmit((data) => logTimeMutation.mutate(data))} className="space-y-4 py-4">
                      <FormField
                        control={timeEntryForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                className="bg-white/10 border-white/20 text-white"
                                data-testid="input-work-date"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={timeEntryForm.control}
                        name="hoursWorked"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Hours Worked</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                max="24"
                                placeholder="8.0"
                                {...field}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                data-testid="input-hours-worked"
                              />
                            </FormControl>
                            {field.value && payRate && (
                              <p className="text-sm text-emerald-300" data-testid="text-estimated-pay">
                                Estimated pay: {formatCurrency(parseFloat(field.value) * parseFloat(payRate.hourlyRate))}
                              </p>
                            )}
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={timeEntryForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Notes (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="What did you work on today?"
                                {...field}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                                rows={3}
                                data-testid="input-work-notes"
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowLogHoursDialog(false)}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          data-testid="button-cancel-hours"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={logTimeMutation.isPending}
                          className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                          data-testid="button-submit-hours"
                        >
                          {logTimeMutation.isPending ? "Logging..." : "Log Hours"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!payRate ? (
              <div className="flex flex-col items-center justify-center py-8 text-white/50">
                <DollarSign className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-center">Set your hourly rate to start tracking</p>
                <p className="text-sm text-center mt-1">Click "Set Rate" above to get started</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Weekly Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      This Week
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="text-weekly-hours">
                      {weeklyHours.toFixed(1)}h
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <DollarSign className="h-4 w-4" />
                      Weekly Pay
                    </div>
                    <p className="text-2xl font-bold text-emerald-300" data-testid="text-weekly-pay">
                      {formatCurrency(weeklyPay)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <Timer className="h-4 w-4" />
                      Total Hours
                    </div>
                    <p className="text-2xl font-bold text-white" data-testid="text-total-hours">
                      {totalHours.toFixed(1)}h
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <DollarSign className="h-4 w-4" />
                      Total Earned
                    </div>
                    <p className="text-2xl font-bold text-emerald-300" data-testid="text-total-pay">
                      {formatCurrency(totalPay)}
                    </p>
                  </div>
                </div>

                {/* Recent Time Entries */}
                <div>
                  <h3 className="text-white font-medium mb-3">Recent Entries</h3>
                  {timeEntries.length === 0 ? (
                    <div className="text-center py-6 text-white/50">
                      <p>No time entries yet</p>
                      <p className="text-sm mt-1">Click "Log Hours" to add your first entry</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px] pr-4">
                      <div className="space-y-2">
                        {timeEntries.slice(0, 10).map((entry) => (
                          <div 
                            key={entry.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                            data-testid={`card-time-entry-${entry.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-emerald-500/20">
                                <Clock className="h-4 w-4 text-emerald-300" />
                              </div>
                              <div>
                                <p className="text-white font-medium">
                                  {format(new Date(entry.entryDate), "MMM d, yyyy")}
                                </p>
                                <p className="text-sm text-white/60">
                                  {parseFloat(entry.hoursWorked).toFixed(1)} hours @ {formatCurrency(parseFloat(entry.hourlyRateAtTime))}/hr
                                </p>
                                {entry.notes && (
                                  <p className="text-xs text-white/40 mt-1 truncate max-w-[200px]">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-300 font-semibold">
                                {formatCurrency(parseFloat(entry.calculatedPay))}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => deleteTimeEntryMutation.mutate(entry.id)}
                                disabled={deleteTimeEntryMutation.isPending}
                                data-testid={`button-delete-entry-${entry.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>}
      </main>
    </div>
  );
}
