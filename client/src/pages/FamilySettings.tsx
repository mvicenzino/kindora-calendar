import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, ArrowLeft, UserPlus, Mail, Send, Trash2, LogOut, Crown, UserCheck, Heart, Check, Clock, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
}

interface WeeklySummarySchedule {
  familyId: string;
  isEnabled: boolean;
  dayOfWeek: string;
  timeOfDay: string;
  timezone: string;
  lastSentAt?: Date;
}

export default function FamilySettings() {
  const [, navigate] = useLocation();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [familyMemberEmail, setFamilyMemberEmail] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: family, isLoading } = useQuery<Family>({
    queryKey: ['/api/family', activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: allFamilies } = useQuery<Family[]>({
    queryKey: ['/api/families'],
  });

  const leaveFamilyMutation = useMutation({
    mutationFn: async (familyId: string) => {
      const res = await apiRequest('POST', `/api/family/${familyId}/leave`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Left family successfully",
        description: "You are no longer a member of this family.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to leave family",
        description: error.message || "Could not leave the family",
        variant: "destructive",
      });
    },
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: async (familyId: string) => {
      const res = await apiRequest('DELETE', `/api/family/${familyId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Family deleted",
        description: "The family calendar has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete family",
        description: error.message || "Could not delete the family",
        variant: "destructive",
      });
    },
  });

  const joinFamilyMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest('POST', '/api/family/join', { inviteCode });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/families'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: "Successfully joined family!",
        description: "You can now see shared events and family members.",
      });
      setJoinCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join family",
        description: error.message || "Invalid invite code",
        variant: "destructive",
      });
    },
  });

  const inviteCaregiverMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/family/forward-invite', { 
        email, 
        inviteCode: family?.inviteCode,
        familyName: family?.name,
        role: 'caregiver'
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Caregiver invited!",
        description: "They'll receive an email with instructions to join.",
      });
      setCaregiverEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const inviteFamilyMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/family/send-invite', { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "They'll receive an email with your invite code.",
      });
      setFamilyMemberEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Weekly Summary Schedule
  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery<{ schedule: WeeklySummarySchedule }>({
    queryKey: ['/api/weekly-summary-schedule', activeFamilyId],
    enabled: !!activeFamilyId,
  });

  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ['/api/family', activeFamilyId, 'role'],
    enabled: !!activeFamilyId,
  });

  const isOwnerOrMember = roleData?.role === 'owner' || roleData?.role === 'member';

  const updateScheduleMutation = useMutation({
    mutationFn: async (schedule: Partial<WeeklySummarySchedule>) => {
      const res = await apiRequest('PUT', '/api/weekly-summary-schedule', {
        familyId: activeFamilyId,
        ...schedule,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-summary-schedule', activeFamilyId] });
      toast({
        title: "Schedule updated",
        description: "Weekly summary schedule has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update schedule",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleScheduleToggle = (enabled: boolean) => {
    updateScheduleMutation.mutate({ isEnabled: enabled });
  };

  const handleDayChange = (day: string) => {
    updateScheduleMutation.mutate({ dayOfWeek: day });
  };

  const handleTimeChange = (time: string) => {
    updateScheduleMutation.mutate({ timeOfDay: time });
  };

  const copyInviteCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      setCodeCopied(true);
      toast({
        title: "Code copied!",
        description: "Share this code with anyone you want to invite.",
      });
      setTimeout(() => setCodeCopied(false), 3000);
    }
  };

  const handleInviteCaregiver = () => {
    if (!caregiverEmail.trim() || !caregiverEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    inviteCaregiverMutation.mutate(caregiverEmail.trim());
  };

  const handleInviteFamilyMember = () => {
    if (!familyMemberEmail.trim() || !familyMemberEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    inviteFamilyMemberMutation.mutate(familyMemberEmail.trim());
  };

  const handleJoinFamily = () => {
    if (joinCode.trim()) {
      joinFamilyMutation.mutate(joinCode.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Family Settings</h1>
            <p className="text-white/70">{family?.name || "Manage your calendar"}</p>
          </div>
        </div>

        {/* Invite Caregiver - Primary Action */}
        <Card className="mb-6 bg-gradient-to-br from-teal-500/20 to-teal-600/10 backdrop-blur-md border-teal-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Heart className="w-5 h-5 text-pink-400" />
              Invite a Caregiver
            </CardTitle>
            <CardDescription className="text-white/80">
              Invite your nanny, babysitter, or caregiver to view the calendar and mark tasks complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                placeholder="nanny@email.com"
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                data-testid="input-caregiver-email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInviteCaregiver();
                }}
              />
              <Button
                onClick={handleInviteCaregiver}
                disabled={!caregiverEmail.trim() || inviteCaregiverMutation.isPending}
                className="bg-teal-500 hover:bg-teal-600 text-white flex-shrink-0"
                data-testid="button-invite-caregiver"
              >
                <Send className="w-4 h-4 mr-2" />
                {inviteCaregiverMutation.isPending ? "Sending..." : "Invite"}
              </Button>
            </div>
            <p className="text-sm text-white/60 mt-3">
              Caregivers can view events, log medications, and mark tasks done - but can't delete or edit events.
            </p>
          </CardContent>
        </Card>

        {/* Invite Family Member */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              Invite Family Member
            </CardTitle>
            <CardDescription className="text-white/70">
              Invite your spouse, partner, or family member with full access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                value={familyMemberEmail}
                onChange={(e) => setFamilyMemberEmail(e.target.value)}
                placeholder="spouse@email.com"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                data-testid="input-family-member-email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInviteFamilyMember();
                }}
              />
              <Button
                onClick={handleInviteFamilyMember}
                disabled={!familyMemberEmail.trim() || inviteFamilyMemberMutation.isPending}
                className="bg-purple-500 hover:bg-purple-600 text-white flex-shrink-0"
                data-testid="button-invite-family-member"
              >
                <Send className="w-4 h-4 mr-2" />
                {inviteFamilyMemberMutation.isPending ? "Sending..." : "Invite"}
              </Button>
            </div>

            <div className="pt-3 border-t border-white/10">
              <Label className="text-white/80 text-sm">Or share your invite code manually</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={family?.inviteCode || ""}
                  readOnly
                  className="bg-white/5 border-white/20 text-white font-mono tracking-wider"
                  data-testid="input-invite-code"
                />
                <Button
                  onClick={copyInviteCode}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0 min-w-[80px]"
                  data-testid="button-copy-code"
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Calendars */}
        {allFamilies && allFamilies.length > 0 && (
          <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5" />
                Your Calendars
              </CardTitle>
              <CardDescription className="text-white/70">
                Manage calendars you belong to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allFamilies.map((fam) => (
                <FamilyRow 
                  key={fam.id} 
                  family={fam} 
                  isActive={fam.id === activeFamilyId}
                  onLeave={() => leaveFamilyMutation.mutate(fam.id)}
                  onDelete={() => deleteFamilyMutation.mutate(fam.id)}
                  isLeaving={leaveFamilyMutation.isPending}
                  isDeleting={deleteFamilyMutation.isPending}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Weekly Email Summary */}
        {isOwnerOrMember && (
          <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5" />
                Weekly Email Summary
              </CardTitle>
              <CardDescription className="text-white/70">
                Automatically send a weekly calendar summary to all family members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSchedule ? (
                <div className="text-white/60">Loading...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/70" />
                      <Label className="text-white">Enable automatic summaries</Label>
                    </div>
                    <Switch
                      checked={scheduleData?.schedule.isEnabled ?? false}
                      onCheckedChange={handleScheduleToggle}
                      disabled={updateScheduleMutation.isPending}
                      data-testid="switch-weekly-summary-enabled"
                    />
                  </div>
                  
                  {scheduleData?.schedule.isEnabled && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white/80 text-sm">Day of Week</Label>
                          <Select
                            value={scheduleData?.schedule.dayOfWeek ?? '0'}
                            onValueChange={handleDayChange}
                            disabled={updateScheduleMutation.isPending}
                          >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-weekly-summary-day">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/20">
                              <SelectItem value="0" className="text-white">Sunday</SelectItem>
                              <SelectItem value="1" className="text-white">Monday</SelectItem>
                              <SelectItem value="2" className="text-white">Tuesday</SelectItem>
                              <SelectItem value="3" className="text-white">Wednesday</SelectItem>
                              <SelectItem value="4" className="text-white">Thursday</SelectItem>
                              <SelectItem value="5" className="text-white">Friday</SelectItem>
                              <SelectItem value="6" className="text-white">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-white/80 text-sm">Time</Label>
                          <Select
                            value={scheduleData?.schedule.timeOfDay ?? '08:00'}
                            onValueChange={handleTimeChange}
                            disabled={updateScheduleMutation.isPending}
                          >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white" data-testid="select-weekly-summary-time">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/20 max-h-60">
                              <SelectItem value="06:00" className="text-white">6:00 AM</SelectItem>
                              <SelectItem value="07:00" className="text-white">7:00 AM</SelectItem>
                              <SelectItem value="08:00" className="text-white">8:00 AM</SelectItem>
                              <SelectItem value="09:00" className="text-white">9:00 AM</SelectItem>
                              <SelectItem value="10:00" className="text-white">10:00 AM</SelectItem>
                              <SelectItem value="12:00" className="text-white">12:00 PM</SelectItem>
                              <SelectItem value="18:00" className="text-white">6:00 PM</SelectItem>
                              <SelectItem value="20:00" className="text-white">8:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <p className="text-sm text-white/60">
                        All family members will receive a weekly calendar summary at the scheduled time.
                        Members can opt out in their profile settings.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Join Another Calendar */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5" />
              Join Another Calendar
            </CardTitle>
            <CardDescription className="text-white/70">
              Have an invite code? Enter it here to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character code"
                className="bg-white/5 border-white/20 text-white font-mono uppercase"
                data-testid="input-join-code"
                maxLength={8}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinFamily();
                }}
              />
              <Button
                onClick={handleJoinFamily}
                disabled={!joinCode.trim() || joinFamilyMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
                data-testid="button-join-family"
              >
                {joinFamilyMutation.isPending ? "Joining..." : "Join"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FamilyRowProps {
  family: Family;
  isActive: boolean;
  onLeave: () => void;
  onDelete: () => void;
  isLeaving: boolean;
  isDeleting: boolean;
}

function FamilyRow({ family, isActive, onLeave, onDelete, isLeaving, isDeleting }: FamilyRowProps) {
  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ['/api/family', family.id, 'role'],
  });

  const isOwner = roleData?.role === 'owner';
  const isCaregiver = roleData?.role === 'caregiver';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${isActive ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5 border border-white/10'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-purple-500/30' : 'bg-white/10'}`}>
          {isOwner ? (
            <Crown className="w-5 h-5 text-yellow-400" />
          ) : isCaregiver ? (
            <Heart className="w-5 h-5 text-pink-400" />
          ) : (
            <UserCheck className="w-5 h-5 text-white/70" />
          )}
        </div>
        <div>
          <div className="font-medium text-white flex items-center gap-2">
            {family.name}
            {isActive && (
              <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="text-sm text-white/60">
            {isOwner ? 'Owner' : isCaregiver ? 'Caregiver' : 'Member'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOwner ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                disabled={isDeleting}
                data-testid={`button-delete-family-${family.id}`}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-white/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete "{family.name}"?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/70">
                  This will permanently delete this calendar and remove all members. 
                  All events and data will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-red-500 text-white hover:bg-red-600"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
                disabled={isLeaving}
                data-testid={`button-leave-family-${family.id}`}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-white/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Leave "{family.name}"?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/70">
                  You will no longer see this calendar or its events.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLeave}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  Leave Calendar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
