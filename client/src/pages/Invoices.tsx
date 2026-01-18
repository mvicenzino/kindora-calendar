import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, RefreshCw, Calendar, X, DollarSign, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ParsedInvoice } from "@shared/schema";

const categoryColors: Record<string, string> = {
  utility: "#10B981",
  credit_card: "#F59E0B",
  subscription: "#8B5CF6",
  medical: "#EF4444",
  insurance: "#3B82F6",
  other: "#6B7280",
};

const categoryLabels: Record<string, string> = {
  utility: "Utility",
  credit_card: "Credit Card",
  subscription: "Subscription",
  medical: "Medical",
  insurance: "Insurance",
  other: "Other",
};

export default function Invoices() {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const { data: gmailStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/gmail/status"],
  });

  const { data: invoices = [], isLoading, error: invoicesError } = useQuery<ParsedInvoice[]>({
    queryKey: ["/api/invoices"],
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      const res = await apiRequest("POST", "/api/gmail/scan", { daysBack: 30 });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsScanning(false);
      toast({
        title: "Scan Complete",
        description: `Found ${data.found} invoice(s), saved ${data.saved} new invoice(s)`,
      });
    },
    onError: (error: Error) => {
      setIsScanning(false);
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan Gmail for invoices",
        variant: "destructive",
      });
    },
  });

  const addToCalendarMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/add-to-calendar`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Added to Calendar",
        description: "Payment reminder event has been created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add",
        description: error.message || "Could not add invoice to calendar",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/dismiss`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice Dismissed",
        description: "This invoice will no longer appear in pending",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Dismiss",
        description: error.message || "Could not dismiss invoice",
        variant: "destructive",
      });
    },
  });

  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const addedInvoices = invoices.filter((i) => i.status === "added_to_calendar");
  const dismissedInvoices = invoices.filter((i) => i.status === "dismissed");

  if (!gmailStatus?.connected) {
    return (
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="titanium-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Gmail Integration
              </CardTitle>
              <CardDescription className="text-white/60">
                Connect your Gmail to automatically find and track payment notices
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Mail className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <p className="text-white/70 mb-4">
                Gmail is not connected. Please set up the Gmail integration to scan for invoices.
              </p>
              <p className="text-white/50 text-sm">
                Go to your integrations settings to connect Gmail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-invoices-title">
              Invoice Scanner
            </h1>
            <p className="text-white/60 text-sm">
              Automatically find payment notices from your Gmail
            </p>
          </div>
          <Button
            onClick={() => scanMutation.mutate()}
            disabled={isScanning}
            className="border border-white/20"
            data-testid="button-scan-gmail"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Scan Gmail
              </>
            )}
          </Button>
        </div>

        {invoicesError ? (
          <Card className="titanium-glass border-red-500/30">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-white/70 mb-2">Failed to load invoices</p>
              <p className="text-white/50 text-sm">
                {(invoicesError as Error).message || "An error occurred. Please try again later."}
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : pendingInvoices.length === 0 && addedInvoices.length === 0 ? (
          <Card className="titanium-glass border-white/20">
            <CardContent className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <p className="text-white/70 mb-2">No invoices found yet</p>
              <p className="text-white/50 text-sm mb-4">
                Click "Scan Gmail" to search your inbox for payment notices
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingInvoices.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Pending Review ({pendingInvoices.length})
                </h2>
                {pendingInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    onAddToCalendar={() => addToCalendarMutation.mutate(invoice.id)}
                    onDismiss={() => dismissMutation.mutate(invoice.id)}
                    isAddingToCalendar={addToCalendarMutation.isPending}
                  />
                ))}
              </div>
            )}

            {addedInvoices.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white/80">
                  Added to Calendar ({addedInvoices.length})
                </h2>
                {addedInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    showActions={false}
                  />
                ))}
              </div>
            )}

            {dismissedInvoices.length > 0 && (
              <details className="group">
                <summary className="text-white/50 text-sm cursor-pointer hover:text-white/70">
                  Dismissed ({dismissedInvoices.length})
                </summary>
                <div className="space-y-4 mt-4 opacity-50">
                  {dismissedInvoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.id}
                      invoice={invoice}
                      showActions={false}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceCard({
  invoice,
  onAddToCalendar,
  onDismiss,
  isAddingToCalendar,
  showActions = true,
}: {
  invoice: ParsedInvoice;
  onAddToCalendar?: () => void;
  onDismiss?: () => void;
  isAddingToCalendar?: boolean;
  showActions?: boolean;
}) {
  const categoryColor = categoryColors[invoice.category] || categoryColors.other;

  return (
    <Card
      className="titanium-glass border-white/20 overflow-hidden"
      data-testid={`card-invoice-${invoice.id}`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: categoryColor }}
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                style={{ backgroundColor: categoryColor }}
                className="text-white text-xs"
              >
                {categoryLabels[invoice.category] || "Other"}
              </Badge>
              {invoice.status === "added_to_calendar" && (
                <Badge variant="outline" className="text-emerald-400 border-emerald-400/50 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Added
                </Badge>
              )}
            </div>
            <h3 className="font-medium text-white truncate" data-testid={`text-invoice-sender-${invoice.id}`}>
              {invoice.sender}
            </h3>
            <p className="text-sm text-white/60 truncate">{invoice.subject}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              {invoice.amount && (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {parseFloat(invoice.amount).toFixed(2)}
                </span>
              )}
              {invoice.dueDate && (
                <span className="text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                </span>
              )}
              {invoice.receivedAt && (
                <span className="text-white/40 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {format(new Date(invoice.receivedAt), "MMM d")}
                </span>
              )}
            </div>
          </div>
          {showActions && invoice.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={onAddToCalendar}
                disabled={isAddingToCalendar}
                className="border border-emerald-500/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                data-testid={`button-add-to-calendar-${invoice.id}`}
              >
                {isAddingToCalendar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDismiss}
                className="text-white/40 hover:text-white/60"
                data-testid={`button-dismiss-${invoice.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
