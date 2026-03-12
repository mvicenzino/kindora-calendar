import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Baby, Heart, User, Save, CheckCircle } from "lucide-react";

interface AdvisorProfile {
  familyId?: string;
  advisorChildrenContext: string;
  advisorElderContext: string;
  advisorSelfContext: string;
}

const PLACEHOLDERS = {
  children: `Example: I have a 3-year-old daughter named Emma who's been refusing most foods lately — she'll only eat plain pasta and crackers. We're also potty training and she's doing okay but still has accidents at daycare. My 6-year-old son Jake is generally easy-going but has been anxious about starting first grade.`,
  elder: `Example: My 78-year-old mother Margaret lives with us and was diagnosed with mild cognitive impairment last year. She forgets conversations we had earlier the same day and gets confused in the evenings (sundowning). My father passed, so I'm her only caregiver nearby — my brother lives in another state.`,
  self: `Example: I'm a 42-year-old working mom, back in the office three days a week. I feel stretched thin between the kids, my mom, and my job. My biggest struggle is guilt — I never feel like I'm doing enough for anyone. I've been having trouble sleeping and I know I need to take better care of myself but I don't know where to start.`,
};

export default function KiraProfile() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<AdvisorProfile>({
    advisorChildrenContext: "",
    advisorElderContext: "",
    advisorSelfContext: "",
  });

  const { data: profile, isLoading } = useQuery<AdvisorProfile>({
    queryKey: ["/api/advisor/profile"],
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", "/api/advisor/profile", {
        advisorChildrenContext: form.advisorChildrenContext,
        advisorElderContext: form.advisorElderContext,
        advisorSelfContext: form.advisorSelfContext,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advisor/profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Kira's profile updated", description: "She'll remember this in all future conversations." });
    },
    onError: () => {
      toast({ title: "Couldn't save profile", description: "Please try again.", variant: "destructive" });
    },
  });

  const hasContent =
    form.advisorChildrenContext.trim() ||
    form.advisorElderContext.trim() ||
    form.advisorSelfContext.trim();

  const sections = [
    {
      key: "advisorChildrenContext" as const,
      icon: Baby,
      color: "text-orange-500",
      bg: "bg-orange-500/10 border-orange-500/20",
      title: "About your children",
      description: "Names, ages, personalities, and any challenges you're navigating with them right now.",
      placeholder: PLACEHOLDERS.children,
    },
    {
      key: "advisorElderContext" as const,
      icon: Heart,
      color: "text-pink-500",
      bg: "bg-pink-500/10 border-pink-500/20",
      title: "About your aging parents or loved ones",
      description: "Names, ages, any health conditions, living situation, and your role in their care.",
      placeholder: PLACEHOLDERS.elder,
    },
    {
      key: "advisorSelfContext" as const,
      icon: User,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
      title: "About you",
      description: "Your situation, your biggest stressors, what kind of support helps you most. The more Kira knows, the more helpful she can be.",
      placeholder: PLACEHOLDERS.self,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">Kira's Family Profile</CardTitle>
              <CardDescription className="text-xs mt-1 leading-relaxed">
                Help Kira get to know your family so she can give you more personal, relevant advice — and never make you repeat yourself. This context is included in every conversation.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading your profile…
            </div>
          ) : (
            <>
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${section.bg}`}>
                        <Icon className={`w-3 h-3 ${section.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{section.title}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug">{section.description}</p>
                      </div>
                    </div>
                    <Textarea
                      value={form[section.key]}
                      onChange={(e) => setForm((f) => ({ ...f, [section.key]: e.target.value }))}
                      placeholder={section.placeholder}
                      className="text-xs min-h-[90px] resize-y leading-relaxed placeholder:text-muted-foreground/40"
                      maxLength={2000}
                      data-testid={`input-${section.key}`}
                    />
                    {form[section.key] && (
                      <p className="text-[10px] text-muted-foreground/50 text-right">
                        {form[section.key].length}/2000
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground/60 max-w-xs leading-snug">
                  {hasContent
                    ? "Kira will use this context in every conversation — no need to repeat yourself."
                    : "Fill in any sections you're comfortable with. All fields are optional."}
                </p>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-1.5 text-xs"
                  data-testid="button-save-kira-profile"
                >
                  {saveMutation.isPending ? (
                    <div className="w-3 h-3 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  ) : saved ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {saved ? "Saved" : "Save profile"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-muted-foreground">i</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This information is stored securely and shared only with Kira to improve her advice. It is not shared with other family members or used for any other purpose. You can update or clear it at any time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
