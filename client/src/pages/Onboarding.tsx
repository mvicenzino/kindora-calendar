import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Calendar,
  Heart,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Plus,
  X,
  UserPlus,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Family } from "@shared/schema";

type OnboardingStep =
  | "welcome"
  | "role"
  | "owner-name"
  | "add-members"
  | "owner-success"
  | "aide-code"
  | "aide-success";

type CareContextOption = "kids" | "parent" | "extended" | "multi";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [familyName, setFamilyName] = useState("");
  const [careContext, setCareContext] = useState<CareContextOption[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [joinedFamily, setJoinedFamily] = useState<Family | null>(null);
  const [createdFamilyId, setCreatedFamilyId] = useState<string | null>(null);
  const [memberEntries, setMemberEntries] = useState<{ name: string }[]>([]);
  const [newMemberName, setNewMemberName] = useState("");

  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ["/api/families"],
  });

  useEffect(() => {
    if (user?.lastName) {
      setFamilyName(`The ${user.lastName} Family`);
    } else if (user?.firstName) {
      setFamilyName(`${user.firstName}'s Family`);
    }
  }, [user]);

  const createFamilyMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const res = await apiRequest("POST", "/api/families", { name });
      return res.json() as Promise<Family>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const renameFamilyMutation = useMutation({
    mutationFn: async ({ familyId, name }: { familyId: string; name: string }) => {
      const res = await apiRequest("PUT", `/api/families/${familyId}`, { name });
      return res.json() as Promise<Family>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
    },
  });

  const joinFamilyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/family/join", {
        inviteCode: code,
        role: "caregiver",
      });
      return res.json() as Promise<Family>;
    },
    onSuccess: (family) => {
      queryClient.invalidateQueries({ queryKey: ["/api/families"] });
      setJoinedFamily(family);
      setStep("aide-success");
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async ({ name, color, familyId }: { name: string; color: string; familyId: string }) => {
      const res = await apiRequest("POST", "/api/family-members", { name, color, familyId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
    },
  });

  const MEMBER_COLORS = [
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6', '#F97316',
  ];

  const handleOwnerSubmit = async () => {
    const name = familyName.trim();
    if (!name) {
      toast({ title: "Please enter a family name", variant: "destructive" });
      return;
    }
    const ownerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Me";
    setMemberEntries([{ name: ownerName }]);
    setNewMemberName("");
    try {
      if (families.length > 0) {
        await renameFamilyMutation.mutateAsync({ familyId: families[0].id, name });
        setCreatedFamilyId(families[0].id);
      } else {
        const newFamily = await createFamilyMutation.mutateAsync({ name });
        setCreatedFamilyId(newFamily.id);
      }
      setStep("add-members");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleAddMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    if (memberEntries.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Already added", description: `${trimmed} is already in the list.`, variant: "destructive" });
      return;
    }
    setMemberEntries(prev => [...prev, { name: trimmed }]);
    setNewMemberName("");
  };

  const handleRemoveMember = (index: number) => {
    if (index === 0) return;
    setMemberEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleMembersSubmit = async () => {
    const familyId = createdFamilyId || (families.length > 0 ? families[0].id : null);
    if (!familyId) {
      toast({ title: "Family not created yet", description: "Please go back and create a family first.", variant: "destructive" });
      return;
    }
    try {
      for (let i = 0; i < memberEntries.length; i++) {
        await createMemberMutation.mutateAsync({
          name: memberEntries[i].name,
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          familyId,
        });
      }
      setStep("owner-success");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleJoinSubmit = async () => {
    const code = inviteCode.trim();
    if (!code) {
      toast({ title: "Please enter your invite code", variant: "destructive" });
      return;
    }
    try {
      await joinFamilyMutation.mutateAsync(code);
    } catch {
      toast({
        title: "That code isn't valid",
        description: "Check with your family and try again.",
        variant: "destructive",
      });
    }
  };

  const markOnboardingComplete = () => {
    localStorage.setItem("kindora_onboarding_complete", "true");
  };

  const goToCalendar = () => {
    markOnboardingComplete();
    setLocation("/");
  };
  const goToInvite = () => {
    markOnboardingComplete();
    setLocation("/family");
  };

  const careOptions: { id: CareContextOption; label: string }[] = [
    { id: "kids", label: "Kids" },
    { id: "parent", label: "Parent / Grandparent" },
    { id: "extended", label: "Extended family" },
    { id: "multi", label: "Multiple generations" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {step === "welcome" && (
          <WelcomeStep onNext={() => setStep("role")} />
        )}

        {step === "role" && (
          <RoleStep
            onOwner={() => setStep("owner-name")}
            onAide={() => setStep("aide-code")}
          />
        )}

        {step === "owner-name" && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  What should we call your family?
                </h2>
                <p className="text-white/60 text-sm">
                  This will appear when inviting others to join
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80 text-sm">Family name</Label>
                <Input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="e.g., The Johnsons, Garcia Household"
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/40 text-base"
                  data-testid="input-family-name"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleOwnerSubmit()}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 text-xs">Who do you care for? (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {careOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCareContext(prev => 
                        prev.includes(opt.id) 
                          ? prev.filter(c => c !== opt.id) 
                          : [...prev, opt.id]
                      )}
                      className={`px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                        careContext.includes(opt.id)
                          ? "bg-white/20 border-white/50 text-white"
                          : "bg-white/5 border-white/20 text-white/60"
                      }`}
                      data-testid={`tag-${opt.id}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleOwnerSubmit}
                disabled={createFamilyMutation.isPending || renameFamilyMutation.isPending || !familyName.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0"
                data-testid="button-create-family"
              >
                {(createFamilyMutation.isPending || renameFamilyMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Create family
              </Button>
            </div>
          </Card>
        )}

        {step === "add-members" && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Who's in your family?
                </h2>
                <p className="text-white/60 text-sm">
                  Add the people you'll be scheduling for. You can always edit this later.
                </p>
              </div>

              <div className="space-y-2">
                {memberEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg bg-white/10 border border-white/20"
                    data-testid={`member-entry-${index}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length] }}
                    >
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{entry.name}</p>
                    </div>
                    {index === 0 ? (
                      <span className="text-xs text-white/40 flex-shrink-0">You</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
                        data-testid={`button-remove-member-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-white/70 text-xs">Add a family member</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Name (e.g., Carolyn, Sebby)"
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/40 text-sm flex-1"
                    data-testid="input-new-member-name"
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleAddMember}
                    disabled={!newMemberName.trim()}
                    className="border-white/30 text-white bg-white/5 self-start mt-0"
                    data-testid="button-add-member"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={handleMembersSubmit}
                  disabled={createMemberMutation.isPending || memberEntries.length === 0}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0"
                  data-testid="button-save-members"
                >
                  {createMemberMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {memberEntries.length <= 1 ? "Continue" : `Add ${memberEntries.length} members & continue`}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep("owner-success")}
                  className="text-white/50 text-sm hover:text-white/70 transition-colors py-1"
                  data-testid="button-skip-members"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </Card>
        )}

        {step === "owner-success" && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-10">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-2">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                You're all set, {user?.firstName || "there"}!
              </h2>
              <p className="text-white/70">
                {memberEntries.length > 1
                  ? `Your family calendar is ready with ${memberEntries.length} members. Now let's add caregivers who need access.`
                  : "Your family calendar is ready. Let's add the people who need access."}
              </p>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={goToInvite}
                  className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0"
                  data-testid="button-invite-caregiver"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Invite your first caregiver
                </Button>
                <Button
                  onClick={goToCalendar}
                  variant="outline"
                  className="w-full border-white/40 text-white bg-white/5"
                  data-testid="button-skip-to-calendar"
                >
                  I'll do this later
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "aide-code" && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-10">
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 mb-4">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Enter your invite code
                </h2>
                <p className="text-white/60 text-sm">
                  Your family sent you a code to join their calendar
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80 text-sm">Invite code</Label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ABC123"
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/40 text-center text-xl tracking-[0.3em] font-mono uppercase"
                  data-testid="input-invite-code"
                  autoFocus
                  maxLength={12}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinSubmit()}
                />
              </div>

              {joinFamilyMutation.isError && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>That code isn't valid. Check with your family and try again.</span>
                </div>
              )}

              <Button
                onClick={handleJoinSubmit}
                disabled={joinFamilyMutation.isPending || !inviteCode.trim()}
                className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white border-0"
                data-testid="button-join-family"
              >
                {joinFamilyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Join family
              </Button>

              <button
                type="button"
                onClick={() => {
                  toast({
                    title: "No code yet?",
                    description: "Ask the family member to send you an invite from their Family Settings page.",
                  });
                  goToCalendar();
                }}
                className="w-full text-white/50 text-sm hover:text-white/70 transition-colors py-2"
                data-testid="button-no-code"
              >
                I don't have a code yet
              </button>
            </div>
          </Card>
        )}

        {step === "aide-success" && joinedFamily && (
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-10">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-2">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Welcome to {joinedFamily.name}!
              </h2>
              <p className="text-white/70">
                You're now receiving updates about family schedules and medications.
              </p>

              <Button
                onClick={goToCalendar}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0"
                data-testid="button-see-calendar"
              >
                <Calendar className="w-4 h-4 mr-2" />
                See calendar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-8 py-8">
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-teal-500/30 border border-white/20 backdrop-blur-xl mb-2">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1
          className="text-3xl md:text-4xl font-bold text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          data-testid="text-welcome-title"
        >
          Welcome to Kindora
        </h1>
        <p className="text-white/70 text-lg max-w-sm mx-auto leading-relaxed">
          Family scheduling that works for everyone — parents, caregivers, and the people they love.
        </p>
        <p className="text-white/40 text-sm">Takes about 2 minutes</p>
      </div>

      <Button
        onClick={onNext}
        className="bg-gradient-to-r from-purple-500 to-teal-500 text-white border-0 px-8"
        size="lg"
        data-testid="button-get-started"
      >
        Let's get started
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function RoleStep({
  onOwner,
  onAide,
}: {
  onOwner: () => void;
  onAide: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2
          className="text-2xl md:text-3xl font-bold text-white mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          data-testid="text-role-title"
        >
          What brings you here?
        </h2>
        <p className="text-white/60 text-sm">
          Managing schedules for kids AND parents is a lot. We're here to help.
        </p>
      </div>

      <div className="grid gap-4">
        <Card
          className="backdrop-blur-xl bg-white/10 border-white/20 p-6 cursor-pointer transition-all hover:bg-white/15 hover:border-white/30 group"
          onClick={onOwner}
          data-testid="card-role-owner"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-1">
                I'm managing family schedules
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Parents, guardians, or adult children coordinating family activities
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white/60 mt-1 flex-shrink-0 transition-colors" />
          </div>
        </Card>

        <Card
          className="backdrop-blur-xl bg-white/10 border-white/20 p-6 cursor-pointer transition-all hover:bg-white/15 hover:border-white/30 group"
          onClick={onAide}
          data-testid="card-role-aide"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-1">
                I'm helping care for a family member
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Health aides, caregivers, or family members joining an existing household
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-white/30 group-hover:text-white/60 mt-1 flex-shrink-0 transition-colors" />
          </div>
        </Card>
      </div>
    </div>
  );
}
