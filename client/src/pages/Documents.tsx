import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveFamily } from "@/contexts/ActiveFamilyContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { CareDocument, FamilyMember } from "@shared/schema";
import { mapFamilyMemberFromDb } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download,
  Search,
  Filter,
  Plus,
  File,
  FileImage,
  FileSpreadsheet,
  Heart,
  Shield,
  FileCheck,
  ClipboardList,
  FolderOpen,
  X,
  ChevronLeft,
  Eye,
  ExternalLink,
  CloudDownload,
  Folder,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { SiGoogledrive } from "react-icons/si";
import { Link } from "wouter";
import Header from "@/components/Header";
import { useUserRole } from "@/hooks/useUserRole";

const DOCUMENT_TYPE_CONFIG = {
  medical: { label: "Medical Records", icon: Heart, color: "text-red-500" },
  insurance: { label: "Insurance", icon: Shield, color: "text-blue-500" },
  legal: { label: "Legal Documents", icon: FileCheck, color: "text-purple-500" },
  care_plan: { label: "Care Plans", icon: ClipboardList, color: "text-green-500" },
  other: { label: "Other", icon: FolderOpen, color: "text-gray-500" },
} as const;

type DocumentType = keyof typeof DOCUMENT_TYPE_CONFIG;

function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") return FileSpreadsheet;
  return FileText;
}

function formatFileSize(bytes: string | number | null | undefined): string {
  if (!bytes) return "";
  const size = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export default function Documents() {
  const { user } = useAuth();
  const { activeFamilyId } = useActiveFamily();
  const { isOwner, isMember, isLoading: isLoadingRole } = useUserRole();
  const { toast } = useToast();
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<CareDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterMember, setFilterMember] = useState<string | "all">("all");
  
  const [uploadForm, setUploadForm] = useState({
    title: "",
    documentType: "medical" as DocumentType,
    description: "",
    memberId: "",
    file: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  
  const [driveFolderStack, setDriveFolderStack] = useState<{ id: string | undefined; name: string }[]>([{ id: undefined, name: "My Drive" }]);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null);
  const [driveImportForm, setDriveImportForm] = useState({
    title: "",
    documentType: "other" as DocumentType,
    description: "",
    memberId: "",
  });
  const [isImporting, setIsImporting] = useState(false);

  interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
    iconLink?: string;
  }
  
  const { data: rawDocuments = [], isLoading: isLoadingDocuments } = useQuery<CareDocument[]>({
    queryKey: ['/api/care-documents?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });
  
  const { data: rawMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ['/api/family-members?familyId=' + activeFamilyId],
    enabled: !!activeFamilyId,
  });
  
  const members = useMemo(() => rawMembers.map(mapFamilyMemberFromDb), [rawMembers]);

  const currentFolderId = driveFolderStack[driveFolderStack.length - 1]?.id;
  
  const { data: driveStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['/api/google-drive/status'],
    enabled: !!activeFamilyId && (isOwner || isMember),
    staleTime: 60000,
  });
  
  const { data: driveFilesData, isLoading: isLoadingDriveFiles, refetch: refetchDriveFiles } = useQuery<{ files: DriveFile[], nextPageToken?: string }>({
    queryKey: ['/api/google-drive/files', currentFolderId],
    queryFn: async () => {
      const url = currentFolderId 
        ? `/api/google-drive/files?folderId=${currentFolderId}` 
        : '/api/google-drive/files';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load Drive files');
      return res.json();
    },
    enabled: !!activeFamilyId && showDriveDialog && driveStatus?.connected,
  });
  
  const driveFiles = driveFilesData?.files || [];
  
  const documents = useMemo(() => {
    let filtered = rawDocuments;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.fileName.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }
    
    if (filterType !== "all") {
      filtered = filtered.filter(doc => doc.documentType === filterType);
    }
    
    if (filterMember !== "all") {
      filtered = filtered.filter(doc => doc.memberId === filterMember);
    }
    
    return filtered;
  }, [rawDocuments, searchQuery, filterType, filterMember]);
  
  const documentsByType = useMemo(() => {
    const grouped: Record<DocumentType, CareDocument[]> = {
      medical: [],
      insurance: [],
      legal: [],
      care_plan: [],
      other: [],
    };
    
    documents.forEach(doc => {
      const type = doc.documentType as DocumentType;
      if (grouped[type]) {
        grouped[type].push(doc);
      }
    });
    
    return grouped;
  }, [documents]);
  
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("DELETE", `/api/care-documents/${documentId}?familyId=${activeFamilyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/care-documents?familyId=' + activeFamilyId] });
      toast({ title: "Document deleted", description: "The document has been removed." });
      setDeleteDocumentId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    },
  });

  const navigateToFolder = (folderId: string, folderName: string) => {
    setDriveFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedDriveFile(null);
  };

  const navigateBack = () => {
    if (driveFolderStack.length > 1) {
      setDriveFolderStack(prev => prev.slice(0, -1));
      setSelectedDriveFile(null);
    }
  };

  const handleDriveImport = async () => {
    if (!selectedDriveFile || !driveImportForm.title.trim()) {
      toast({ title: "Missing information", description: "Please provide a title for the document.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiRequest("POST", `/api/google-drive/import?familyId=${activeFamilyId}`, {
        fileId: selectedDriveFile.id,
        title: driveImportForm.title.trim(),
        documentType: driveImportForm.documentType,
        description: driveImportForm.description.trim() || null,
        memberId: driveImportForm.memberId || null,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to import document");
      }

      queryClient.invalidateQueries({ queryKey: ['/api/care-documents?familyId=' + activeFamilyId] });
      toast({ title: "Document imported", description: "Your document has been imported from Google Drive." });
      
      setShowDriveDialog(false);
      setSelectedDriveFile(null);
      setDriveImportForm({ title: "", documentType: "other", description: "", memberId: "" });
      setDriveFolderStack([{ id: undefined, name: "My Drive" }]);
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message || "Failed to import from Google Drive.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const openDriveDialog = () => {
    setShowDriveDialog(true);
    setSelectedDriveFile(null);
    setDriveFolderStack([{ id: undefined, name: "My Drive" }]);
    setDriveImportForm({ title: "", documentType: "other", description: "", memberId: "" });
  };
  
  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) {
      toast({ title: "Missing information", description: "Please provide a title and select a file.", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    
    try {
      console.log("Step 1: Requesting upload URL...");
      let urlResponse;
      try {
        urlResponse = await apiRequest("POST", `/api/care-documents/upload-url?familyId=${activeFamilyId}`, {
          fileName: uploadForm.file.name,
          contentType: uploadForm.file.type,
        });
      } catch (fetchError: any) {
        console.error("Failed to get upload URL:", fetchError);
        throw new Error(`Network error getting upload URL: ${fetchError.message}`);
      }
      
      const urlData = await urlResponse.json().catch(() => ({}));
      console.log("Step 1 response:", urlResponse.status, urlData);
      
      if (!urlResponse.ok) {
        throw new Error(urlData.error || `Server error getting upload URL: ${urlResponse.status}`);
      }
      
      const { uploadURL, objectPath } = urlData;
      
      if (!uploadURL) {
        throw new Error("No upload URL received from server");
      }
      
      console.log("Step 2: Uploading file to storage...");
      let uploadResponse;
      try {
        uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: uploadForm.file,
          headers: { "Content-Type": uploadForm.file.type },
        });
      } catch (uploadError: any) {
        console.error("Failed to upload to storage:", uploadError);
        throw new Error(`Network error uploading file: ${uploadError.message}`);
      }
      
      console.log("Step 2 response:", uploadResponse.status);
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => "");
        console.error("Storage upload failed:", errorText);
        throw new Error(`Failed to upload file to storage (${uploadResponse.status}): ${errorText.slice(0, 100)}`);
      }
      
      console.log("Step 3: Creating document record...");
      const createResponse = await apiRequest("POST", `/api/care-documents?familyId=${activeFamilyId}`, {
        title: uploadForm.title.trim(),
        documentType: uploadForm.documentType,
        description: uploadForm.description.trim() || null,
        memberId: uploadForm.memberId || null,
        fileUrl: objectPath,
        fileName: uploadForm.file.name,
        fileSize: String(uploadForm.file.size),
        mimeType: uploadForm.file.type,
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create document record: ${createResponse.status}`);
      }
      
      console.log("Upload complete!");
      queryClient.invalidateQueries({ queryKey: ['/api/care-documents?familyId=' + activeFamilyId] });
      toast({ title: "Document uploaded", description: "Your document has been securely stored." });
      
      setUploadForm({
        title: "",
        documentType: "medical",
        description: "",
        memberId: "",
        file: null,
      });
      setShowUploadDialog(false);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      const message = error?.message || "There was an error uploading your document.";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  const getMemberName = (memberId: string | null) => {
    if (!memberId) return "Family-wide";
    const member = members.find(m => m.id === memberId);
    return member?.name || "Unknown";
  };
  
  const getMemberColor = (memberId: string | null) => {
    if (!memberId) return "#888888";
    const member = members.find(m => m.id === memberId);
    return member?.color || "#888888";
  };

  const canUpload = isOwner || isMember;
  
  if (!activeFamilyId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md mx-4 backdrop-blur-xl bg-card/80 border-border/50">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Please select a family to view documents.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="documents-page">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col gap-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm" data-testid="breadcrumb-documents">
            <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Calendar</span>
            </Link>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-documents-title">
                Care Documents
              </h1>
              <p className="text-muted-foreground mt-1">
                Secure storage for medical records, insurance, and legal documents
              </p>
            </div>
            
            {canUpload && (
              <div className="flex items-center gap-2">
                {driveStatus?.connected && (
                  <Button 
                    variant="outline"
                    onClick={openDriveDialog}
                    className="gap-2"
                    data-testid="button-import-drive"
                  >
                    <SiGoogledrive className="w-4 h-4" />
                    Import from Drive
                  </Button>
                )}
                <Button 
                  onClick={() => setShowUploadDialog(true)}
                  className="gap-2"
                  data-testid="button-upload-document"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </Button>
              </div>
            )}
          </div>
          
          <Card className="backdrop-blur-xl bg-card/80 border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-documents"
                    />
                  </div>
                </div>
                
                <Select value={filterType} onValueChange={(v) => setFilterType(v as DocumentType | "all")}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterMember} onValueChange={setFilterMember}>
                  <SelectTrigger className="w-[180px]" data-testid="select-filter-member">
                    <SelectValue placeholder="All members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {isLoadingDocuments ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="backdrop-blur-xl bg-card/80 border-border/50 animate-pulse">
                  <CardContent className="pt-6 h-32" />
                </Card>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <Card className="backdrop-blur-xl bg-card/80 border-border/50">
              <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No documents found</h3>
                  <p className="text-muted-foreground mt-1">
                    {searchQuery || filterType !== "all" || filterMember !== "all" 
                      ? "Try adjusting your filters"
                      : "Upload your first care document to get started"}
                  </p>
                </div>
                {canUpload && !searchQuery && filterType === "all" && filterMember === "all" && (
                  <Button 
                    onClick={() => setShowUploadDialog(true)}
                    variant="outline"
                    className="gap-2 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Document
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(DOCUMENT_TYPE_CONFIG).map(([type, config]) => {
                const typeDocs = documentsByType[type as DocumentType];
                if (typeDocs.length === 0) return null;
                
                const Icon = config.icon;
                
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <h2 className="text-lg font-semibold">{config.label}</h2>
                      <Badge variant="secondary" className="ml-2">{typeDocs.length}</Badge>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {typeDocs.map(doc => {
                        const FileIcon = getFileIcon(doc.mimeType);
                        
                        return (
                          <Card 
                            key={doc.id} 
                            className="backdrop-blur-xl bg-card/80 border-border/50 hover-elevate group"
                            data-testid={`card-document-${doc.id}`}
                          >
                            <CardContent className="pt-4 pb-4">
                              <div className="flex items-start gap-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted/50"
                                  style={{ borderLeft: `3px solid ${getMemberColor(doc.memberId)}` }}
                                >
                                  <FileIcon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium truncate" data-testid={`text-document-title-${doc.id}`}>
                                    {doc.title}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Avatar className="w-5 h-5">
                                      <AvatarFallback 
                                        className="text-xs"
                                        style={{ backgroundColor: getMemberColor(doc.memberId) }}
                                      >
                                        {getMemberName(doc.memberId).charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {getMemberName(doc.memberId)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                    <span>•</span>
                                    <span>{format(new Date(doc.createdAt!), "MMM d, yyyy")}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isPreviewable(doc.mimeType) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setPreviewDocument(doc)}
                                      data-testid={`button-preview-${doc.id}`}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    data-testid={`button-download-${doc.id}`}
                                  >
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                  {canUpload && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteDocumentId(doc.id)}
                                      className="text-destructive hover:text-destructive"
                                      data-testid={`button-delete-${doc.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {doc.description && (
                                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                  {doc.description}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-upload-document">
          <DialogHeader>
            <DialogTitle>Upload Care Document</DialogTitle>
            <DialogDescription>
              Securely store important medical records, insurance documents, and legal papers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                placeholder="e.g., Mom's Insurance Card"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-document-title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Document Type</Label>
              <Select 
                value={uploadForm.documentType} 
                onValueChange={(v) => setUploadForm(prev => ({ ...prev, documentType: v as DocumentType }))}
              >
                <SelectTrigger data-testid="select-document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="member">Related Family Member (Optional)</Label>
              <Select 
                value={uploadForm.memberId || "none"} 
                onValueChange={(v) => setUploadForm(prev => ({ ...prev, memberId: v === "none" ? "" : v }))}
              >
                <SelectTrigger data-testid="select-document-member">
                  <SelectValue placeholder="Family-wide document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Family-wide document</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any notes about this document..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                data-testid="input-document-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label>File</Label>
              {uploadForm.file ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadForm.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadForm.file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setUploadForm(prev => ({ ...prev, file: null }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadForm(prev => ({ ...prev, file }));
                      }
                    }}
                    data-testid="input-file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, images, or documents up to 10MB
                    </p>
                  </label>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !uploadForm.file || !uploadForm.title.trim()}
              data-testid="button-confirm-upload"
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deleteDocumentId} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocumentId && deleteMutation.mutate(deleteDocumentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]" data-testid="dialog-preview-document">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDocument?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-sm">
              {previewDocument?.fileName} • {formatFileSize(previewDocument?.fileSize)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-[300px] max-h-[60vh] bg-muted/20 rounded-lg flex items-center justify-center">
            {previewDocument?.mimeType?.startsWith("image/") ? (
              <img 
                src={previewDocument.fileUrl} 
                alt={previewDocument.title}
                className="max-w-full max-h-full object-contain"
                data-testid="preview-image"
              />
            ) : previewDocument?.mimeType === "application/pdf" ? (
              <div className="text-center p-8" data-testid="preview-pdf-prompt">
                <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-medium mb-2">PDF Document</h3>
                <p className="text-muted-foreground mb-4">
                  Click below to view this PDF in a new browser tab
                </p>
                <Button asChild>
                  <a 
                    href={previewDocument.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open PDF
                  </a>
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Preview not available for this file type</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewDocument(null)}
            >
              Close
            </Button>
            <Button
              variant="outline"
              asChild
            >
              <a 
                href={previewDocument?.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid="button-open-new-tab"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Drive Import Dialog */}
      <Dialog open={showDriveDialog} onOpenChange={setShowDriveDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]" data-testid="dialog-drive-import">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiGoogledrive className="w-5 h-5 text-blue-500" />
              Import from Google Drive
            </DialogTitle>
            <DialogDescription>
              Browse your Google Drive and select a document to import
            </DialogDescription>
          </DialogHeader>
          
          {selectedDriveFile ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                <FileText className="w-10 h-10 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedDriveFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedDriveFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDriveFile(null)}
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drive-title">Document Title</Label>
                <Input
                  id="drive-title"
                  placeholder="e.g., Mom's Insurance Card"
                  value={driveImportForm.title}
                  onChange={(e) => setDriveImportForm(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-drive-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select 
                  value={driveImportForm.documentType} 
                  onValueChange={(v) => setDriveImportForm(prev => ({ ...prev, documentType: v as DocumentType }))}
                >
                  <SelectTrigger data-testid="select-drive-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Related Family Member (Optional)</Label>
                <Select 
                  value={driveImportForm.memberId || "none"} 
                  onValueChange={(v) => setDriveImportForm(prev => ({ ...prev, memberId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger data-testid="select-drive-member">
                    <SelectValue placeholder="Family-wide document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Family-wide document</SelectItem>
                    {members.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Add any notes about this document..."
                  value={driveImportForm.description}
                  onChange={(e) => setDriveImportForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  data-testid="input-drive-description"
                />
              </div>
            </div>
          ) : (
            <div className="py-4">
              <div className="flex items-center gap-2 mb-4">
                {driveFolderStack.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateBack}
                    data-testid="button-drive-back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
                  {driveFolderStack.map((folder, index) => (
                    <span key={index} className="flex items-center gap-1">
                      {index > 0 && <span>/</span>}
                      <span className={index === driveFolderStack.length - 1 ? "font-medium text-foreground" : ""}>
                        {folder.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                {isLoadingDriveFiles ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mb-2 opacity-50" />
                    <p>No files in this folder</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {driveFiles.map((file) => {
                      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                      const FileIcon = isFolder ? Folder : getFileIcon(file.mimeType);
                      
                      return (
                        <button
                          key={file.id}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover-elevate text-left transition-colors"
                          onClick={() => {
                            if (isFolder) {
                              navigateToFolder(file.id, file.name);
                            } else {
                              setSelectedDriveFile(file);
                              setDriveImportForm(prev => ({
                                ...prev,
                                title: file.name.replace(/\.[^/.]+$/, ""),
                              }));
                            }
                          }}
                          data-testid={`drive-file-${file.id}`}
                        >
                          <FileIcon className={`w-5 h-5 ${isFolder ? "text-yellow-500" : "text-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            {!isFolder && file.size && (
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            )}
                          </div>
                          {isFolder && (
                            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDriveDialog(false)}>
              Cancel
            </Button>
            {selectedDriveFile && (
              <Button 
                onClick={handleDriveImport} 
                disabled={isImporting || !driveImportForm.title.trim()}
                data-testid="button-confirm-import"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-4 h-4 mr-2" />
                    Import Document
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
