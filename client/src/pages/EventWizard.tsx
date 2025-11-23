import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, PartyPopper, Users, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertEvent, FamilyMember } from "@shared/schema";
import { insertEventSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

export default function EventWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch family members
  const { data: members = [], isLoading, isError, error, refetch } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  // Form for creating event with validation (schema already extended in shared/schema.ts)
  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      memberId: "",
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      color: "",
    },
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (event: InsertEvent) => {
      const res = await apiRequest('POST', '/api/events', event);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });

  const handleCreateEvent = async (data: InsertEvent) => {
    const member = members.find(m => m.id === data.memberId);
    if (!member) {
      toast({
        title: "Error",
        description: "Selected member not found",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEventMutation.mutateAsync({
        title: data.title,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        memberId: member.id,
        color: member.color,
      });

      toast({
        title: "Event created!",
        description: "Your first event has been added to the calendar",
      });

      // Redirect to calendar
      setLocation('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = () => {
    setLocation('/');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-white mx-auto animate-spin" data-testid="loading-spinner" />
            <p className="text-white/70">Loading family members...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Failed to Load Members</h2>
            <p className="text-white/70">
              We couldn't load your family members. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => refetch()}
                className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                data-testid="button-retry"
              >
                Try Again
              </Button>
              <Button
                onClick={() => setLocation('/onboarding')}
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 bg-white/5"
                data-testid="button-back-to-onboarding"
              >
                Back to Onboarding
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // No members state
  if (members.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">No Family Members Yet</h2>
            <p className="text-white/70">
              You need to add at least one family member before creating events.
            </p>
            <Alert className="bg-yellow-500/10 border-yellow-500/30 text-left">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                Events are assigned to family members so everyone knows who's doing what!
              </AlertDescription>
            </Alert>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => setLocation('/onboarding')}
                className="bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                data-testid="button-add-members"
              >
                <Users className="w-4 h-4 mr-2" />
                Add Family Members
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
                className="border-white/50 text-white hover:bg-white/10 bg-white/5"
                data-testid="button-skip-to-calendar"
              >
                Skip to Calendar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4A5A6A] via-[#5A6A7A] to-[#6A7A8A] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full backdrop-blur-xl bg-white/10 border-white/20 p-8 md:p-12">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-teal-500 mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Create Your First Event
            </h1>
            <p className="text-white/70">
              Let's add something to your calendar!
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateEvent)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Event Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Family Dinner, Soccer Practice..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        data-testid="input-event-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any details..."
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                        rows={3}
                        data-testid="input-event-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Assign To</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger 
                          className="bg-white/10 border-white/20 text-white"
                          data-testid="select-member"
                        >
                          <SelectValue placeholder="Select a family member" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/20">
                          {members.map((member) => (
                            <SelectItem 
                              key={member.id} 
                              value={member.id}
                              className="text-white hover:bg-white/10"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: member.color }}
                                />
                                {member.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="bg-white/10 border-white/20 text-white"
                          data-testid="input-event-start-time"
                          value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          className="bg-white/10 border-white/20 text-white"
                          data-testid="input-event-end-time"
                          value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:from-purple-600 hover:to-teal-600 border-0"
                  disabled={createEventMutation.isPending}
                  data-testid="button-create-event"
                >
                  {createEventMutation.isPending ? (
                    "Creating..."
                  ) : (
                    <>
                      <PartyPopper className="w-4 h-4 mr-2" />
                      Create Event & Finish
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleSkip}
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white/10 bg-white/5"
                  data-testid="button-skip-event"
                >
                  Skip to Calendar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
