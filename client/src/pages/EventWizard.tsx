import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, PartyPopper, Users, AlertCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InsertEvent, FamilyMember, EventCategory } from "@shared/schema";
import { insertEventSchema, EVENT_CATEGORIES, CATEGORY_CONFIG } from "@shared/schema";
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

  const { data: members = [], isLoading, isError, error, refetch } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members'],
  });

  const getDefaultTimes = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes, 0, 0);
    const endDate = new Date(now.getTime() + 60 * 60 * 1000);
    return { start: now, end: endDate };
  };

  const defaultTimes = getDefaultTimes();

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      title: "",
      description: "",
      memberIds: [],
      startTime: defaultTimes.start,
      endTime: defaultTimes.end,
      category: "other",
      color: CATEGORY_CONFIG.other.color,
    },
  });

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
    const memberIds = data.memberIds || [];
    if (memberIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select a family member",
        variant: "destructive",
      });
      return;
    }

    const member = members.find(m => m.id === memberIds[0]);
    if (!member) {
      toast({
        title: "Error",
        description: "Selected member not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const category = (data.category || 'other') as EventCategory;
      await createEventMutation.mutateAsync({
        title: data.title,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        memberIds: memberIds,
        category,
        color: CATEGORY_CONFIG[category].color,
      });

      toast({
        title: "Event created!",
        description: "Your first event has been added to the calendar",
      });

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-foreground mx-auto animate-spin" data-testid="loading-spinner" />
            <p className="text-muted-foreground">Loading family members...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Failed to Load Members</h2>
            <p className="text-muted-foreground">
              We couldn't load your family members. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={() => refetch()}
                data-testid="button-retry"
              >
                Try Again
              </Button>
              <Button
                onClick={() => setLocation('/onboarding')}
                variant="outline"
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

  if (members.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 md:p-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">No Family Members Yet</h2>
            <p className="text-muted-foreground">
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
                data-testid="button-add-members"
              >
                <Users className="w-4 h-4 mr-2" />
                Add Family Members
              </Button>
              <Button
                onClick={handleSkip}
                variant="outline"
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 md:p-12">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Create Your First Event
            </h1>
            <p className="text-muted-foreground">
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
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Family Dinner, Soccer Practice..."
                        data-testid="input-event-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any details..."
                        className="resize-none"
                        rows={3}
                        data-testid="input-event-description"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value?.[0] || ""} 
                        onValueChange={(value) => field.onChange([value])}
                      >
                        <SelectTrigger 
                          data-testid="select-member"
                        >
                          <SelectValue placeholder="Select a family member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem 
                              key={member.id} 
                              value={member.id}
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Category</FormLabel>
                <Select
                  value={form.watch('category') || 'other'}
                  onValueChange={(value) => {
                    form.setValue('category', value);
                    form.setValue('color', CATEGORY_CONFIG[value as EventCategory].color);
                  }}
                >
                  <SelectTrigger
                    data-testid="select-category"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_CONFIG[cat].color }}
                          />
                          {CATEGORY_CONFIG[cat].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          data-testid="input-event-start-time"
                          value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          data-testid="input-event-end-time"
                          value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
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
