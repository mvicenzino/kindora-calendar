import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Mail, Send, Trash2, LogOut, Crown, UserCheck, Heart, Check, Clock, Calendar, Shield, Link, Eye, AlertTriangle, X, Pill, Plus, Pencil, ChevronDown, ChevronUp, Upload, FileText, Sparkles, CheckCircle2, Loader2, CircleCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

interface EmergencyBridgeToken {
  id: string;
  familyId: string;
  tokenHash: string;
  createdByUserId: string;
  label: string | null;
  expiresAt: string;
  status: string;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  rawToken?: string;
}


function ImportMedicationsDialog({ familyId, members, onImported }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('source');
  const [source, setSource] = useState('text');
  const [inputText, setInputText] = useState('');
  const [selectedVaultDoc, setSelectedVaultDoc] = useState(null);
  const [parsedMeds, setParsedMeds] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState({});
  const [assignMemberId, setAssignMemberId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: vaultDocs = [] } = useQuery({
    queryKey: ['/api/care-documents?familyId=' + familyId],
    enabled: !!familyId && open,
  });

  const medicalDocs = vaultDocs.filter(d => d.documentType === 'medical' || d.documentType === 'care_plan');
  const otherDocs = vaultDocs.filter(d => d.documentType !== 'medical' && d.documentType !== 'care_plan');
  const suggestedDoc = medicalDocs.length > 0 ? medicalDocs[0] : null;

  const resetDialog = () => { setStep('source'); setSource('text'); setInputText(''); setSelectedVaultDoc(null); setParsedMeds([]); setSelectedMeds({}); setAssignMemberId(''); setIsLoading(false); };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result.split(',')[1];
      await parseMedications({ imageBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleVaultDocSelect = async (doc) => {
    setSelectedVaultDoc(doc);
    setIsLoading(true);
    await parseMedications({ documentId: doc.id });
  };

  const parseMedications = async (payload) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/medications/import-ai', { ...payload, familyId });
      const data = await res.json();
      if (data.medications && data.medications.length > 0) {
        setParsedMeds(data.medications);
        const allSelected = {};
        data.medications.forEach((m, i) => { allSelected[i] = true; });
        setSelectedMeds(allSelected);
        setStep('preview');
      } else {
        toast({ title: "No medications found", description: "Try pasting the list as text for better results.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Parse failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const saveMedsMutation = useMutation({
    mutationFn: async () => {
      const toSave = parsedMeds.filter((_, i) => selectedMeds[i]);
      for (const med of toSave) {
        await apiRequest('POST', '/api/medications', { memberId: assignMemberId, name: med.name, dosage: med.dosage, frequency: med.frequency, scheduledTimes: (med.scheduledTimes && med.scheduledTimes.length > 0) ? med.scheduledTimes : [], instructions: med.instructions || null, familyId });
      }
      return toSave.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['/api/medications?familyId=' + familyId] });
      toast({ title: count + " medication" + (count !== 1 ? "s" : "") + " imported", description: "They now appear in the Care dashboard." });
      setOpen(false);
      resetDialog();
      if (onImported) onImported();
    },
    onError: (error) => { toast({ title: "Import failed", description: error.message || "Please try again.", variant: "destructive" }); },
  });

  const selectedCount = Object.values(selectedMeds).filter(Boolean).length;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { resetDialog(); setOpen(true); }} className="gap-1.5" data-testid="button-import-medications">
        <Upload className="w-4 h-4" />Import
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetDialog(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Import Medication List</DialogTitle>
            <DialogDescription>
              {step === 'source' && "Paste text, upload a file, or use a document from your vault."}
              {step === 'preview' && "Review the medications found. Uncheck any you don't want to import."}
              {step === 'assign' && "Choose which family member these medications belong to."}
            </DialogDescription>
          </DialogHeader>

          {step === 'source' && (
            <div className="space-y-4 py-2">
              {suggestedDoc && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5"><Sparkles className="w-3 h-3" />Found in your Document Vault</p>
                  <button onClick={() => { setSource('vault'); handleVaultDocSelect(suggestedDoc); }} className="w-full flex items-center gap-3 text-left hover:bg-primary/10 rounded-md p-2 transition-colors">
                    <FileText className="w-8 h-8 text-primary/60 flex-shrink-0" />
                    <div><p className="text-sm font-medium text-foreground">{suggestedDoc.title}</p><p className="text-xs text-muted-foreground">{suggestedDoc.fileName} — Click to extract medications</p></div>
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                {['text', 'file', 'vault'].map((s) => (
                  <button key={s} onClick={() => setSource(s)} className={"flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all " + (source === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30")}>
                    {s === 'text' ? 'Paste Text' : s === 'file' ? 'Upload File' : 'From Vault'}
                  </button>
                ))}
              </div>
              {source === 'text' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Paste medication list</Label>
                  <Textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="e.g. Metformin 500mg - twice daily with meals&#10;Lisinopril 10mg - once daily in the morning&#10;Atorvastatin 20mg - once at bedtime" className="text-sm resize-none h-36" />
                </div>
              )}
              {source === 'file' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Upload medication list (PDF or image)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/30 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-xs text-muted-foreground mb-3">PNG, JPG, PDF supported</p>
                    <label className="cursor-pointer"><span className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium">Choose File</span><input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" /></label>
                  </div>
                  {isLoading && <p className="text-xs text-center text-muted-foreground animate-pulse">Extracting medications...</p>}
                </div>
              )}
              {source === 'vault' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Choose from Document Vault</Label>
                  {vaultDocs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No documents in vault yet. Upload files in the Documents section.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {[...medicalDocs, ...otherDocs].map((doc) => (
                        <button key={doc.id} onClick={() => handleVaultDocSelect(doc)} className={"w-full flex items-center gap-3 text-left p-2.5 rounded-lg border transition-all " + (selectedVaultDoc && selectedVaultDoc.id === doc.id ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/20")}>
                          <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0"><p className="text-xs font-medium text-foreground truncate">{doc.title}</p><p className="text-xs text-muted-foreground truncate">{doc.fileName}</p></div>
                          {(doc.documentType === 'medical' || doc.documentType === 'care_plan') && (<Badge variant="outline" className="text-xs flex-shrink-0">Medical</Badge>)}
                        </button>
                      ))}
                    </div>
                  )}
                  {isLoading && <p className="text-xs text-center text-muted-foreground animate-pulse">Extracting medications from document...</p>}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">{parsedMeds.length} medication{parsedMeds.length !== 1 ? 's' : ''} found. Uncheck any you don't want to import.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {parsedMeds.map((med, i) => (
                  <div key={i} className={"flex items-start gap-3 p-3 rounded-lg border transition-all " + (selectedMeds[i] ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30 opacity-50")}>
                    <input type="checkbox" checked={!!selectedMeds[i]} onChange={(e) => setSelectedMeds(s => ({ ...s, [i]: e.target.checked }))} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-foreground">{med.name}</p><Badge variant="secondary" className="text-xs">{med.dosage}</Badge></div>
                      <p className="text-xs text-muted-foreground mt-0.5">{med.frequency}</p>
                      {med.scheduledTimes && med.scheduledTimes.length > 0 && <p className="text-xs text-primary/70 mt-0.5">{med.scheduledTimes.join(' • ')}</p>}
                      {med.instructions && <p className="text-xs text-muted-foreground mt-0.5 italic">{med.instructions}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'assign' && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">Who takes these {selectedCount} medication{selectedCount !== 1 ? 's' : ''}?</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <button key={m.id} onClick={() => setAssignMemberId(m.id)} className={"w-full flex items-center gap-3 p-3 rounded-lg border transition-all " + (assignMemberId === m.id ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/20")}>
                    <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback className="text-xs text-white font-semibold" style={{ backgroundColor: m.color }}>{m.name.charAt(0)}</AvatarFallback></Avatar>
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                    {assignMemberId === m.id && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === 'source' && (<><Button variant="outline" onClick={() => { setOpen(false); resetDialog(); }}>Cancel</Button><Button onClick={() => source === 'text' ? parseMedications({ text: inputText }) : null} disabled={isLoading || (source === 'text' && !inputText.trim())}>{isLoading ? "Extracting..." : "Extract Medications"}</Button></>)}
            {step === 'preview' && (<><Button variant="outline" onClick={() => setStep('source')}>Back</Button><Button onClick={() => setStep('assign')} disabled={selectedCount === 0}>Assign to Member ({selectedCount})</Button></>)}
            {step === 'assign' && (<><Button variant="outline" onClick={() => setStep('preview')}>Back</Button><Button onClick={() => saveMedsMutation.mutate()} disabled={!assignMemberId || saveMedsMutation.isPending}>{saveMedsMutation.isPending ? "Importing..." : "Import " + selectedCount + " Medication" + (selectedCount !== 1 ? "s" : "")}</Button></>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


function MedicationManager({ familyId, isOwnerOrMember }) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);
  const [medForm, setMedForm] = useState({ memberId: "", name: "", dosage: "", frequency: "", instructions: "", scheduledTimes: "" });

  const { data: rawMembers = [] } = useQuery({ queryKey: ['/api/family-members', familyId], enabled: !!familyId });
  const { data: medications = [] } = useQuery({ queryKey: ['/api/medications?familyId=' + familyId], enabled: !!familyId });
  const { data: todayLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/medication-logs/today', familyId],
    queryFn: () => fetch(`/api/medication-logs/today?familyId=${familyId}`).then(r => r.json()),
    enabled: !!familyId,
    refetchInterval: 60_000,
  });

  const resetForm = () => setMedForm({ memberId: "", name: "", dosage: "", frequency: "", instructions: "", scheduledTimes: "" });

  const logDoseMutation = useMutation({
    mutationFn: (medId: string) =>
      apiRequest('POST', `/api/medications/${medId}/logs`, {
        status: 'given',
        administeredAt: new Date().toISOString(),
        familyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medication-logs/today', familyId] });
      toast({ title: 'Dose logged', description: 'Marked as taken for today.' });
    },
    onError: () => toast({ title: 'Could not log dose', variant: 'destructive' }),
  });

  function expectedDoses(frequency: string): number {
    const f = frequency.toLowerCase();
    if (f.includes('twice') || f.includes('two') || f.includes('2')) return 2;
    if (f.includes('three') || f.includes('3x') || f.includes('3 times')) return 3;
    if (f.includes('four') || f.includes('4')) return 4;
    return 1;
  }

  const createMedMutation = useMutation({
    mutationFn: async (data) => {
      const times = data.scheduledTimes ? data.scheduledTimes.split(',').map(t => t.trim()).filter(Boolean) : [];
      const res = await apiRequest('POST', '/api/medications', { memberId: data.memberId, name: data.name.trim(), dosage: data.dosage.trim(), frequency: data.frequency.trim(), instructions: data.instructions.trim() || null, scheduledTimes: times.length > 0 ? times : null, familyId });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/medications?familyId=' + familyId] }); setShowAddDialog(false); resetForm(); toast({ title: "Medication added", description: "Caregivers can now log this medication." }); },
    onError: (error) => { toast({ title: "Could not add medication", description: error.message || "Please try again.", variant: "destructive" }); },
  });

  const updateMedMutation = useMutation({
    mutationFn: async (data) => {
      const times = data.scheduledTimes ? data.scheduledTimes.split(',').map(t => t.trim()).filter(Boolean) : [];
      const res = await apiRequest('PATCH', '/api/medications/' + data.id + '?familyId=' + familyId, { name: data.name.trim(), dosage: data.dosage.trim(), frequency: data.frequency.trim(), instructions: data.instructions.trim() || null, scheduledTimes: times.length > 0 ? times : null });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/medications?familyId=' + familyId] }); setEditingMed(null); resetForm(); toast({ title: "Medication updated" }); },
    onError: (error) => { toast({ title: "Could not update", description: error.message || "Please try again.", variant: "destructive" }); },
  });

  const deleteMedMutation = useMutation({
    mutationFn: async (medId) => { await apiRequest('DELETE', '/api/medications/' + medId + '?familyId=' + familyId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/medications?familyId=' + familyId] }); toast({ title: "Medication removed" }); },
    onError: (error) => { toast({ title: "Could not remove", description: error.message, variant: "destructive" }); },
  });

  const openEdit = (med) => { setEditingMed(med); setMedForm({ memberId: med.memberId, name: med.name, dosage: med.dosage, frequency: med.frequency, instructions: med.instructions || "", scheduledTimes: med.scheduledTimes ? med.scheduledTimes.join(', ') : "" }); };
  const medsByMember = rawMembers.reduce((acc, member) => { acc[member.id] = medications.filter(m => m.memberId === member.id && m.isActive); return acc; }, {});
  const membersWithMeds = rawMembers.filter(m => (medsByMember[m.id] || []).length > 0);
  const isFormValid = medForm.memberId && medForm.name.trim() && medForm.dosage.trim() && medForm.frequency;

  const MedFormFields = () => (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Family Member *</Label>
        <Select value={medForm.memberId} onValueChange={(v) => setMedForm(f => ({ ...f, memberId: v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Who takes this medication?" /></SelectTrigger>
          <SelectContent>
            {rawMembers.map((m) => (<SelectItem key={m.id} value={m.id}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />{m.name}</div></SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Medication Name *</Label>
          <Input value={medForm.name} onChange={(e) => setMedForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Metformin" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Dosage *</Label>
          <Input value={medForm.dosage} onChange={(e) => setMedForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" className="h-8 text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Frequency *</Label>
        <Select value={medForm.frequency} onValueChange={(v) => setMedForm(f => ({ ...f, frequency: v }))}>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="How often?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Once daily">Once daily</SelectItem>
            <SelectItem value="Twice daily">Twice daily</SelectItem>
            <SelectItem value="Three times daily">Three times daily</SelectItem>
            <SelectItem value="Every 8 hours">Every 8 hours</SelectItem>
            <SelectItem value="Every 12 hours">Every 12 hours</SelectItem>
            <SelectItem value="As needed">As needed (PRN)</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Scheduled Times <span className="text-muted-foreground font-normal">(optional, comma-separated)</span></Label>
        <Input value={medForm.scheduledTimes} onChange={(e) => setMedForm(f => ({ ...f, scheduledTimes: e.target.value }))} placeholder="e.g. 8:00 AM, 8:00 PM" className="h-8 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Special Instructions <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea value={medForm.instructions} onChange={(e) => setMedForm(f => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Take with food, avoid grapefruit..." className="text-sm resize-none" rows={2} />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm"><Pill className="w-4 h-4 text-amber-400" />Medication Schedule</CardTitle>
            <CardDescription className="text-xs mt-1">{isOwnerOrMember ? "Manage medications for family members. Caregivers will log each dose." : "View scheduled medications."}</CardDescription>
          </div>
          {isOwnerOrMember && (
            <div className="flex gap-2">
              <ImportMedicationsDialog familyId={familyId} members={rawMembers} onImported={() => {}} />
              <Button size="sm" onClick={() => { resetForm(); setShowAddDialog(true); }} className="gap-1.5" data-testid="button-add-medication"><Plus className="w-4 h-4" />Add Medication</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {medications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Pill className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No medications added yet</p>
            <p className="text-xs mt-1 text-center max-w-xs">{isOwnerOrMember ? "Add medications so caregivers can log each dose." : "Family owners can add medications here."}</p>
            {isOwnerOrMember && (<Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => { resetForm(); setShowAddDialog(true); }}><Plus className="w-4 h-4" />Add First Medication</Button>)}
          </div>
        ) : (
          <div className="space-y-3">
            {membersWithMeds.map((member) => {
              const meds = medsByMember[member.id] || [];
              return (
                <div key={member.id} className="rounded-lg border border-border overflow-hidden">
                  <button onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7"><AvatarFallback className="text-xs text-white font-semibold" style={{ backgroundColor: member.color }}>{member.name.charAt(0)}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium text-foreground">{member.name}</span>
                      <Badge variant="outline" className="text-xs">{meds.length} med{meds.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {expandedMember === member.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {(expandedMember === member.id || expandedMember === null) && (
                    <div className="divide-y divide-border">
                      {meds.map((med) => {
                        const medLogsToday = todayLogs.filter((l: any) => l.medicationId === med.id && l.status === 'given');
                        const takenCount = medLogsToday.length;
                        const expected = expectedDoses(med.frequency);
                        const allDone = takenCount >= expected;
                        const isLogging = logDoseMutation.isPending && logDoseMutation.variables === med.id;
                        return (
                          <div key={med.id} className="px-4 py-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">{med.name}</p>
                                <Badge variant="secondary" className="text-xs">{med.dosage}</Badge>
                                {takenCount > 0 && (
                                  <Badge variant="outline" className={`text-xs gap-1 ${allDone ? 'border-green-500/40 text-green-600 dark:text-green-400' : 'border-amber-500/40 text-amber-600 dark:text-amber-400'}`}>
                                    <CircleCheck className="w-3 h-3" />
                                    {allDone ? `All ${expected > 1 ? expected + ' doses' : 'dose'} taken` : `${takenCount}/${expected} doses`}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{med.frequency}</p>
                              {med.scheduledTimes && med.scheduledTimes.length > 0 && (
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {med.scheduledTimes.map((t, i) => (<span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">{t}</span>))}
                                </div>
                              )}
                              {med.instructions && <p className="text-xs text-muted-foreground mt-1 italic">{med.instructions}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Button
                                size="sm"
                                variant={allDone ? "outline" : "default"}
                                className={`gap-1.5 text-xs ${allDone ? 'text-muted-foreground' : ''}`}
                                onClick={() => logDoseMutation.mutate(med.id)}
                                disabled={isLogging}
                                data-testid={`button-log-dose-${med.id}`}
                              >
                                {isLogging ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : allDone ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {allDone ? 'Log Again' : 'Log Dose'}
                              </Button>
                              {isOwnerOrMember && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(med)} data-testid={`button-edit-med-${med.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" data-testid={`button-delete-med-${med.id}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Remove {med.name}?</AlertDialogTitle><AlertDialogDescription>This removes the medication from the schedule. Existing logs are kept.</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMedMutation.mutate(med.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pill className="h-4 w-4" />Add Medication</DialogTitle><DialogDescription>Add a medication to a family member's schedule.</DialogDescription></DialogHeader>
          <MedFormFields />
          <DialogFooter><Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>Cancel</Button><Button onClick={() => createMedMutation.mutate(medForm)} disabled={createMedMutation.isPending || !isFormValid}>{createMedMutation.isPending ? "Adding..." : "Add Medication"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingMed} onOpenChange={(v) => { if (!v) { setEditingMed(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" />Edit Medication</DialogTitle><DialogDescription>Update the medication details.</DialogDescription></DialogHeader>
          <MedFormFields />
          <DialogFooter><Button variant="outline" onClick={() => { setEditingMed(null); resetForm(); }}>Cancel</Button><Button onClick={() => editingMed && updateMedMutation.mutate({ ...medForm, id: editingMed.id })} disabled={updateMedMutation.isPending || !isFormValid}>{updateMedMutation.isPending ? "Saving..." : "Save Changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function FamilySettings() {
  const [, navigate] = useLocation();
  const { activeFamilyId } = useActiveFamily();
  const { toast } = useToast();
  const { user } = useAuth();
  const isDemoMode = user?.id?.startsWith('demo-') ?? false;
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [familyMemberEmail, setFamilyMemberEmail] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [bridgeLabel, setBridgeLabel] = useState("");
  const [bridgeDuration, setBridgeDuration] = useState("24");
  const [newBridgeToken, setNewBridgeToken] = useState<string | null>(null);
  const [bridgeLinkCopied, setBridgeLinkCopied] = useState(false);
  const [bridgeRecipientEmail, setBridgeRecipientEmail] = useState("");
  const [bridgeRecipientName, setBridgeRecipientName] = useState("");

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
    onSuccess: (data: any) => {
      if (data.emailFailed) {
        toast({
          title: "Invitation created",
          description: "The email couldn't be sent right now, but you can share the invite code manually using the Copy button above.",
        });
      } else {
        toast({
          title: "Caregiver invited!",
          description: "They'll receive an email with instructions to join.",
        });
      }
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
    onSuccess: (data: any) => {
      if (data.emailFailed) {
        toast({
          title: "Invitation created",
          description: "The email couldn't be sent right now, but you can share the invite code manually using the Copy button below.",
        });
      } else {
        toast({
          title: "Invitation sent!",
          description: "They'll receive an email with your invite code.",
        });
      }
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

  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery<{ schedule: WeeklySummarySchedule }>({
    queryKey: ['/api/weekly-summary-schedule', activeFamilyId],
    queryFn: async () => {
      const res = await fetch(`/api/weekly-summary-schedule?familyId=${activeFamilyId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    },
    enabled: !!activeFamilyId,
  });

  const { data: roleData } = useQuery<{ role: string }>({
    queryKey: ['/api/family', activeFamilyId, 'role'],
    enabled: !!activeFamilyId,
  });

  const isOwnerOrMember = roleData?.role === 'owner' || roleData?.role === 'member' || 
    (user?.id && family?.createdBy === user.id);

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
    updateScheduleMutation.mutate({
      isEnabled: enabled,
      dayOfWeek: scheduleData?.schedule.dayOfWeek ?? '0',
      timeOfDay: scheduleData?.schedule.timeOfDay ?? '08:00',
      timezone: scheduleData?.schedule.timezone ?? 'America/New_York',
    });
  };

  const handleDayChange = (day: string) => {
    updateScheduleMutation.mutate({
      isEnabled: scheduleData?.schedule.isEnabled ?? false,
      dayOfWeek: day,
      timeOfDay: scheduleData?.schedule.timeOfDay ?? '08:00',
      timezone: scheduleData?.schedule.timezone ?? 'America/New_York',
    });
  };

  const handleTimeChange = (time: string) => {
    updateScheduleMutation.mutate({
      isEnabled: scheduleData?.schedule.isEnabled ?? false,
      dayOfWeek: scheduleData?.schedule.dayOfWeek ?? '0',
      timeOfDay: time,
      timezone: scheduleData?.schedule.timezone ?? 'America/New_York',
    });
  };

  const { data: bridgeTokens, isLoading: isLoadingBridgeTokens } = useQuery<EmergencyBridgeToken[]>({
    queryKey: ['/api/emergency-bridge/tokens', activeFamilyId],
    enabled: !!activeFamilyId && !!isOwnerOrMember,
  });

  const createBridgeTokenMutation = useMutation({
    mutationFn: async ({ label, expiresInHours }: { label: string; expiresInHours: number }) => {
      const res = await apiRequest('POST', '/api/emergency-bridge/tokens', {
        familyId: activeFamilyId,
        label,
        expiresInHours,
      });
      return await res.json();
    },
    onSuccess: (data: EmergencyBridgeToken) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-bridge/tokens', activeFamilyId] });
      setNewBridgeToken(data.rawToken || null);
      setBridgeLabel("");
      toast({
        title: "Emergency Bridge link created!",
        description: "Share this link with a backup caregiver for temporary access.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create link",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const revokeBridgeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await apiRequest('DELETE', `/api/emergency-bridge/tokens/${tokenId}?familyId=${activeFamilyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-bridge/tokens', activeFamilyId] });
      toast({
        title: "Link revoked",
        description: "The emergency access link has been deactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to revoke link",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const sendBridgeEmailMutation = useMutation({
    mutationFn: async ({ email, name, token, expiresInHours, label }: { email: string; name: string; token: string; expiresInHours: number; label: string }) => {
      const res = await apiRequest('POST', '/api/emergency-bridge/send-email', {
        recipientEmail: email,
        recipientName: name,
        token,
        familyId: activeFamilyId,
        expiresInHours,
        label,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent!",
        description: "Emergency bridge link has been emailed to your backup caregiver.",
      });
      setBridgeRecipientEmail("");
      setBridgeRecipientName("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again or copy the link manually",
        variant: "destructive",
      });
    },
  });

  const handleCreateBridgeToken = () => {
    createBridgeTokenMutation.mutate({
      label: bridgeLabel.trim() || "Emergency Access",
      expiresInHours: parseInt(bridgeDuration),
    });
  };

  const handleSendBridgeEmail = () => {
    if (!bridgeRecipientEmail.trim() || !bridgeRecipientEmail.includes('@') || !newBridgeToken) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    sendBridgeEmailMutation.mutate({
      email: bridgeRecipientEmail.trim(),
      name: bridgeRecipientName.trim(),
      token: newBridgeToken,
      expiresInHours: parseInt(bridgeDuration),
      label: bridgeLabel.trim() || "Emergency Access",
    });
  };

  const copyBridgeLink = (token: string) => {
    const link = `${window.location.origin}/emergency-bridge/${token}`;
    navigator.clipboard.writeText(link);
    setBridgeLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link with your backup caregiver.",
    });
    setTimeout(() => setBridgeLinkCopied(false), 3000);
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatExpiresIn = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) return "Expired";
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h left`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d left`;
  };

  const copyInviteCode = () => {
    const code = family?.inviteCode || "FAMILY01";
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    toast({
      title: "Code copied!",
      description: "Share this code with anyone you want to invite.",
    });
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const [caregiverCodeCopied, setCaregiverCodeCopied] = useState(false);
  const copyCaregiverCode = () => {
    const code = family?.inviteCode ? `${family.inviteCode}-CG` : "CARGVR01";
    navigator.clipboard.writeText(code);
    setCaregiverCodeCopied(true);
    toast({
      title: "Caregiver code copied!",
      description: "Share this code with your caregiver.",
    });
    setTimeout(() => setCaregiverCodeCopied(false), 3000);
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
      <div className="flex items-center justify-center h-full">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {activeFamilyId && (<MedicationManager familyId={activeFamilyId} isOwnerOrMember={!!isOwnerOrMember} />)}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              Invite a Caregiver
            </CardTitle>
            <CardDescription>
              Invite your nanny, babysitter, or caregiver to view the calendar and mark tasks complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                placeholder="nanny@email.com"
                data-testid="input-caregiver-email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInviteCaregiver();
                }}
              />
              <Button
                onClick={handleInviteCaregiver}
                disabled={!caregiverEmail.trim() || inviteCaregiverMutation.isPending}
                className="flex-shrink-0"
                data-testid="button-invite-caregiver"
              >
                <Send className="w-4 h-4 mr-2" />
                {inviteCaregiverMutation.isPending ? "Sending..." : "Invite"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Caregivers can view events, log medications, and mark tasks done - but can't delete or edit events.
            </p>

            <div className="pt-3 border-t border-border">
              <Label className="text-muted-foreground text-sm">Or share caregiver invite code manually</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={family?.inviteCode ? `${family.inviteCode}-CG` : "CARGVR01"}
                  readOnly
                  className="font-mono tracking-wider"
                  data-testid="input-caregiver-invite-code"
                />
                <Button
                  onClick={copyCaregiverCode}
                  variant="outline"
                  className="flex-shrink-0 min-w-[80px]"
                  data-testid="button-copy-caregiver-code"
                >
                  {caregiverCodeCopied ? (
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

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Invite Family Member
            </CardTitle>
            <CardDescription>
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
                data-testid="input-family-member-email"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInviteFamilyMember();
                }}
              />
              <Button
                onClick={handleInviteFamilyMember}
                disabled={!familyMemberEmail.trim() || inviteFamilyMemberMutation.isPending}
                className="flex-shrink-0"
                data-testid="button-invite-family-member"
              >
                <Send className="w-4 h-4 mr-2" />
                {inviteFamilyMemberMutation.isPending ? "Sending..." : "Invite"}
              </Button>
            </div>

            <div className="pt-3 border-t border-border">
              <Label className="text-muted-foreground text-sm">Or share your invite code manually</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={family?.inviteCode || "FAMILY01"}
                  readOnly
                  className="font-mono tracking-wider"
                  data-testid="input-invite-code"
                />
                <Button
                  onClick={copyInviteCode}
                  variant="outline"
                  className="flex-shrink-0 min-w-[80px]"
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

        {allFamilies && allFamilies.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Your Calendars
              </CardTitle>
              <CardDescription>
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

        {isOwnerOrMember && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Weekly Email Summary
              </CardTitle>
              <CardDescription>
                Automatically send a weekly calendar summary to all family members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSchedule ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Label>Enable automatic summaries</Label>
                    </div>
                    <Switch
                      checked={scheduleData?.schedule.isEnabled ?? false}
                      onCheckedChange={handleScheduleToggle}
                      disabled={updateScheduleMutation.isPending}
                      data-testid="switch-weekly-summary-enabled"
                    />
                  </div>
                  
                  {scheduleData?.schedule.isEnabled && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-sm">Day of Week</Label>
                          <Select
                            value={scheduleData?.schedule.dayOfWeek ?? '0'}
                            onValueChange={handleDayChange}
                            disabled={updateScheduleMutation.isPending}
                          >
                            <SelectTrigger data-testid="select-weekly-summary-day">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                              <SelectItem value="2">Tuesday</SelectItem>
                              <SelectItem value="3">Wednesday</SelectItem>
                              <SelectItem value="4">Thursday</SelectItem>
                              <SelectItem value="5">Friday</SelectItem>
                              <SelectItem value="6">Saturday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-sm">Time</Label>
                          <Select
                            value={scheduleData?.schedule.timeOfDay ?? '08:00'}
                            onValueChange={handleTimeChange}
                            disabled={updateScheduleMutation.isPending}
                          >
                            <SelectTrigger data-testid="select-weekly-summary-time">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="06:00">6:00 AM</SelectItem>
                              <SelectItem value="07:00">7:00 AM</SelectItem>
                              <SelectItem value="08:00">8:00 AM</SelectItem>
                              <SelectItem value="09:00">9:00 AM</SelectItem>
                              <SelectItem value="10:00">10:00 AM</SelectItem>
                              <SelectItem value="12:00">12:00 PM</SelectItem>
                              <SelectItem value="18:00">6:00 PM</SelectItem>
                              <SelectItem value="20:00">8:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        All family members will receive a weekly calendar summary at the scheduled time.
                        Members can opt out in their profile settings.
                      </p>
                      
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('/api/weekly-summary-preview', '_blank')}
                          data-testid="button-preview-email"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Preview Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (isDemoMode) {
                              toast({
                                title: "Demo Mode",
                                description: "Email sending is disabled in demo mode. Sign up to use this feature!",
                              });
                              return;
                            }
                            try {
                              const res = await apiRequest('POST', '/api/send-weekly-summary', {});
                              const data = await res.json();
                              if (data.success) {
                                toast({
                                  title: "Test email sent!",
                                  description: `Check your inbox for the weekly summary.`,
                                });
                              } else {
                                toast({
                                  title: "Email not sent",
                                  description: data.error || "Could not send test email",
                                  variant: "destructive",
                                });
                              }
                            } catch (error: any) {
                              toast({
                                title: "Email not sent",
                                description: error.message || "Could not send test email",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-send-test-email"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Test Email
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isOwnerOrMember && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                Emergency Bridge Mode
              </CardTitle>
              <CardDescription>
                Create temporary access links for backup caregivers during emergencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Label (optional)</Label>
                    <Input
                      type="text"
                      value={bridgeLabel}
                      onChange={(e) => setBridgeLabel(e.target.value)}
                      placeholder="e.g., Neighbor Susan"
                      data-testid="input-bridge-label"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Duration</Label>
                    <Select value={bridgeDuration} onValueChange={setBridgeDuration}>
                      <SelectTrigger data-testid="select-bridge-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="168">7 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleCreateBridgeToken}
                  disabled={createBridgeTokenMutation.isPending}
                  className="w-full"
                  data-testid="button-create-bridge-link"
                >
                  <Link className="w-4 h-4 mr-2" />
                  {createBridgeTokenMutation.isPending ? "Creating..." : "Create Emergency Access Link"}
                </Button>
              </div>

              {newBridgeToken && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      This link is shown only once. Copy or email it now to your backup caregiver.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/emergency-bridge/${newBridgeToken}`}
                      readOnly
                      className="text-xs font-mono"
                      data-testid="input-new-bridge-link"
                    />
                    <Button
                      onClick={() => copyBridgeLink(newBridgeToken)}
                      variant="outline"
                      className="flex-shrink-0"
                      data-testid="button-copy-bridge-link"
                    >
                      {bridgeLinkCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-1 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="pt-3 border-t border-border space-y-2">
                    <Label className="text-muted-foreground text-sm">Or send via email</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="text"
                        value={bridgeRecipientName}
                        onChange={(e) => setBridgeRecipientName(e.target.value)}
                        placeholder="Name (optional)"
                        data-testid="input-bridge-recipient-name"
                      />
                      <Input
                        type="email"
                        value={bridgeRecipientEmail}
                        onChange={(e) => setBridgeRecipientEmail(e.target.value)}
                        placeholder="caregiver@email.com"
                        data-testid="input-bridge-recipient-email"
                      />
                    </div>
                    <Button
                      onClick={handleSendBridgeEmail}
                      disabled={!bridgeRecipientEmail.trim() || sendBridgeEmailMutation.isPending}
                      className="w-full"
                      data-testid="button-send-bridge-email"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {sendBridgeEmailMutation.isPending ? "Sending..." : "Send Link via Email"}
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewBridgeToken(null)}
                    className="text-muted-foreground"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              )}

              {isLoadingBridgeTokens ? (
                <div className="text-muted-foreground text-sm">Loading active links...</div>
              ) : bridgeTokens && bridgeTokens.length > 0 ? (
                <div className="space-y-2 pt-3 border-t border-border">
                  <Label className="text-muted-foreground text-sm">Active Emergency Links</Label>
                  {bridgeTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                      data-testid={`bridge-token-${token.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">{token.label || "Emergency Access"}</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {formatExpiresIn(token.expiresAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {token.accessCount} views
                          </span>
                          <span>Last accessed: {formatTimeAgo(token.lastAccessedAt)}</span>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={revokeBridgeTokenMutation.isPending}
                            data-testid={`button-revoke-token-${token.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke emergency access?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately disable the link. The caregiver will no longer be able to view your family's information.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeBridgeTokenMutation.mutate(token.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">
                Emergency Bridge provides read-only access to your schedule, medications, and family member info.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Join Another Calendar
            </CardTitle>
            <CardDescription>
              Have an invite code? Enter it here to join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character code"
                className="font-mono uppercase"
                data-testid="input-join-code"
                maxLength={8}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinFamily();
                }}
              />
              <Button
                onClick={handleJoinFamily}
                disabled={!joinCode.trim() || joinFamilyMutation.isPending}
                className="flex-shrink-0"
                data-testid="button-join-family"
              >
                {joinFamilyMutation.isPending ? "Joining..." : "Join"}
              </Button>
            </div>
          </CardContent>
        </Card>
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
    <div className={`flex items-center justify-between p-3 rounded-lg ${isActive ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-muted/50 border border-border'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-purple-500/30' : 'bg-muted'}`}>
          {isOwner ? (
            <Crown className="w-5 h-5 text-yellow-400" />
          ) : isCaregiver ? (
            <Heart className="w-5 h-5 text-pink-400" />
          ) : (
            <UserCheck className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div>
          <div className="font-medium text-foreground flex items-center gap-2">
            {family.name}
            {isActive && (
              <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
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
                className="bg-destructive/10 border-destructive/30 text-destructive"
                disabled={isDeleting}
                data-testid={`button-delete-family-${family.id}`}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{family.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this calendar and remove all members. 
                  All events and data will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground"
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
                className="bg-primary/10 border-primary/30 text-primary"
                disabled={isLeaving}
                data-testid={`button-leave-family-${family.id}`}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave "{family.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will no longer see this calendar or its events.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLeave}
                  className="bg-primary text-primary-foreground"
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
