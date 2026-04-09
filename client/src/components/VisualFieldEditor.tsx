import { useState, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileEdit,
  Settings2,
  Eye,
  X,
  Plus,
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Zap,
  FileText,
  Download,
} from "lucide-react";

type DynamicField = {
  fieldKey: string;
  fieldLabel: string;
  fieldType: "text" | "number" | "date" | "select" | "project";
  options?: string;
  projectMapping?: string;
  defaultValue?: string;
  orderIndex: number;
  isRequired: boolean;
};

const PROJECT_MAPPINGS = [
  { value: "clientName", label: "Nombre del cliente" },
  { value: "clientEmail", label: "Email del cliente" },
  { value: "clientPhone", label: "Teléfono del cliente" },
  { value: "location", label: "Dirección/Ubicación" },
  { value: "name", label: "Nombre del proyecto" },
  { value: "description", label: "Descripción del proyecto" },
];

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  number: "Número",
  date: "Fecha",
  select: "Selección",
  project: "Auto (proyecto)",
};

interface VisualFieldEditorProps {
  templateId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function VisualFieldEditor({
  templateId,
  open,
  onOpenChange,
}: VisualFieldEditorProps) {
  const utils = trpc.useUtils();

  const { data: template } = trpc.dynamicDocuments.getTemplate.useQuery(
    { id: templateId },
    { enabled: open }
  );

  const {
    data: parsedDoc,
    isLoading: isParsing,
    error: parseError,
  } = trpc.dynamicDocuments.parseDocument.useQuery(
    { id: templateId },
    { enabled: open }
  );

  const [fields, setFields] = useState<DynamicField[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  // On mobile, default to "fields" tab; on desktop, "split"
  const [activeTab, setActiveTab] = useState<"document" | "fields">("fields");
  const docViewerRef = useRef<HTMLDivElement>(null);

  // Sync fields from server
  useEffect(() => {
    if (template?.fields) {
      setFields(
        template.fields.map((f) => ({
          fieldKey: f.fieldKey,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType as DynamicField["fieldType"],
          options: f.options || undefined,
          projectMapping: f.projectMapping || undefined,
          defaultValue: f.defaultValue || undefined,
          orderIndex: f.orderIndex,
          isRequired: f.isRequired,
        }))
      );
      setHasChanges(false);
    }
  }, [template?.fields]);

  // Auto-detect new markers
  useEffect(() => {
    if (parsedDoc?.markers && template?.fields) {
      const existingKeys = new Set(template.fields.map((f) => f.fieldKey));
      const newMarkers = parsedDoc.markers.filter((m) => !existingKeys.has(m));

      if (newMarkers.length > 0 && fields.length === template.fields.length) {
        const newFields: DynamicField[] = newMarkers.map((marker, i) => ({
          fieldKey: marker,
          fieldLabel: marker
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          fieldType: "text" as const,
          orderIndex: fields.length + i,
          isRequired: true,
        }));

        setFields((prev) => [...prev, ...newFields]);
        setHasChanges(true);
        toast.info(
          `Se detectaron ${newMarkers.length} campo(s) nuevo(s) en el documento`
        );
      }
    }
  }, [parsedDoc?.markers, template?.fields]);

  // Highlight markers in HTML
  const highlightedHtml = useMemo(() => {
    if (!parsedDoc?.html) return "";
    let html = parsedDoc.html;
    html = html.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
      const trimmedKey = key.trim();
      const field = fields.find((f) => f.fieldKey === trimmedKey);
      const isConfigured = !!field;
      const isActive = activeMarker === trimmedKey;
      const bgColor = isActive ? "#f97316" : isConfigured ? "#22c55e" : "#ef4444";
      return `<span class="doc-marker" data-marker="${trimmedKey}" style="background-color:${bgColor};color:#fff;padding:2px 6px;border-radius:4px;font-weight:600;font-size:0.85em;cursor:pointer;display:inline-block;box-shadow:0 1px 3px rgba(0,0,0,0.2);white-space:nowrap;">{{${trimmedKey}}}</span>`;
    });
    return html;
  }, [parsedDoc?.html, fields, activeMarker]);

  // Marker status
  const markerStatus = useMemo(() => {
    if (!parsedDoc?.markers) return { configured: 0, total: 0, unconfigured: [] as string[] };
    const configured = parsedDoc.markers.filter((m) => fields.some((f) => f.fieldKey === m));
    const unconfigured = parsedDoc.markers.filter((m) => !fields.some((f) => f.fieldKey === m));
    return { configured: configured.length, total: parsedDoc.markers.length, unconfigured };
  }, [parsedDoc?.markers, fields]);

  // Save mutation
  const saveMutation = trpc.dynamicDocuments.saveFields.useMutation({
    onSuccess: () => {
      toast.success("Campos guardados exitosamente");
      setHasChanges(false);
      utils.dynamicDocuments.getTemplate.invalidate({ id: templateId });
    },
    onError: (err) => toast.error(err.message || "Error al guardar campos"),
  });

  const addField = (key?: string) => {
    const newField: DynamicField = {
      fieldKey: key || "",
      fieldLabel: key ? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "",
      fieldType: "text",
      orderIndex: fields.length,
      isRequired: true,
    };
    setFields([...fields, newField]);
    setHasChanges(true);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateField = (index: number, updates: Partial<DynamicField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
    setHasChanges(true);
  };

  const handleSave = () => {
    for (const field of fields) {
      if (!field.fieldKey || !field.fieldLabel) {
        toast.error("Todos los campos deben tener clave y etiqueta");
        return;
      }
    }
    saveMutation.mutate({
      templateId,
      fields: fields.map((f, i) => ({ ...f, orderIndex: i })),
    });
  };

  const handleDocClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const marker = target.closest(".doc-marker");
    if (marker) {
      const key = marker.getAttribute("data-marker");
      if (key) {
        setActiveMarker(key);
        setActiveTab("fields");
        const fieldIndex = fields.findIndex((f) => f.fieldKey === key);
        if (fieldIndex >= 0) {
          setTimeout(() => {
            const el = document.getElementById(`field-card-${fieldIndex}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }
      }
    }
  };

  const scrollToMarker = (key: string) => {
    setActiveMarker(key);
    if (docViewerRef.current) {
      const markerEl = docViewerRef.current.querySelector(`[data-marker="${key}"]`);
      markerEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-[1100px] max-h-[94vh] h-[94vh] p-0 flex flex-col overflow-hidden gap-0">
        {/* ========== HEADER ========== */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b space-y-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-orange-500 shrink-0" />
                <span className="truncate">Editor Visual de Campos</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm truncate">
                {template?.name || "Cargando..."}
              </DialogDescription>
            </div>

            {/* Status badge */}
            {parsedDoc && (
              <Badge
                variant={markerStatus.configured === markerStatus.total ? "default" : "secondary"}
                className={`shrink-0 text-xs ${
                  markerStatus.configured === markerStatus.total ? "bg-green-600 text-white" : ""
                }`}
              >
                {markerStatus.configured === markerStatus.total ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {markerStatus.configured}/{markerStatus.total}
              </Badge>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === "document"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("document")}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Documento</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === "fields"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("fields")}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Campos ({fields.length})</span>
            </button>
          </div>
        </div>

        {/* ========== BODY ========== */}
        <div className="flex-1 overflow-hidden relative">
          {/* Document Tab */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
              activeTab === "document" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Legend bar */}
            <div className="shrink-0 px-4 py-2 bg-muted/30 border-b flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-xs text-muted-foreground font-medium">Marcadores:</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
                Configurado
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
                Sin configurar
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
                Seleccionado
              </span>
            </div>

            {/* Document content */}
            <ScrollArea className="flex-1">
              {isParsing ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-orange-500" />
                    <p className="text-sm text-muted-foreground">Analizando documento...</p>
                  </div>
                </div>
              ) : parseError ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center px-4">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
                    <p className="text-sm text-destructive">Error al parsear el documento</p>
                    <p className="text-xs text-muted-foreground mt-1">{parseError.message}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-6">
                  <div
                    ref={docViewerRef}
                    className="bg-white rounded-lg shadow-md border p-6 sm:p-8 mx-auto"
                    onClick={handleDocClick}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    style={{
                      fontFamily: "'Times New Roman', 'Georgia', serif",
                      fontSize: "13px",
                      lineHeight: "1.7",
                      color: "#1a1a1a",
                      maxWidth: "800px",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  />
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Haz clic en un marcador resaltado para configurar ese campo
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Fields Tab */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
              activeTab === "fields" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Fields toolbar */}
            <div className="shrink-0 px-4 py-2 bg-muted/30 border-b flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                {fields.length} campo(s) configurado(s)
              </span>
              {markerStatus.unconfigured.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    markerStatus.unconfigured.forEach((key) => addField(key));
                  }}
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Auto-detectar ({markerStatus.unconfigured.length})
                </Button>
              )}
            </div>

            {/* Fields list */}
            <ScrollArea className="flex-1">
              <div className="p-3 sm:p-4 space-y-2">
                {fields.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg px-4">
                    <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No hay campos configurados</p>
                    <p className="text-xs mt-1">
                      {parsedDoc?.markers && parsedDoc.markers.length > 0
                        ? `Se detectaron ${parsedDoc.markers.length} marcadores. Usa "Auto-detectar" para agregarlos.`
                        : 'Agrega campos manualmente o sube un documento con marcadores {{campo}}.'}
                    </p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <FieldCard
                      key={`${field.fieldKey}-${index}`}
                      id={`field-card-${index}`}
                      field={field}
                      index={index}
                      isActive={activeMarker === field.fieldKey}
                      isInDocument={parsedDoc?.markers?.includes(field.fieldKey) ?? false}
                      onUpdate={(updates) => updateField(index, updates)}
                      onRemove={() => removeField(index)}
                      onFocus={() => scrollToMarker(field.fieldKey)}
                    />
                  ))
                )}

                <Button
                  variant="outline"
                  onClick={() => addField()}
                  className="w-full mt-2"
                  size="sm"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Agregar Campo Manual
                </Button>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ========== FOOTER ========== */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t flex items-center justify-between bg-muted/20 gap-2">
          <div className="text-xs text-muted-foreground min-w-0">
            {hasChanges ? (
              <span className="text-orange-500 font-medium">Cambios sin guardar</span>
            ) : (
              <span className="hidden sm:inline">Todos los cambios guardados</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Guardando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Field Card Component
// ==========================================
function FieldCard({
  id,
  field,
  index,
  isActive,
  isInDocument,
  onUpdate,
  onRemove,
  onFocus,
}: {
  id: string;
  field: DynamicField;
  index: number;
  isActive: boolean;
  isInDocument: boolean;
  onUpdate: (updates: Partial<DynamicField>) => void;
  onRemove: () => void;
  onFocus: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      id={id}
      className={`rounded-lg border transition-all ${
        isActive
          ? "border-orange-500 bg-orange-500/5 shadow-sm ring-1 ring-orange-500/20"
          : "border-border bg-card hover:border-muted-foreground/20"
      }`}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 p-3 cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onFocus();
        }}
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform text-muted-foreground ${
            isExpanded ? "rotate-90" : ""
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {field.fieldLabel || "(Sin etiqueta)"}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-mono">
              {`{{${field.fieldKey || "?"}}}`}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
            </span>
            {field.isRequired && (
              <span className="text-[10px] text-orange-500 font-medium">Requerido</span>
            )}
            {isInDocument ? (
              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                En documento
              </span>
            ) : (
              <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
                No encontrado
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Etiqueta</Label>
              <Input
                value={field.fieldLabel}
                onChange={(e) => onUpdate({ fieldLabel: e.target.value })}
                placeholder="Nombre del Cliente"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Clave <span className="font-mono">{`{{clave}}`}</span>
              </Label>
              <Input
                value={field.fieldKey}
                onChange={(e) => onUpdate({ fieldKey: e.target.value })}
                placeholder="nombre_cliente"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Tipo de campo</Label>
              <Select
                value={field.fieldType}
                onValueChange={(v) => onUpdate({ fieldType: v as DynamicField["fieldType"] })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="select">Selección</SelectItem>
                  <SelectItem value="project">Auto (del proyecto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Valor por defecto</Label>
              <Input
                value={field.defaultValue || ""}
                onChange={(e) => onUpdate({ defaultValue: e.target.value })}
                placeholder="Opcional"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {field.fieldType === "project" && (
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Mapeo automático del proyecto
              </Label>
              <Select
                value={field.projectMapping || "none"}
                onValueChange={(v) => onUpdate({ projectMapping: v === "none" ? undefined : v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecciona campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin mapeo</SelectItem>
                  {PROJECT_MAPPINGS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {field.fieldType === "select" && (
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Opciones (separadas por coma)
              </Label>
              <Input
                value={field.options || ""}
                onChange={(e) => onUpdate({ options: e.target.value })}
                placeholder="Opción 1, Opción 2, Opción 3"
                className="h-8 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={field.isRequired}
              onChange={(e) => onUpdate({ isRequired: e.target.checked })}
              className="rounded"
              id={`required-${id}`}
            />
            <Label htmlFor={`required-${id}`} className="text-xs cursor-pointer">
              Campo obligatorio
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}
