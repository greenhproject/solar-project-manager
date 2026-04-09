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
import { Badge } from "@/components/ui/badge";
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal container - uses fixed dimensions with proper constraints */}
      <div
        className="relative bg-background border rounded-xl shadow-2xl flex flex-col"
        style={{
          width: "min(94vw, 700px)",
          height: "min(92vh, 800px)",
        }}
      >
        {/* ========== HEADER (fixed) ========== */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b">
          {/* Title + close + badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileEdit className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate">Editor Visual de Campos</h2>
                <p className="text-xs text-muted-foreground truncate">{template?.name || "..."}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {parsedDoc && (
                <Badge
                  variant={markerStatus.configured === markerStatus.total ? "default" : "secondary"}
                  className={`text-[10px] px-2 py-0.5 ${
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
              <button
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "document"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("document")}
            >
              <Eye className="h-3.5 w-3.5" />
              Documento
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "fields"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("fields")}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Campos ({fields.length})
            </button>
          </div>
        </div>

        {/* ========== SCROLLABLE BODY ========== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {activeTab === "document" && (
            <div>
              {/* Legend */}
              <div className="sticky top-0 z-10 px-4 py-2 bg-muted/50 border-b flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Marcadores:</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
                  Configurado
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
                  Sin configurar
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#f97316" }} />
                  Seleccionado
                </span>
              </div>

              {/* Document content */}
              {isParsing ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="h-7 w-7 animate-spin mx-auto mb-3 text-orange-500" />
                    <p className="text-xs text-muted-foreground">Analizando documento...</p>
                  </div>
                </div>
              ) : parseError ? (
                <div className="flex items-center justify-center py-16 px-4">
                  <div className="text-center">
                    <AlertCircle className="h-7 w-7 mx-auto mb-3 text-destructive" />
                    <p className="text-xs text-destructive">Error al parsear el documento</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{parseError.message}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <div
                    ref={docViewerRef}
                    className="bg-white rounded-lg shadow border p-4 mx-auto"
                    onClick={handleDocClick}
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    style={{
                      fontFamily: "'Times New Roman', 'Georgia', serif",
                      fontSize: "12px",
                      lineHeight: "1.6",
                      color: "#1a1a1a",
                      maxWidth: "100%",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  />
                  <p className="text-center text-[10px] text-muted-foreground mt-3">
                    Haz clic en un marcador para configurar ese campo
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "fields" && (
            <div>
              {/* Fields toolbar */}
              <div className="sticky top-0 z-10 px-4 py-2 bg-muted/50 border-b flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {fields.length} campo(s)
                </span>
                {markerStatus.unconfigured.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
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
              <div className="p-3 space-y-2">
                {fields.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg px-4">
                    <Settings2 className="h-7 w-7 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">No hay campos configurados</p>
                    <p className="text-[10px] mt-1">
                      {parsedDoc?.markers && parsedDoc.markers.length > 0
                        ? `Se detectaron ${parsedDoc.markers.length} marcadores. Usa "Auto-detectar".`
                        : "Agrega campos manualmente o sube un documento con marcadores {{campo}}."}
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
            </div>
          )}
        </div>

        {/* ========== FOOTER (fixed) ========== */}
        <div className="flex-shrink-0 px-4 py-2.5 border-t flex items-center justify-between bg-muted/20 gap-2">
          <div className="text-[10px] text-muted-foreground min-w-0">
            {hasChanges ? (
              <span className="text-orange-500 font-medium">Cambios sin guardar</span>
            ) : (
              <span>Guardado</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
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
        className="flex items-center gap-2 p-2.5 cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onFocus();
        }}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform text-muted-foreground ${
            isExpanded ? "rotate-90" : ""
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium truncate">
              {field.fieldLabel || "(Sin etiqueta)"}
            </span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 flex-shrink-0 font-mono">
              {`{{${field.fieldKey || "?"}}}`}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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

        <button
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Etiqueta</Label>
              <Input
                value={field.fieldLabel}
                onChange={(e) => onUpdate({ fieldLabel: e.target.value })}
                placeholder="Nombre del Cliente"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">
                Clave <span className="font-mono">{`{{clave}}`}</span>
              </Label>
              <Input
                value={field.fieldKey}
                onChange={(e) => onUpdate({ fieldKey: e.target.value })}
                placeholder="nombre_cliente"
                className="h-7 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Tipo de campo</Label>
              <Select
                value={field.fieldType}
                onValueChange={(v) => onUpdate({ fieldType: v as DynamicField["fieldType"] })}
              >
                <SelectTrigger className="h-7 text-xs">
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
              <Label className="text-[10px] text-muted-foreground">Valor por defecto</Label>
              <Input
                value={field.defaultValue || ""}
                onChange={(e) => onUpdate({ defaultValue: e.target.value })}
                placeholder="Opcional"
                className="h-7 text-xs"
              />
            </div>
          </div>

          {field.fieldType === "project" && (
            <div>
              <Label className="text-[10px] text-muted-foreground">
                Mapeo automático del proyecto
              </Label>
              <Select
                value={field.projectMapping || "none"}
                onValueChange={(v) => onUpdate({ projectMapping: v === "none" ? undefined : v })}
              >
                <SelectTrigger className="h-7 text-xs">
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
              <Label className="text-[10px] text-muted-foreground">
                Opciones (separadas por coma)
              </Label>
              <Input
                value={field.options || ""}
                onChange={(e) => onUpdate({ options: e.target.value })}
                placeholder="Opción 1, Opción 2, Opción 3"
                className="h-7 text-xs"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              checked={field.isRequired}
              onChange={(e) => onUpdate({ isRequired: e.target.checked })}
              className="rounded"
              id={`required-${id}`}
            />
            <Label htmlFor={`required-${id}`} className="text-[10px] cursor-pointer">
              Campo obligatorio
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}
