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
import { useLocation, Link } from "wouter";
import { 
  Calendar, 
  Upload, 
  Loader2, 
  ArrowLeft, 
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
import type { FamilyMember } from "@shared/schema";
import Header from "@/components/Header";

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

const EVENT_COLORS = [
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
];

export default function ImportSchedule() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);
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
    <div className="min-h-screen bg-gradient-to-br from-[#3A4550] via-[#4A5560] to-[#5A6570]">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col gap-6">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-import-title">
                Import Schedule
              </h1>
              <p className="text-white/60 text-sm">
                Use AI to extract events from text, images, or PDFs
              </p>
            </div>
          </nav>

          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                AI Schedule Parser
              </CardTitle>
              <CardDescription className="text-white/60">
                Paste text, upload an image, or upload a PDF containing your schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/10 border border-white/20">
                  <TabsTrigger value="text" className="data-[state=active]:bg-white/20" data-testid="tab-text">
                    <Type className="w-4 h-4 mr-2" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="image" className="data-[state=active]:bg-white/20" data-testid="tab-image">
                    <Image className="w-4 h-4 mr-2" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="file" className="data-[state=active]:bg-white/20" data-testid="tab-pdf">
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-4">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your schedule here...&#10;&#10;Example:&#10;Week 1: June 22-26, 5 full days, $380&#10;Week 2: June 29-July 3, 3 half days (holiday week), $240&#10;..."
                    className="min-h-[200px] bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    data-testid="input-text"
                  />
                </TabsContent>

                <TabsContent value="image" className="mt-4">
                  <div 
                    className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center cursor-pointer hover:border-white/50 transition-colors"
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
                        <p className="text-white font-medium">{selectedFile.name}</p>
                        <p className="text-white/60 text-sm">Click to change file</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Image className="w-12 h-12 mx-auto text-white/40" />
                        <p className="text-white/70">Click to upload an image</p>
                        <p className="text-white/50 text-sm">PNG, JPG, or WEBP</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="file" className="mt-4">
                  <div 
                    className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center cursor-pointer hover:border-white/50 transition-colors"
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
                        <p className="text-white font-medium">{selectedFile.name}</p>
                        <p className="text-white/60 text-sm">Click to change file</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 mx-auto text-white/40" />
                        <p className="text-white/70">Click to upload a PDF</p>
                        <p className="text-white/50 text-sm">PDF files only</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button
                  onClick={handleParse}
                  disabled={isParsing || (activeTab === "text" ? !textInput.trim() : !selectedFile)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
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
              <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Event Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80">Assign to Family Member</Label>
                      <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-member">
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
                      <Label className="text-white/80">Event Color</Label>
                      <div className="flex gap-2">
                        {EVENT_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              selectedColor === color ? "border-white scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            data-testid={`color-${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    Parsed Events ({totalEvents})
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Review the events below before importing
                    {totalCost > 0 && ` (Total cost: $${totalCost})`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedEvents.map((event, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-2 h-10 rounded-full"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <div>
                            <div className="text-white font-medium">{event.title}</div>
                            <div className="text-white/60 text-sm flex items-center gap-2">
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
                            className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
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
                  className="border-white/20 text-white hover:bg-white/10"
                  data-testid="button-clear"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending || parsedEvents.length === 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
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
      </main>
    </div>
  );
}
