import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, ArrowLeft, UserPlus, Mail, Send } from "lucide-react";

interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: Date;
}

export default function FamilySettings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Fetch current family
  const { data: family, isLoading } = useQuery<Family>({
    queryKey: ['/api/family'],
  });

  // Join family mutation
  const joinFamilyMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest('POST', '/api/family/join', { inviteCode });
      return await res.json();
    },
    onSuccess: () => {
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
                They'll receive a welcome email with a link to join Kindora Family and your invite code
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Join Different Family Card */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5" />
              Join a Different Family
            </CardTitle>
            <CardDescription className="text-white/70">
              Enter an invite code to join another family's calendar
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
