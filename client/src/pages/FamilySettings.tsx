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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Users, ArrowLeft, UserPlus, Mail, Send, Trash2, LogOut, Crown, UserCheck, Heart } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
}

export default function FamilySettings() {
  const [, navigate] = useLocation();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [forwardEmail, setForwardEmail] = useState("");
  const [forwardInviteCode, setForwardInviteCode] = useState("");
  const [forwardRole, setForwardRole] = useState<"member" | "caregiver">("caregiver");

  // Fetch current family
  const { data: family, isLoading } = useQuery<Family>({
    queryKey: ['/api/family', activeFamilyId],
    enabled: !!activeFamilyId,
  });

  // Fetch all families the user belongs to
  const { data: allFamilies } = useQuery<Family[]>({
    queryKey: ['/api/families'],
  });

  // Fetch user's roles in all families
  interface FamilyWithRole extends Family {
    role?: string;
  }

  // Leave family mutation
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

  // Delete family mutation
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

  // Join family mutation
  const joinFamilyMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest('POST', '/api/family/join', { inviteCode });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all family-related queries using query key prefixes
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

  // Send invite email mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest('POST', '/api/family/send-invite', { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "The invite email has been sent successfully.",
      });
      setInviteEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please check your email configuration",
        variant: "destructive",
      });
    },
  });

  // Forward invite code to someone else (e.g., caregiver, healthcare worker)
  const forwardInviteMutation = useMutation({
    mutationFn: async ({ email, inviteCode, familyName, role }: { email: string; inviteCode: string; familyName?: string; role?: string }) => {
      const res = await apiRequest('POST', '/api/family/forward-invite', { email, inviteCode, familyName, role });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "The invite has been forwarded successfully.",
      });
      setForwardEmail("");
      setForwardInviteCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please check your email configuration",
        variant: "destructive",
      });
    },
  });

  const copyInviteCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      toast({
        title: "Invite code copied!",
        description: "Share this code with family members to invite them.",
      });
    }
  };

  const handleJoinFamily = () => {
    if (joinCode.trim()) {
      joinFamilyMutation.mutate(joinCode.trim());
    }
  };

  const handleSendInvite = () => {
    if (inviteEmail.trim() && inviteEmail.includes('@')) {
      sendInviteMutation.mutate(inviteEmail.trim());
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    }
  };

  const handleForwardInvite = () => {
    if (!forwardEmail.trim() || !forwardEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    if (!forwardInviteCode.trim()) {
      toast({
        title: "Missing invite code",
        description: "Please enter the invite code to forward",
        variant: "destructive",
      });
      return;
    }
    forwardInviteMutation.mutate({
      email: forwardEmail.trim(),
      inviteCode: forwardInviteCode.trim().toUpperCase(),
      familyName: undefined, // We don't know the family name for other families
      role: forwardRole
    });
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
        {/* Header */}
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
            <p className="text-white/70">Manage your shared calendar</p>
          </div>
        </div>

        {/* Current Family Card */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              Your Family
            </CardTitle>
            <CardDescription className="text-white/70">
              Share your calendar with family members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white/90 text-sm">Family Name</Label>
              <div className="text-xl font-semibold text-white mt-1">
                {family?.name || "My Family"}
              </div>
            </div>

            <div>
              <Label className="text-white/90 text-sm">Invite Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={family?.inviteCode || ""}
                  readOnly
                  className="bg-white/5 border-white/20 text-white text-lg font-mono tracking-wider"
                  data-testid="input-invite-code"
                />
                <Button
                  onClick={copyInviteCode}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 flex-shrink-0"
                  data-testid="button-copy-code"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-white/60 mt-2">
                Share this code with your wife or family members so they can join your shared calendar
              </p>
            </div>

            <div className="pt-2 border-t border-white/10">
              <Label className="text-white/90 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Invite by Email
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-invite-email"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendInvite();
                    }
                  }}
                />
                <Button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || sendInviteMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
                  data-testid="button-send-invite"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendInviteMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
              <p className="text-sm text-white/60 mt-2">
                They'll receive a welcome email with a link to join Kindora Calendar and your invite code
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Manage Your Families Card */}
        {allFamilies && allFamilies.length > 0 && (
          <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5" />
                Your Calendars
              </CardTitle>
              <CardDescription className="text-white/70">
                Manage your family calendars - leave or delete calendars you no longer need
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

        {/* Join Different Family Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5" />
              Join a Different Family
            </CardTitle>
            <CardDescription className="text-white/70">
              Join another family's calendar or invite caregivers to access it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="join-code" className="text-white/90">
                Invite Code
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter 8-character code"
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-join-code"
                />
                <Button
                  onClick={handleJoinFamily}
                  disabled={!joinCode.trim() || joinFamilyMutation.isPending}
                  className="bg-purple-500 hover:bg-purple-600 text-white flex-shrink-0"
                  data-testid="button-join-family"
                >
                  {joinFamilyMutation.isPending ? "Joining..." : "Join"}
                </Button>
              </div>
              <p className="text-sm text-white/60 mt-2">
                <strong className="text-white/80">Note:</strong> When you join another family, you'll switch to their calendar. 
                If you're the only person in your current family, it will be removed. Otherwise, you'll just leave it.
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <Label className="text-white/90 text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send Invite Code to Someone
              </Label>
              <p className="text-sm text-white/60 mt-1 mb-3">
                Forward an invite code to caregivers, healthcare workers, or family helpers
              </p>
              <div className="space-y-2">
                <Input
                  value={forwardInviteCode}
                  onChange={(e) => setForwardInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="bg-white/5 border-white/20 text-white"
                  data-testid="input-forward-invite-code"
                />
                <div>
                  <Label className="text-white/90 text-sm mb-1 block">
                    Invite as
                  </Label>
                  <Select value={forwardRole} onValueChange={(val: "member" | "caregiver") => setForwardRole(val)}>
                    <SelectTrigger 
                      className="bg-white/5 border-white/20 text-white"
                      data-testid="select-forward-role"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member" data-testid="option-member">
                        Family Member (full access)
                      </SelectItem>
                      <SelectItem value="caregiver" data-testid="option-caregiver">
                        Caregiver (view-only, can mark tasks done)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/50 mt-1">
                    {forwardRole === "caregiver" 
                      ? "Caregivers can view events and mark tasks complete but cannot delete items"
                      : "Family members have full access to create, edit, and delete events"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={forwardEmail}
                    onChange={(e) => setForwardEmail(e.target.value)}
                    placeholder="caregiver@example.com"
                    className="bg-white/5 border-white/20 text-white"
                    data-testid="input-forward-email"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleForwardInvite();
                      }
                    }}
                  />
                  <Button
                    onClick={handleForwardInvite}
                    disabled={!forwardEmail.trim() || !forwardInviteCode.trim() || forwardInviteMutation.isPending}
                    className="bg-teal-500 hover:bg-teal-600 text-white flex-shrink-0"
                    data-testid="button-forward-invite"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {forwardInviteMutation.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-white/80">
            <strong className="text-white">How it works:</strong> When you share your calendar with family members,
            everyone sees the same events and family members. Any changes made by one person are visible to everyone in the family.
          </p>
        </div>
      </div>
    </div>
  );
}

// FamilyRow component for managing individual families
interface FamilyRowProps {
  family: Family;
  isActive: boolean;
  onLeave: () => void;
  onDelete: () => void;
  isLeaving: boolean;
  isDeleting: boolean;
}

function FamilyRow({ family, isActive, onLeave, onDelete, isLeaving, isDeleting }: FamilyRowProps) {
  // Fetch user's role in this family
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
                  This will permanently delete this family calendar and remove all members. 
                  All events, messages, and shared data will be lost. This action cannot be undone.
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
                  You will no longer see this family's calendar or events. 
                  You can rejoin later if you have the invite code.
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
                  Leave Family
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
