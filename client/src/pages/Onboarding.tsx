import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Sparkles, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertFamilyMember, FamilyMember } from "@shared/schema";
import { insertFamilyMemberSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const PRESET_COLORS = [
  { name: "Purple", value: "#9333EA" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Green", value: "#22C55E" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink", value: "#EC4899" },
  { name: "Red", value: "#EF4444" },
  { name: "Yellow", value: "#EAB308" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [familyModalOpen, setFamilyModalOpen] = useState(true); // Auto-open modal
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);

  // Fetch family members from server
  const { data: members = [], isLoading: membersLoading, isError: membersError, refetch: refetchMembers } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  // Form for adding family member with validation (schema already extended in shared/schema.ts)
  const form = useForm<InsertFamilyMember>({
    resolver: zodResolver(insertFamilyMemberSchema),
    defaultValues: {
      name: "",
      color: PRESET_COLORS[0].value,
    },
  });

  // Create family member mutation
  const createMemberMutation = useMutation({
    mutationFn: async (member: InsertFamilyMember) => {
      const res = await apiRequest('POST', '/api/family-members', member);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-members'] });
    },
  });

  const handleAddMember = async (data: InsertFamilyMember) => {
    try {
      // Store name for toast before form reset
      const memberName = data.name;

      // Wait for API to confirm success before proceeding
      await createMemberMutation.mutateAsync(data);

      // Reset form and close modal
      form.reset();
      setFamilyModalOpen(false);

      toast({
        title: "Family member added!",
        description: `${memberName} has been added to your calendar`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add family member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    // Verify members exist in database
    if (members.length === 0) {
      toast({
        title: "Add at least one member",
        description: "Add a family member to continue with onboarding",
        variant: "destructive",
      });
      return;
    }
    setLocation('/onboarding/wizard');
  };

  const handleSkip = () => {
    setSkipConfirmOpen(true);
  };

  const confirmSkip = () => {
    setSkipConfirmOpen(false);
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-12">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Add Your Family Members
            </h2>
            <p className="text-white/70">
              Each person gets a unique color for easy identification
            </p>
          </div>

          {membersLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-white mx-auto animate-spin" />
              <p className="text-white/70 mt-2">Loading members...</p>
            </div>
          ) : membersError ? (
            <Alert className="mb-6 bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 space-y-2">
                <p>Failed to load family members.</p>
                <Button
                  onClick={() => refetchMembers()}
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-300 hover:bg-red-500/10"
                  data-testid="button-retry-members"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          ) : members.length > 0 ? (
            <div className="space-y-3 mb-6">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/20"
                  data-testid={`member-${member.id}`}
                >
                  <div
                    className="w-10 h-10 rounded-full border-2"
                    style={{ backgroundColor: member.color, borderColor: member.color }}
                  />
                  <span className="text-white font-medium">{member.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                Add at least one family member to get started with your calendar
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setFamilyModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30"
              data-testid="button-add-member"
            >
              <Users className="w-4 h-4 mr-2" />
              Add Another Member
            </Button>
            
            <div className="flex gap-3">
              <Button
                onClick={handleContinue}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                disabled={members.length === 0 || membersLoading}
                data-testid="button-continue"
              >
                Continue
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 bg-white/5"
                data-testid="button-skip-family"
              >
                Skip
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Add Family Member Modal */}
      <Dialog open={familyModalOpen} onOpenChange={setFamilyModalOpen}>
        <DialogContent className="backdrop-blur-xl bg-slate-900/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Family Member</DialogTitle>
            <DialogDescription className="text-white/70">
              Give them a name and pick a color for their events
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddMember)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Mom, Dad, Sarah..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        data-testid="input-member-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Color</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => field.onChange(color.value)}
                            className={`w-full aspect-square rounded-lg border-2 transition-all ${
                              field.value === color.value
                                ? 'border-white scale-110 shadow-lg'
                                : 'border-white/30 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.value }}
                            aria-label={`Select ${color.name}`}
                            data-testid={`color-${color.name.toLowerCase()}`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                  disabled={createMemberMutation.isPending}
                  data-testid="button-save-member"
                >
                  {createMemberMutation.isPending ? "Adding..." : "Add Member"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setFamilyModalOpen(false);
                    form.reset();
                  }}
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white/10"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Skip Confirmation Dialog */}
      <Dialog open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen}>
        <DialogContent className="backdrop-blur-xl bg-slate-900/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Skip Onboarding?</DialogTitle>
            <DialogDescription className="text-white/70">
              Are you sure you want to skip the setup process?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-white/80 text-sm">
              By completing the onboarding, you'll get:
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
                <span>Quick setup of family members with personalized colors</span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar className="w-4 h-4 mt-0.5 text-teal-400 flex-shrink-0" />
                <span>Guided creation of your first event</span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="w-4 h-4 mt-0.5 text-pink-400 flex-shrink-0" />
                <span>A better understanding of how Calendora works</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setSkipConfirmOpen(false)}
              className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
              data-testid="button-continue-onboarding"
            >
              Continue Setup
            </Button>
            <Button
              onClick={confirmSkip}
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10"
              data-testid="button-confirm-skip"
            >
              Skip Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
