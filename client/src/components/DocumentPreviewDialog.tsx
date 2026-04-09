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
  // Fetch parsed document (HTML + markers)
  const {
    data: parsedDoc,
    isLoading,
    error,
  } = trpc.dynamicDocuments.parseDocument.useQuery(
    { id: templateId },
    { enabled: open }
  );

  // Highlight markers in HTML with colored badges
  const highlightedHtml = useMemo(() => {
    if (!parsedDoc?.html) return "";

    let html = parsedDoc.html;

    // Replace {{marker}} with highlighted spans
    html = html.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
      const trimmedKey = key.trim();
      return `<span 
        style="
          background-color: #f97316; 
          color: #ffffff; 
          padding: 2px 8px; 
          border-radius: 4px; 
          font-weight: 600; 
          font-size: 0.85em;
          display: inline-block;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        "
      >{{${trimmedKey}}}</span>`;
    });

    return html;
  }, [parsedDoc?.html]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[900px] max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Vista Previa del Documento
              </DialogTitle>
              <DialogDescription className="mt-1">
                {templateName}
                {parsedDoc?.markers && parsedDoc.markers.length > 0 && (
                  <span className="ml-2">
                    — {parsedDoc.markers.length} campo(s) dinámico(s) detectado(s)
                  </span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {parsedDoc?.markers && parsedDoc.markers.length > 0 && (
                <div className="flex flex-wrap gap-1 mr-2">
                  {parsedDoc.markers.map((marker) => (
                    <Badge
                      key={marker}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-500"
                    >
                      {`{{${marker}}}`}
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(fileUrl, "_blank")}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Descargar
              </Button>
            </div>
          </div>
        </div>

        {/* Document content */}
        <ScrollArea className="flex-1" style={{ height: "calc(90vh - 120px)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  Cargando vista previa...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
                <p className="text-sm text-destructive">
                  Error al cargar la vista previa
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error.message}
                </p>
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
            <div className="p-8 mx-auto max-w-[800px]">
              {/* Document rendered as a "paper" */}
              <div
                className="bg-white rounded-lg shadow-lg border p-10"
                style={{
                  fontFamily: "'Times New Roman', 'Georgia', serif",
                  fontSize: "14px",
                  lineHeight: "1.8",
                  color: "#1a1a1a",
                  minHeight: "500px",
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
