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
} from "lucide-react";
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
    label: "Matrícula Inversor",
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
  const totalCount = DOCUMENT_TYPES.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

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

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
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
      <DialogContent>
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
                <SelectContent>
                  {commonDocs.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      {doc.fileName}
                      {doc.marca && ` - ${doc.marca}`}
                      {doc.modelo && ` ${doc.modelo}`}
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAutoLoad}
            disabled={!selectedDoc || upsertMutation.isPending}
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
