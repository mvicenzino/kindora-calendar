import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar, Pill, Users, Phone, AlertTriangle, FileText, Clock, MapPin } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";

interface EmergencyBridgeData {
  family: {
    name: string;
  };
  events: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string | null;
    location: string | null;
    notes: string | null;
  }>;
  medications: Array<{
    id: string;
    name: string;
    dosage: string | null;
    frequency: string | null;
    timeOfDay: string[];
    notes: string | null;
    familyMemberName: string;
  }>;
  familyMembers: Array<{
    id: string;
    name: string;
    role: string | null;
    allergies: string | null;
    medicalNotes: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
  }>;
  documents: Array<{
    title: string;
    category: string;
    notes: string | null;
    familyMemberName: string | null;
  }>;
  expiresAt: string;
}

export default function EmergencyBridge() {
  const [, params] = useRoute("/emergency-bridge/:token");
  const token = params?.token;

  const { data, isLoading, error } = useQuery<EmergencyBridgeData>({
    queryKey: ['/api/emergency-bridge', token],
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Shield className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p>Loading emergency information...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 backdrop-blur border-slate-700">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Unavailable</h1>
            <p className="text-slate-400">
              This emergency access link has expired or is invalid. Please contact the family for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiresDate = new Date(data.expiresAt);
  const now = new Date();
  const hoursLeft = Math.max(0, Math.floor((expiresDate.getTime() - now.getTime()) / 3600000));

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
    return format(date, 'EEE, MMM d at h:mm a');
  };

  const upcomingEvents = data.events.filter(event => new Date(event.startTime) >= now);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-orange-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-orange-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-white">Emergency Bridge</h1>
          </div>
          <p className="text-white/80 text-lg">{data.family.name}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-orange-300" />
            <span className="text-orange-300 text-sm">
              Access expires in {hoursLeft > 24 ? `${Math.floor(hoursLeft / 24)} days` : `${hoursLeft} hours`}
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-blue-400" />
                Upcoming Schedule
              </CardTitle>
              <CardDescription className="text-white/70">
                Next 7 days of events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-white/5 rounded-lg border border-white/10"
                    data-testid={`event-${event.id}`}
                  >
                    <div className="font-medium text-white">{event.title}</div>
                    <div className="text-sm text-white/70 mt-1">
                      {formatEventDate(event.startTime)}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm text-white/60 mt-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                    {event.notes && (
                      <div className="text-sm text-white/50 mt-2 italic">{event.notes}</div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/50 text-center py-4">No upcoming events</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Pill className="w-5 h-5 text-pink-400" />
                Medications
              </CardTitle>
              <CardDescription className="text-white/70">
                Current medication schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.medications.length > 0 ? (
                data.medications.map((med) => (
                  <div
                    key={med.id}
                    className="p-3 bg-white/5 rounded-lg border border-white/10"
                    data-testid={`medication-${med.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{med.name}</div>
                      <Badge variant="secondary" className="bg-pink-500/20 text-pink-200">
                        {med.familyMemberName}
                      </Badge>
                    </div>
                    {med.dosage && (
                      <div className="text-sm text-white/70 mt-1">Dosage: {med.dosage}</div>
                    )}
                    {med.frequency && (
                      <div className="text-sm text-white/70">Frequency: {med.frequency}</div>
                    )}
                    {med.timeOfDay && med.timeOfDay.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {med.timeOfDay.map((time, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-white/30 text-white/70">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {med.notes && (
                      <div className="text-sm text-white/50 mt-2 italic">{med.notes}</div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/50 text-center py-4">No medications on file</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-green-400" />
                Family Members
              </CardTitle>
              <CardDescription className="text-white/70">
                Important information and contacts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.familyMembers.length > 0 ? (
                data.familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-white/5 rounded-lg border border-white/10"
                    data-testid={`member-${member.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{member.name}</div>
                      {member.role && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-200">
                          {member.role}
                        </Badge>
                      )}
                    </div>
                    {member.allergies && (
                      <div className="flex items-start gap-2 mt-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-300">Allergies: {member.allergies}</div>
                      </div>
                    )}
                    {member.medicalNotes && (
                      <div className="text-sm text-white/60 mt-2">
                        Medical notes: {member.medicalNotes}
                      </div>
                    )}
                    {member.emergencyContact && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span className="text-white/80">{member.emergencyContact}</span>
                        {member.emergencyPhone && (
                          <a
                            href={`tel:${member.emergencyPhone}`}
                            className="text-blue-400 hover:underline"
                          >
                            {member.emergencyPhone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/50 text-center py-4">No family member information</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5 text-purple-400" />
                Care Documents
              </CardTitle>
              <CardDescription className="text-white/70">
                Available care documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.documents.length > 0 ? (
                data.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white/5 rounded-lg border border-white/10"
                    data-testid={`document-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-white">{doc.title}</div>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-200">
                        {doc.category}
                      </Badge>
                    </div>
                    {doc.familyMemberName && (
                      <div className="text-sm text-white/70 mt-1">For: {doc.familyMemberName}</div>
                    )}
                    {doc.notes && (
                      <div className="text-sm text-white/50 mt-2 italic">{doc.notes}</div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-white/50 text-center py-4">No documents available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-white/50 text-sm">
          <p>This is a temporary emergency access view. Contact the family for full access.</p>
        </div>
      </div>
    </div>
  );
}
