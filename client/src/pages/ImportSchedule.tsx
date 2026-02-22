import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Calendar, 
  Upload, 
  Loader2, 
  FileText, 
  Image, 
  Type, 
  Sparkles,
  Check,
  X,
  Clock,
  AlertCircle
} from "lucide-react";
import { format, parseISO, eachDayOfInterval, isWeekend } from "date-fns";
import type { FamilyMember, EventCategory } from "@shared/schema";
import { EVENT_CATEGORIES, CATEGORY_CONFIG } from "@shared/schema";

interface ParsedScheduleEvent {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  recurring?: boolean;
  cost?: number;
}

interface ParseResult {
  success: boolean;
  events: ParsedScheduleEvent[];
  error?: string;
}


export default function ImportSchedule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const icalInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("ical");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('other');
  const selectedColor = CATEGORY_CONFIG[selectedCategory].color;
  const [parsedEvents, setParsedEvents] = useState<ParsedScheduleEvent[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const parseTextMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/schedule/parse-text", { text });
      return res.json() as Promise<ParseResult>;
    },
    onSuccess: (data) => {
      if (data.success && data.events.length > 0) {
        setParsedEvents(data.events);
        setParseError(null);
        toast({
          title: "Schedule Parsed",
          description: `Found ${data.events.length} event(s) in the text`,
        });
      } else {
        setParseError(data.error || "No events found in the text");
        setParsedEvents([]);
      }
    },
    onError: (error: Error) => {
      setParseError(error.message);
      setParsedEvents([]);
    },
  });

  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64Data = await fileToBase64(file);
      const mimeType = file.type;
      
      if (mimeType === "application/pdf") {
        const res = await apiRequest("POST", "/api/schedule/parse-pdf", { base64Data });
        return res.json() as Promise<ParseResult>;
      } else {
        const res = await apiRequest("POST", "/api/schedule/parse-image", { base64Data, mimeType });
        return res.json() as Promise<ParseResult>;
      }
    },
    onSuccess: (data) => {
      if (data.success && data.events.length > 0) {
        setParsedEvents(data.events);
        setParseError(null);
        toast({
          title: "Schedule Parsed",
          description: `Found ${data.events.length} event(s) in the file`,
        });
      } else {
        setParseError(data.error || "No events found in the file");
        setParsedEvents([]);
      }
    },
    onError: (error: Error) => {
      setParseError(error.message);
      setParsedEvents([]);
    },
  });

  const parseICalMutation = useMutation({
    mutationFn: async (file: File) => {
      const icsContent = await file.text();
      const res = await apiRequest("POST", "/api/schedule/parse-ical", { icsContent });
      return res.json() as Promise<ParseResult>;
    },
    onSuccess: (data) => {
      if (data.success && data.events.length > 0) {
        setParsedEvents(data.events);
        setParseError(null);
        toast({
          title: "Calendar Imported",
          description: `Found ${data.events.length} event(s) in the calendar file`,
        });
      } else {
        setParseError(data.error || "No events found in the calendar file");
        setParsedEvents([]);
      }
    },
    onError: (error: Error) => {
      setParseError(error.message);
      setParsedEvents([]);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const events = parsedEvents.map(event => {
        const startDate = parseISO(event.startDate);
        const endDate = parseISO(event.endDate);
        
        // If dates span multiple days and not all-day, create individual events
        const days = eachDayOfInterval({ start: startDate, end: endDate })
          .filter(day => !isWeekend(day) || event.isAllDay);
        
        return days.map(day => {
          const startTime = new Date(day);
          const endTime = new Date(day);
          
          if (event.startTime) {
            const [hours, minutes] = event.startTime.split(":").map(Number);
            startTime.setHours(hours, minutes, 0, 0);
          } else {
            startTime.setHours(9, 0, 0, 0);
          }
          
          if (event.endTime) {
            const [hours, minutes] = event.endTime.split(":").map(Number);
            endTime.setHours(hours, minutes, 0, 0);
          } else {
            endTime.setHours(17, 0, 0, 0);
          }
          
          return {
            title: event.title,
            description: event.description || (event.cost ? `Cost: $${event.cost}` : undefined),
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            memberIds: selectedMemberId && selectedMemberId !== "none" ? [selectedMemberId] : [],
            category: selectedCategory,
            color: selectedColor,
          };
        });
      }).flat();

      const res = await apiRequest("POST", "/api/events/bulk-import", {
        events,
        source: "ai-import"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (data.imported === 0) {
        toast({
          title: "No Events Imported",
          description: "The events could not be imported. Please check the schedule format and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Schedule Imported!",
          description: `Successfully added ${data.imported} event(s) to your calendar`,
        });
        setLocation("/");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import schedule",
        variant: "destructive",
      });
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParsedEvents([]);
      setParseError(null);
    }
  }, []);

  const handleParse = async () => {
    setIsParsing(true);
    setParseError(null);
    
    try {
      if (activeTab === "text" && textInput.trim()) {
        await parseTextMutation.mutateAsync(textInput);
      } else if ((activeTab === "file" || activeTab === "image") && selectedFile) {
        await parseFileMutation.mutateAsync(selectedFile);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const removeEvent = (index: number) => {
    setParsedEvents(prev => prev.filter((_, i) => i !== index));
  };

  const totalEvents = parsedEvents.length;
  const totalCost = parsedEvents.reduce((sum, e) => sum + (e.cost || 0), 0);

  return (
    <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                AI Schedule Parser
              </CardTitle>
              <CardDescription>
                Paste text, upload an image, or upload a PDF containing your schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="ical" data-testid="tab-ical">
                    <Calendar className="w-4 h-4 mr-2" />
                    iCal
                  </TabsTrigger>
                  <TabsTrigger value="text" data-testid="tab-text">
                    <Type className="w-4 h-4 mr-2" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="image" data-testid="tab-image">
                    <Image className="w-4 h-4 mr-2" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="file" data-testid="tab-pdf">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ical" className="mt-4">
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => icalInputRef.current?.click()}
                      data-testid="dropzone-ical"
                    >
                      <input
                        ref={icalInputRef}
                        type="file"
                        accept=".ics,.ical,text/calendar"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setParsedEvents([]);
                            setParseError(null);
                            setIsParsing(true);
                            parseICalMutation.mutate(file, {
                              onSettled: () => setIsParsing(false)
                            });
                          }
                        }}
                        className="hidden"
                      />
                      {selectedFile && (selectedFile.name.endsWith('.ics') || selectedFile.name.endsWith('.ical')) ? (
                        <div className="space-y-2">
                          <Calendar className="w-12 h-12 mx-auto text-emerald-400" />
                          <p className="text-foreground font-medium">{selectedFile.name}</p>
                          <p className="text-muted-foreground text-sm">Click to change file</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Calendar className="w-12 h-12 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">Click to upload a calendar file</p>
                          <p className="text-muted-foreground text-sm">.ics or .ical from Google Calendar or Apple Calendar</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-2">How to export:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li><strong>Google Calendar:</strong> Settings → Import & Export → Export</li>
                        <li><strong>Apple Calendar:</strong> File → Export → Export...</li>
                        <li><strong>Outlook:</strong> File → Save Calendar → Save as .ics</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="text" className="mt-4">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your schedule here...&#10;&#10;Example:&#10;Week 1: June 22-26, 5 full days, $380&#10;Week 2: June 29-July 3, 3 half days (holiday week), $240&#10;..."
                    className="min-h-[200px]"
                    data-testid="input-text"
                  />
                </TabsContent>

                <TabsContent value="image" className="mt-4">
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-image"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile && selectedFile.type.startsWith("image/") ? (
                      <div className="space-y-2">
                        <Image className="w-12 h-12 mx-auto text-emerald-400" />
                        <p className="text-foreground font-medium">{selectedFile.name}</p>
                        <p className="text-muted-foreground text-sm">Click to change file</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="w-12 h-12 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">Click to upload an image</p>
                        <p className="text-muted-foreground text-sm">PNG, JPG, or WEBP</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="file" className="mt-4">
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-pdf"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile && selectedFile.type === "application/pdf" ? (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 mx-auto text-emerald-400" />
                        <p className="text-foreground font-medium">{selectedFile.name}</p>
                        <p className="text-muted-foreground text-sm">Click to change file</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">Click to upload a PDF</p>
                        <p className="text-muted-foreground text-sm">PDF files only</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button
                  onClick={handleParse}
                  disabled={isParsing || (activeTab === "text" ? !textInput.trim() : !selectedFile)}
                  className="bg-primary text-primary-foreground font-medium"
                  data-testid="button-parse"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Parse Schedule
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {parseError && (
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 text-red-300">
                  <AlertCircle className="w-5 h-5" />
                  <p>{parseError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {parsedEvents.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Event Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assign to Family Member</Label>
                      <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger data-testid="select-member">
                          <SelectValue placeholder="No specific member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific member</SelectItem>
                          {familyMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <div className="flex gap-2 flex-wrap">
                        {EVENT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all toggle-elevate ${
                              selectedCategory === cat
                                ? "border-border text-foreground bg-muted toggle-elevated"
                                : "border-border text-muted-foreground"
                            }`}
                            data-testid={`category-${cat}`}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_CONFIG[cat].color }}
                            />
                            {CATEGORY_CONFIG[cat].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    Parsed Events ({totalEvents})
                  </CardTitle>
                  <CardDescription>
                    Review the events below before importing
                    {totalCost > 0 && ` (Total cost: $${totalCost})`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedEvents.map((event, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2 h-10 rounded-full"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <div>
                            <div className="text-foreground font-medium">{event.title}</div>
                            <div className="text-muted-foreground text-sm flex items-center gap-2">
                              <span>
                                {format(parseISO(event.startDate), "MMM d")}
                                {event.endDate !== event.startDate && ` - ${format(parseISO(event.endDate), "MMM d")}`}
                              </span>
                              {event.startTime && event.endTime && (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>{event.startTime} - {event.endTime}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.cost && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                              ${event.cost}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEvent(index)}
                            className="text-muted-foreground hover:text-red-400"
                            data-testid={`button-remove-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setParsedEvents([]);
                    setTextInput("");
                    setSelectedFile(null);
                  }}
                  className=""
                  data-testid="button-clear"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending || parsedEvents.length === 0}
                  className="bg-primary text-primary-foreground font-medium"
                  data-testid="button-import"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {totalEvents} Event{totalEvents !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
  );
}
