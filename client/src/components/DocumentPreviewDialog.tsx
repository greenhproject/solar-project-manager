import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface DocumentPreviewDialogProps {
  templateId: number;
  templateName: string;
  fileUrl: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function DocumentPreviewDialog({
  templateId,
  templateName,
  fileUrl,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const {
    data: parsedDoc,
    isLoading,
    error,
  } = trpc.dynamicDocuments.parseDocument.useQuery(
    { id: templateId },
    { enabled: open }
  );

  const highlightedHtml = useMemo(() => {
    if (!parsedDoc?.html) return "";
    let html = parsedDoc.html;
    html = html.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
      const trimmedKey = key.trim();
      return `<span style="background-color:#f97316;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600;font-size:0.85em;display:inline-block;box-shadow:0 1px 3px rgba(0,0,0,0.2);white-space:nowrap;">{{${trimmedKey}}}</span>`;
    });
    return html;
  }, [parsedDoc?.html]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[900px] max-h-[94vh] h-[94vh] p-0 flex flex-col overflow-hidden gap-0">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500 shrink-0" />
                <span className="truncate">Vista Previa</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm truncate">
                {templateName}
                {parsedDoc?.markers && parsedDoc.markers.length > 0 && (
                  <span> — {parsedDoc.markers.length} campo(s) dinámico(s)</span>
                )}
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => window.open(fileUrl, "_blank")}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descargar</span>
            </Button>
          </div>

          {/* Marker badges - scrollable row */}
          {parsedDoc?.markers && parsedDoc.markers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {parsedDoc.markers.map((marker) => (
                <Badge
                  key={marker}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-500 font-mono"
                >
                  {`{{${marker}}}`}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Document content */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-orange-500" />
                <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 px-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
                <p className="text-sm text-destructive">Error al cargar la vista previa</p>
                <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.open(fileUrl, "_blank")}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Descargar archivo original
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div
                className="bg-white rounded-lg shadow-md border p-6 sm:p-10 mx-auto"
                style={{
                  fontFamily: "'Times New Roman', 'Georgia', serif",
                  fontSize: "13px",
                  lineHeight: "1.8",
                  color: "#1a1a1a",
                  maxWidth: "800px",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  minHeight: "400px",
                }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
