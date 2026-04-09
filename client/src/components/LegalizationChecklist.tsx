import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Circle,
  Upload,
  Download,
  FileText,
  Package,
  Loader2,
  FileEdit,
  Send,
  Trash2,
  Eye,
  FileCheck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface LegalizationChecklistProps {
  projectId: number;
}

const DOCUMENT_TYPES = [
  {
    value: "certificado_tradicion",
    label: "Certificado de Tradición y Libertad",
    autoLoadable: false,
  },
  {
    value: "cedula_cliente",
    label: "Cédula del Cliente",
    autoLoadable: false,
  },
  {
    value: "plano_agpe",
    label: "Plano AGPE",
    autoLoadable: false,
  },
  {
    value: "autodeclaracion_retie",
    label: "Auto Declaración RETIE",
    autoLoadable: false,
  },
  {
    value: "certificado_inversor",
    label: "Certificado Inversor",
    autoLoadable: true,
    libraryType: "certificado_inversor",
  },
  {
    value: "certificado_paneles",
    label: "Certificado de Paneles",
    autoLoadable: true,
    libraryType: "certificado_paneles",
  },
  {
    value: "manual_inversor",
    label: "Manual del Inversor",
    autoLoadable: true,
    libraryType: "manual_inversor",
  },
  {
    value: "matricula_inversor",
    label: "Matrícula del Constructor",
    autoLoadable: true,
    libraryType: "matricula_constructor",
  },
  {
    value: "experiencia_constructor",
    label: "Experiencia del Constructor",
    autoLoadable: true,
    libraryType: "experiencia_constructor",
  },
  {
    value: "matricula_disenador",
    label: "Matrícula del Diseñador",
    autoLoadable: true,
    libraryType: "matricula_disenador",
  },
  {
    value: "memoria_calculo",
    label: "Memoria de Cálculo",
    autoLoadable: false,
  },
  {
    value: "disponibilidad_red",
    label: "Disponibilidad de la Red",
    autoLoadable: false,
  },
  {
    value: "otros",
    label: "Otros Documentos",
    autoLoadable: false,
  },
];

export default function LegalizationChecklist({
  projectId,
}: LegalizationChecklistProps) {
  const utils = trpc.useUtils();

  // Query para obtener checklist
  const { data: checklist, isLoading } =
    trpc.legalizationChecklist.get.useQuery({ projectId });

  // Mutation para inicializar checklist
  const initializeMutation = trpc.legalizationChecklist.initialize.useMutation({
    onSuccess: () => {
      toast.success("Checklist inicializado");
      utils.legalizationChecklist.get.invalidate({ projectId });
    },
    onError: () => {
      toast.error("Error al inicializar checklist");
    },
  });

  // Mutation para actualizar item
  const upsertMutation = trpc.legalizationChecklist.upsert.useMutation({
    onSuccess: () => {
      toast.success("Documento actualizado");
      utils.legalizationChecklist.get.invalidate({ projectId });
    },
    onError: () => {
      toast.error("Error al actualizar documento");
    },
  });

  // Inicializar checklist si está vacío
  useEffect(() => {
    if (checklist && checklist.length === 0) {
      initializeMutation.mutate({ projectId });
    }
  }, [checklist]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const completedCount = checklist?.filter((item) => item.isCompleted).length || 0;
  const totalCount = checklist?.length || 0;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trámites y Legalización</CardTitle>
            <CardDescription>
              Documentos requeridos para UPME, Operador de Red y RETIE
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
              {completedCount}/{totalCount} Completados
            </Badge>
            <DownloadAllButton projectId={projectId} checklist={checklist || []} />
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {DOCUMENT_TYPES.map((docType) => {
            const item = checklist?.find(
              (c) => c.documentType === docType.value
            );
            // Solo mostrar si el item existe en el checklist (no fue eliminado)
            if (!item) return null;
            return (
              <ChecklistItem
                key={docType.value}
                projectId={projectId}
                docType={docType}
                item={item}
                onUpdate={() =>
                  utils.legalizationChecklist.get.invalidate({ projectId })
                }
              />
            );
          })}
        </div>
      </CardContent>

      {/* Sección de Documentos Dinámicos */}
      <DynamicDocumentsSection projectId={projectId} />
    </Card>
  );
}

interface ChecklistItemProps {
  projectId: number;
  docType: {
    value: string;
    label: string;
    autoLoadable: boolean;
    libraryType?: string;
  };
  item?: any;
  onUpdate: () => void;
}

function ChecklistItem({ projectId, docType, item, onUpdate }: ChecklistItemProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [autoLoadDialogOpen, setAutoLoadDialogOpen] = useState(false);

  const deleteMutation = trpc.legalizationChecklist.delete.useMutation({
    onSuccess: () => {
      toast.success(`"${docType.label}" eliminado del checklist`);
      onUpdate();
    },
    onError: () => {
      toast.error("Error al eliminar del checklist");
    },
  });

  const handleDelete = () => {
    if (!item?.id) return;
    if (!confirm(`¿Eliminar "${docType.label}" del checklist? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate({ id: item.id });
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 flex-1">
        {item?.isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className="font-medium text-sm">{docType.label}</p>
          {item?.fileName && (
            <p className="text-xs text-muted-foreground">
              {item.fileName}
              {item.autoLoaded && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Auto
                </Badge>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item?.fileUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(item.fileUrl, "_blank")}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
        {docType.autoLoadable && (
          <AutoLoadButton
            projectId={projectId}
            documentType={docType.value}
            libraryType={docType.libraryType!}
            onUpdate={onUpdate}
          />
        )}
        <ManualUploadButton
          projectId={projectId}
          documentType={docType.value}
          documentLabel={docType.label}
          onUpdate={onUpdate}
        />
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          title="Eliminar del checklist"
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Botón para carga automática desde biblioteca
function AutoLoadButton({
  projectId,
  documentType,
  libraryType,
  onUpdate,
}: {
  projectId: number;
  documentType: string;
  libraryType: string;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string>("");

  // Query para obtener documentos de la biblioteca
  const { data: commonDocs } = trpc.commonDocuments.list.useQuery({
    tipo: libraryType,
  });

  const upsertMutation = trpc.legalizationChecklist.upsert.useMutation({
    onSuccess: () => {
      toast.success("Documento cargado automáticamente");
      setOpen(false);
      onUpdate();
    },
    onError: () => {
      toast.error("Error al cargar documento");
    },
  });

  const handleAutoLoad = () => {
    if (!selectedDoc) {
      toast.error("Selecciona un documento");
      return;
    }

    const doc = commonDocs?.find((d) => d.id.toString() === selectedDoc);
    if (!doc) return;

    upsertMutation.mutate({
      projectId,
      documentType: documentType as any,
      fileName: doc.fileName,
      fileKey: doc.fileKey,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      isCompleted: true,
      autoLoaded: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Package className="h-4 w-4 mr-1" />
          Auto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar desde Biblioteca</DialogTitle>
          <DialogDescription>
            Selecciona un documento de la biblioteca común
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {commonDocs && commonDocs.length > 0 ? (
            <>
              <Label>Documento</Label>
              <Select value={selectedDoc} onValueChange={setSelectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un documento" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {commonDocs.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{doc.fileName}</span>
                        {(doc.marca || doc.modelo) && (
                          <span className="text-xs text-muted-foreground">
                            {doc.marca} {doc.modelo}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay documentos de este tipo en la biblioteca. Ve a Trámites y
              Diseño para subir documentos comunes.
            </p>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleAutoLoad}
            disabled={!selectedDoc || upsertMutation.isPending}
            className="w-full sm:w-auto"
          >
            {upsertMutation.isPending ? "Cargando..." : "Cargar Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Botón para carga manual
function ManualUploadButton({
  projectId,
  documentType,
  documentLabel,
  onUpdate,
}: {
  projectId: number;
  documentType: string;
  documentLabel: string;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const upsertMutation = trpc.legalizationChecklist.upsert.useMutation({
    onSuccess: () => {
      toast.success("Documento subido exitosamente");
      setOpen(false);
      setFile(null);
      onUpdate();
    },
    onError: () => {
      toast.error("Error al subir documento");
    },
  });

  const handleUpload = () => {
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(",")[1];

      upsertMutation.mutate({
        projectId,
        documentType: documentType as any,
        fileName: file.name,
        fileKey: `legalization/${projectId}/${Date.now()}-${file.name}`,
        fileData,
        fileSize: file.size,
        mimeType: file.type,
        isCompleted: true,
        autoLoaded: false,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir {documentLabel}</DialogTitle>
          <DialogDescription>
            Sube el archivo manualmente desde tu computadora
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Archivo</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || upsertMutation.isPending}
          >
            {upsertMutation.isPending ? "Subiendo..." : "Subir Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Botón para descargar todos los archivos en ZIP
function DownloadAllButton({
  projectId,
  checklist,
}: {
  projectId: number;
  checklist: any[];
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = async () => {
    const completedDocs = checklist.filter(
      (item) => item.isCompleted && item.fileUrl
    );

    if (completedDocs.length === 0) {
      toast.error("No hay documentos para descargar");
      return;
    }

    setIsDownloading(true);
    toast.info("Preparando descarga...");

    try {
      // Importar JSZip dinámicamente
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Descargar cada archivo y agregarlo al ZIP
      for (const doc of completedDocs) {
        try {
          const response = await fetch(doc.fileUrl);
          const blob = await response.blob();
          const docTypeName = DOCUMENT_TYPES.find(
            (t) => t.value === doc.documentType
          )?.label || doc.documentType;
          zip.file(`${docTypeName} - ${doc.fileName}`, blob);
        } catch (error) {
          console.error(`Error descargando ${doc.fileName}:`, error);
        }
      }

      // Generar ZIP y descargar
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proyecto-${projectId}-legalizacion.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Archivos descargados exitosamente");
    } catch (error) {
      console.error("Error generando ZIP:", error);
      toast.error("Error al generar archivo ZIP");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownloadAll}
      disabled={isDownloading}
      variant="default"
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Descargando...
        </>
      ) : (
        <>
          <Package className="mr-2 h-4 w-4" />
          Descargar Todo (ZIP)
        </>
      )}
    </Button>
  );
}


// ==========================================
// Sección de Documentos Dinámicos en Legalización
// ==========================================
function DynamicDocumentsSection({ projectId }: { projectId: number }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: templates } = trpc.dynamicDocuments.listTemplates.useQuery({});
  const { data: generatedDocs } = trpc.dynamicDocuments.getGeneratedDocs.useQuery({ projectId });

  const deleteGenDocMutation = trpc.dynamicDocuments.deleteGeneratedDoc.useMutation({
    onSuccess: () => {
      toast.success("Documento eliminado");
      utils.dynamicDocuments.getGeneratedDocs.invalidate({ projectId });
    },
    onError: () => {
      toast.error("Error al eliminar documento");
    },
  });

  if (!templates || templates.length === 0) return null;

  return (
    <>
      <CardHeader className="border-t">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-orange-500" />
            Documentos Dinámicos
          </CardTitle>
          <CardDescription>
            Genera documentos personalizados a partir de plantillas con campos dinámicos
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templates.map((template) => {
            // Buscar documentos generados para esta plantilla
            const templateGenDocs = generatedDocs?.filter((d) => d.templateId === template.id) || [];
            return (
              <div key={template.id} className="space-y-1">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <FileEdit className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {templateGenDocs.length > 0 && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                        <FileCheck className="h-3 w-3 mr-1" />
                        {templateGenDocs.length} generado{templateGenDocs.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Generar
                    </Button>
                  </div>
                </div>

                {/* Mostrar documentos generados debajo de la plantilla */}
                {templateGenDocs.map((genDoc) => (
                  <div
                    key={genDoc.id}
                    className="flex items-center justify-between p-2 pl-10 border rounded-lg bg-green-500/5 border-green-500/20"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <FileCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{genDoc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          Generado el {new Date(genDoc.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(genDoc.fileUrl, "_blank")}
                        title="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = genDoc.fileUrl;
                          a.download = genDoc.fileName;
                          a.click();
                        }}
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => {
                          if (confirm("¿Eliminar este documento generado?")) {
                            deleteGenDocMutation.mutate({ id: genDoc.id });
                          }
                        }}
                        disabled={deleteGenDocMutation.isPending}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>

      {selectedTemplateId && (
        <GenerateDynamicDocDialog
          templateId={selectedTemplateId}
          projectId={projectId}
          open={!!selectedTemplateId}
          onOpenChange={(open) => {
            if (!open) setSelectedTemplateId(null);
          }}
        />
      )}
    </>
  );
}

// ==========================================
// Dialog: Generar Documento Dinámico
// ==========================================
function GenerateDynamicDocDialog({
  templateId,
  projectId,
  open,
  onOpenChange,
}: {
  templateId: number;
  projectId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: template } = trpc.dynamicDocuments.getTemplate.useQuery(
    { id: templateId },
    { enabled: open }
  );

  // Get project data for auto-fill
  const { data: project } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: open }
  );

  // Auto-fill project-mapped fields when template and project data load
  useEffect(() => {
    if (template?.fields && project) {
      const autoValues: Record<string, string> = {};
      for (const field of template.fields) {
        if (field.fieldType === "project" && field.projectMapping) {
          const mapping = field.projectMapping;
          const projectData = project as Record<string, any>;
          if (projectData[mapping]) {
            autoValues[field.fieldKey] = String(projectData[mapping]);
          }
        } else if (field.defaultValue) {
          autoValues[field.fieldKey] = field.defaultValue;
        }
      }
      setFieldValues((prev) => ({ ...autoValues, ...prev }));
    }
  }, [template?.fields, project]);

  const utils = trpc.useUtils();

  const generateMutation = trpc.dynamicDocuments.generateDocument.useMutation({
    onSuccess: (result) => {
      toast.success("Documento generado exitosamente. Queda cargado en la sección.");
      // Invalidar la lista de documentos generados para que aparezca el nuevo
      utils.dynamicDocuments.getGeneratedDocs.invalidate({ projectId });
      onOpenChange(false);
      setFieldValues({});
    },
    onError: (err) => {
      toast.error(err.message || "Error al generar documento");
    },
  });

  const handleGenerate = () => {
    // Validate required fields
    if (template?.fields) {
      for (const field of template.fields) {
        if (field.isRequired && !fieldValues[field.fieldKey]) {
          toast.error(`El campo "${field.fieldLabel}" es obligatorio`);
          return;
        }
      }
    }

    generateMutation.mutate({
      templateId,
      projectId,
      fieldValues,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar: {template?.name}</DialogTitle>
          <DialogDescription>
            Completa los campos dinámicos para generar el documento personalizado.
            Los campos con datos del proyecto se rellenan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {template?.fields && template.fields.length > 0 ? (
            template.fields
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((field) => (
                <div key={field.fieldKey}>
                  <Label className="text-sm">
                    {field.fieldLabel}
                    {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                    {field.fieldType === "project" && (
                      <Badge variant="outline" className="ml-2 text-xs">Auto</Badge>
                    )}
                  </Label>
                  {field.fieldType === "select" && field.options ? (
                    <Select
                      value={fieldValues[field.fieldKey] || ""}
                      onValueChange={(v) =>
                        setFieldValues({ ...fieldValues, [field.fieldKey]: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.split(",").map((opt) => (
                          <SelectItem key={opt.trim()} value={opt.trim()}>
                            {opt.trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.fieldType === "date" ? (
                    <Input
                      type="date"
                      value={fieldValues[field.fieldKey] || ""}
                      onChange={(e) =>
                        setFieldValues({ ...fieldValues, [field.fieldKey]: e.target.value })
                      }
                    />
                  ) : field.fieldType === "number" ? (
                    <Input
                      type="number"
                      value={fieldValues[field.fieldKey] || ""}
                      onChange={(e) =>
                        setFieldValues({ ...fieldValues, [field.fieldKey]: e.target.value })
                      }
                      placeholder={field.defaultValue || ""}
                    />
                  ) : (
                    <Input
                      value={fieldValues[field.fieldKey] || ""}
                      onChange={(e) =>
                        setFieldValues({ ...fieldValues, [field.fieldKey]: e.target.value })
                      }
                      placeholder={field.defaultValue || `Ingresa ${field.fieldLabel.toLowerCase()}`}
                    />
                  )}
                </div>
              ))
          ) : (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>No hay campos configurados para esta plantilla.</p>
              <p className="text-xs mt-1">
                Ve a Trámites y Diseño {">"} Docs Dinámicos {">"} Campos para configurarlos.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !template?.fields?.length}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Generar Documento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
