import { useState, useEffect } from "react";
import { VisualFieldEditor } from "@/components/VisualFieldEditor";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Filter,
  FileCode,
  FileCheck,
  Plus,
  FileEdit,
  Settings2,
  Eye,
  GripVertical,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TramitesYDiseno() {
  // Usar trpc.auth.me para obtener el usuario real del backend
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  
  const utils = trpc.useUtils();

  // Estado para filtros de plantillas CAD
  const [cadFilters, setCadFilters] = useState({
    marcaInversor: "",
    potenciaInversor: "",
    operadorRed: "",
    cantidadPaneles: undefined as number | undefined,
    potenciaPaneles: "",
    marcaPaneles: "",
  });

  // Estado para filtros de documentos comunes
  const [docFilters, setDocFilters] = useState({
    tipo: "",
    marca: "",
    modelo: "",
    potencia: "",
  });

  // Queries - solo ejecutar cuando el usuario esté autenticado
  const isReady = !!user;
  
  const { data: cadTemplates, isLoading: loadingCAD } =
    trpc.cadTemplates.list.useQuery(cadFilters, {
      enabled: isReady,
    });
  const { data: commonDocs, isLoading: loadingDocs } =
    trpc.commonDocuments.list.useQuery(docFilters, {
      enabled: isReady,
    });

  // Mutations
  const deleteCadMutation = trpc.cadTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Plantilla CAD eliminada");
      utils.cadTemplates.list.invalidate();
    },
    onError: () => {
      toast.error("Error al eliminar plantilla CAD");
    },
  });

  const deleteDocMutation = trpc.commonDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento eliminado");
      utils.commonDocuments.list.invalidate();
    },
    onError: () => {
      toast.error("Error al eliminar documento");
    },
  });

  // Mostrar loading mientras se verifica la autenticación
  if (meQuery.isLoading || !user) {
    return (
      <div className="container py-4 sm:py-6 lg:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Cargando...</CardTitle>
            <CardDescription>
              Verificando autenticación...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // Verificar permisos
  if (user?.role !== "admin" && user?.role !== "ingeniero_tramites") {
    return (
      <div className="container py-4 sm:py-6 lg:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Denegado</CardTitle>
            <CardDescription>
              Solo administradores e ingenieros de trámites pueden acceder a
              este módulo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-6 lg:py-8">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
          Trámites y Diseño
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de plantillas CAD y documentos comunes para legalización.
        </p>
      </div>

      <Tabs defaultValue="cad" className="w-full">
        <TabsList className="flex w-full max-w-lg overflow-x-auto">
          <TabsTrigger value="cad" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">
            <FileCode className="mr-1 sm:mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">Plantillas CAD</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">
            <FileCheck className="mr-1 sm:mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">Docs Comunes</span>
          </TabsTrigger>
          <TabsTrigger value="dynamic" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-3">
            <FileEdit className="mr-1 sm:mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">Docs Dinámicos</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Plantillas CAD */}
        <TabsContent value="cad" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Plantillas CAD</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Biblioteca de planos prediseñados para agilizar el diseño
                  </CardDescription>
                </div>
                <UploadCADDialog />
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <h3 className="font-semibold">Filtros de Búsqueda</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Marca Inversor</Label>
                    <Input
                      placeholder="Ej: Huawei, Fronius"
                      value={cadFilters.marcaInversor}
                      onChange={(e) =>
                        setCadFilters({
                          ...cadFilters,
                          marcaInversor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Potencia Inversor</Label>
                    <Input
                      placeholder="Ej: 5kW, 10kW"
                      value={cadFilters.potenciaInversor}
                      onChange={(e) =>
                        setCadFilters({
                          ...cadFilters,
                          potenciaInversor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Operador de Red</Label>
                    <Input
                      placeholder="Ej: ENEL, EPM"
                      value={cadFilters.operadorRed}
                      onChange={(e) =>
                        setCadFilters({
                          ...cadFilters,
                          operadorRed: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setCadFilters({
                      marcaInversor: "",
                      potenciaInversor: "",
                      operadorRed: "",
                      cantidadPaneles: undefined,
                      potenciaPaneles: "",
                      marcaPaneles: "",
                    })
                  }
                >
                  Limpiar Filtros
                </Button>
              </div>

              {/* Lista de plantillas */}
              {loadingCAD ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando plantillas...
                </div>
              ) : cadTemplates && cadTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cadTemplates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileCode className="h-4 w-4" />
                          {template.fileName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {template.marcaInversor} •{" "}
                          {template.potenciaInversor || "N/A"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm space-y-1">
                          {template.operadorRed && (
                            <p>
                              <span className="font-medium">Operador:</span>{" "}
                              {template.operadorRed}
                            </p>
                          )}
                          {template.cantidadPaneles && (
                            <p>
                              <span className="font-medium">Paneles:</span>{" "}
                              {template.cantidadPaneles} x{" "}
                              {template.potenciaPaneles || "N/A"}
                            </p>
                          )}
                          {template.descripcion && (
                            <p className="text-muted-foreground">
                              {template.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(template.fileUrl, "_blank")}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              deleteCadMutation.mutate({ id: template.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron plantillas CAD con los filtros aplicados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Documentos Comunes */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Documentos Comunes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Biblioteca de certificados, manuales y matrículas
                  </CardDescription>
                </div>
                <UploadCommonDocDialog />
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <h3 className="font-semibold">Filtros de Búsqueda</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={docFilters.tipo}
                      onValueChange={(value) =>
                        setDocFilters({ ...docFilters, tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="certificado_inversor">
                          Certificado Inversor
                        </SelectItem>
                        <SelectItem value="certificado_paneles">
                          Certificado Paneles
                        </SelectItem>
                        <SelectItem value="manual_inversor">
                          Manual Inversor
                        </SelectItem>
                        <SelectItem value="matricula_constructor">
                          Matrícula Constructor
                        </SelectItem>
                        <SelectItem value="matricula_disenador">
                          Matrícula Diseñador
                        </SelectItem>
                        <SelectItem value="experiencia_constructor">
                          Experiencia Constructor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input
                      placeholder="Ej: Huawei, JA Solar"
                      value={docFilters.marca}
                      onChange={(e) =>
                        setDocFilters({ ...docFilters, marca: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setDocFilters({
                      tipo: "",
                      marca: "",
                      modelo: "",
                      potencia: "",
                    })
                  }
                >
                  Limpiar Filtros
                </Button>
              </div>

              {/* Lista de documentos */}
              {loadingDocs ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando documentos...
                </div>
              ) : commonDocs && commonDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {commonDocs.map((doc) => (
                    <Card key={doc.id}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {doc.fileName}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {doc.tipo.replace(/_/g, " ").toUpperCase()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm space-y-1">
                          {doc.marca && (
                            <p>
                              <span className="font-medium">Marca:</span>{" "}
                              {doc.marca}
                            </p>
                          )}
                          {doc.modelo && (
                            <p>
                              <span className="font-medium">Modelo:</span>{" "}
                              {doc.modelo}
                            </p>
                          )}
                          {doc.potencia && (
                            <p>
                              <span className="font-medium">Potencia:</span>{" "}
                              {doc.potencia}
                            </p>
                          )}
                          {doc.descripcion && (
                            <p className="text-muted-foreground">
                              {doc.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              deleteDocMutation.mutate({ id: doc.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron documentos con los filtros aplicados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* TAB: Documentos Dinámicos */}
        <TabsContent value="dynamic" className="space-y-4">
          <DynamicDocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Dialog para subir plantilla CAD
function UploadCADDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    marcaInversor: "",
    modeloInversor: "",
    potenciaInversor: "",
    operadorRed: "",
    cantidadPaneles: "",
    potenciaPaneles: "",
    marcaPaneles: "",
    descripcion: "",
  });

  const utils = trpc.useUtils();
  const uploadMutation = trpc.cadTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Plantilla CAD subida exitosamente");
      setOpen(false);
      setFile(null);
      setFormData({
        marcaInversor: "",
        modeloInversor: "",
        potenciaInversor: "",
        operadorRed: "",
        cantidadPaneles: "",
        potenciaPaneles: "",
        marcaPaneles: "",
        descripcion: "",
      });
      utils.cadTemplates.list.invalidate();
    },
    onError: () => {
      toast.error("Error al subir plantilla CAD");
    },
  });

  const handleSubmit = async () => {
    if (!file || !formData.marcaInversor) {
      toast.error("Archivo y marca de inversor son requeridos");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(",")[1];

      uploadMutation.mutate({
        fileName: file.name,
        fileKey: `cad-templates/${Date.now()}-${file.name}`,
        fileData,
        fileSize: file.size,
        marcaInversor: formData.marcaInversor,
        modeloInversor: formData.modeloInversor || undefined,
        potenciaInversor: formData.potenciaInversor || undefined,
        operadorRed: formData.operadorRed || undefined,
        cantidadPaneles: formData.cantidadPaneles
          ? parseInt(formData.cantidadPaneles)
          : undefined,
        potenciaPaneles: formData.potenciaPaneles || undefined,
        marcaPaneles: formData.marcaPaneles || undefined,
        descripcion: formData.descripcion || undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Subir Plantilla CAD
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir Plantilla CAD</DialogTitle>
          <DialogDescription>
            Sube un archivo CAD con sus especificaciones técnicas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Archivo CAD *</Label>
            <Input
              type="file"
              accept=".dwg,.dxf,.dwf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Marca Inversor *</Label>
              <Input
                value={formData.marcaInversor}
                onChange={(e) =>
                  setFormData({ ...formData, marcaInversor: e.target.value })
                }
                placeholder="Ej: Huawei"
              />
            </div>
            <div>
              <Label>Modelo Inversor</Label>
              <Input
                value={formData.modeloInversor}
                onChange={(e) =>
                  setFormData({ ...formData, modeloInversor: e.target.value })
                }
                placeholder="Ej: SUN2000-5KTL"
              />
            </div>
            <div>
              <Label>Potencia Inversor</Label>
              <Input
                value={formData.potenciaInversor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    potenciaInversor: e.target.value,
                  })
                }
                placeholder="Ej: 5kW"
              />
            </div>
            <div>
              <Label>Operador de Red</Label>
              <Input
                value={formData.operadorRed}
                onChange={(e) =>
                  setFormData({ ...formData, operadorRed: e.target.value })
                }
                placeholder="Ej: ENEL"
              />
            </div>
            <div>
              <Label>Cantidad de Paneles</Label>
              <Input
                type="number"
                value={formData.cantidadPaneles}
                onChange={(e) =>
                  setFormData({ ...formData, cantidadPaneles: e.target.value })
                }
                placeholder="Ej: 12"
              />
            </div>
            <div>
              <Label>Potencia Paneles</Label>
              <Input
                value={formData.potenciaPaneles}
                onChange={(e) =>
                  setFormData({ ...formData, potenciaPaneles: e.target.value })
                }
                placeholder="Ej: 450W"
              />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Descripción adicional de la plantilla..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Subiendo..." : "Subir Plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dialog para subir documento común
function UploadCommonDocDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    tipo: "",
    marca: "",
    modelo: "",
    potencia: "",
    descripcion: "",
  });

  const utils = trpc.useUtils();
  const uploadMutation = trpc.commonDocuments.create.useMutation({
    onSuccess: () => {
      toast.success("Documento subido exitosamente");
      setOpen(false);
      setFile(null);
      setFormData({
        tipo: "",
        marca: "",
        modelo: "",
        potencia: "",
        descripcion: "",
      });
      utils.commonDocuments.list.invalidate();
    },
    onError: () => {
      toast.error("Error al subir documento");
    },
  });

  const handleSubmit = async () => {
    if (!file || !formData.tipo) {
      toast.error("Archivo y tipo de documento son requeridos");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(",")[1];

      uploadMutation.mutate({
        tipo: formData.tipo as any,
        fileName: file.name,
        fileKey: `common-documents/${Date.now()}-${file.name}`,
        fileData,
        fileSize: file.size,
        mimeType: file.type,
        marca: formData.marca || undefined,
        modelo: formData.modelo || undefined,
        potencia: formData.potencia || undefined,
        descripcion: formData.descripcion || undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Subir Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Subir Documento Común</DialogTitle>
          <DialogDescription>
            Sube un certificado, manual o matrícula a la biblioteca
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Documento *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) =>
                setFormData({ ...formData, tipo: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="certificado_inversor">
                  Certificado Inversor
                </SelectItem>
                <SelectItem value="certificado_paneles">
                  Certificado Paneles
                </SelectItem>
                <SelectItem value="manual_inversor">Manual Inversor</SelectItem>
                <SelectItem value="matricula_constructor">
                  Matrícula Constructor
                </SelectItem>
                <SelectItem value="matricula_disenador">
                  Matrícula Diseñador
                </SelectItem>
                <SelectItem value="experiencia_constructor">
                  Experiencia Constructor
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Archivo *</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Marca</Label>
              <Input
                value={formData.marca}
                onChange={(e) =>
                  setFormData({ ...formData, marca: e.target.value })
                }
                placeholder="Ej: Huawei, JA Solar"
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={formData.modelo}
                onChange={(e) =>
                  setFormData({ ...formData, modelo: e.target.value })
                }
                placeholder="Ej: SUN2000-5KTL"
              />
            </div>
          </div>
          <div>
            <Label>Potencia</Label>
            <Input
              value={formData.potencia}
              onChange={(e) =>
                setFormData({ ...formData, potencia: e.target.value })
              }
              placeholder="Ej: 5kW, 450W"
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Descripción adicional del documento..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Subiendo..." : "Subir Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ==========================================
// Tab: Documentos Dinámicos
// ==========================================
function DynamicDocumentsTab() {
  const utils = trpc.useUtils();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: templates, isLoading } = trpc.dynamicDocuments.listTemplates.useQuery({});

  const deleteMutation = trpc.dynamicDocuments.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Plantilla eliminada");
      utils.dynamicDocuments.listTemplates.invalidate();
    },
    onError: () => toast.error("Error al eliminar plantilla"),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Documentos Dinámicos</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Sube plantillas Word con campos dinámicos tipo {"{{nombre}}"}, {"{{cedula}}"}, etc. para generar documentos personalizados por proyecto.
            </CardDescription>
          </div>
          <Button onClick={() => setShowUpload(true)} className="w-full sm:w-auto shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando plantillas...</div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted/30 rounded-lg border gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileEdit className="h-8 w-8 text-orange-500 dark:text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="font-semibold truncate">{template.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {template.description || template.fileName}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {template.category && (
                        <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {template.mimeType.includes("word") ? "Word" : "PDF"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setShowFieldEditor(true);
                    }}
                  >
                    <Settings2 className="mr-1 h-4 w-4" />
                    Campos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar esta plantilla?")) {
                        deleteMutation.mutate({ id: template.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileEdit className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No hay plantillas dinámicas</p>
            <p className="text-sm mt-1">
              Sube una plantilla Word (.docx) con campos como {"{{nombre}}"}, {"{{cedula}}"} para empezar.
            </p>
          </div>
        )}
      </CardContent>

      {/* Dialog: Subir nueva plantilla */}
      <UploadDynamicTemplateDialog open={showUpload} onOpenChange={setShowUpload} />

      {/* Dialog: Editor Visual de Campos Dinámicos */}
      {selectedTemplate && showFieldEditor && (
        <VisualFieldEditor
          templateId={selectedTemplate}
          open={showFieldEditor}
          onOpenChange={(open) => {
            setShowFieldEditor(open);
            if (!open) setSelectedTemplate(null);
          }}
        />
      )}

      {/* Dialog: Vista previa del documento */}
      {selectedTemplate && showPreview && (
        <DocumentPreviewDialog
          templateId={selectedTemplate}
          templateName={templates?.find((t) => t.id === selectedTemplate)?.name || ""}
          fileUrl={templates?.find((t) => t.id === selectedTemplate)?.fileUrl || ""}
          open={showPreview}
          onOpenChange={(open) => {
            setShowPreview(open);
            if (!open) setSelectedTemplate(null);
          }}
        />
      )}
    </Card>
  );
}

// ==========================================
// Dialog: Subir Plantilla Dinámica
// ==========================================
function UploadDynamicTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const utils = trpc.useUtils();
  const uploadMutation = trpc.dynamicDocuments.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Plantilla dinámica subida exitosamente");
      onOpenChange(false);
      setFile(null);
      setName("");
      setDescription("");
      setCategory("");
      utils.dynamicDocuments.listTemplates.invalidate();
    },
    onError: (err) => toast.error(err.message || "Error al subir plantilla"),
  });

  const handleSubmit = async () => {
    if (!file || !name) {
      toast.error("Nombre y archivo son requeridos");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(",")[1];

      uploadMutation.mutate({
        name,
        description: description || undefined,
        category: category || undefined,
        fileName: file.name,
        fileKey: `dynamic-templates/${Date.now()}-${file.name}`,
        fileData,
        fileSize: file.size,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir Plantilla Dinámica</DialogTitle>
          <DialogDescription>
            Sube un archivo Word (.docx) con campos dinámicos usando la sintaxis {"{{campo}}"}.
            Ejemplo: {"{{nombre_cliente}}"}, {"{{cedula}}"}, {"{{direccion}}"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre de la plantilla *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carta de autorización RETIE"
            />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tramites">Trámites</SelectItem>
                <SelectItem value="legalizacion">Legalización</SelectItem>
                <SelectItem value="contratos">Contratos</SelectItem>
                <SelectItem value="autorizaciones">Autorizaciones</SelectItem>
                <SelectItem value="certificados">Certificados</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción de la plantilla y su uso..."
            />
          </div>
          <div>
            <Label>Archivo Word (.docx) *</Label>
            <Input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usa {"{{campo}}"} en el documento para los campos dinámicos. Ej: {"{{nombre_cliente}}"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? "Subiendo..." : "Subir Plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Dialog: Editor de Campos Dinámicos
// ==========================================
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

function FieldEditorDialog({ templateId, open, onOpenChange }: { templateId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const utils = trpc.useUtils();
  const { data: template } = trpc.dynamicDocuments.getTemplate.useQuery(
    { id: templateId },
    { enabled: open }
  );

  const [fields, setFields] = useState<DynamicField[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

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

  const saveMutation = trpc.dynamicDocuments.saveFields.useMutation({
    onSuccess: () => {
      toast.success("Campos guardados exitosamente");
      setHasChanges(false);
      utils.dynamicDocuments.getTemplate.invalidate({ id: templateId });
    },
    onError: (err) => toast.error(err.message || "Error al guardar campos"),
  });

  const addField = () => {
    setFields([
      ...fields,
      {
        fieldKey: "",
        fieldLabel: "",
        fieldType: "text",
        orderIndex: fields.length,
        isRequired: true,
      },
    ]);
    setHasChanges(true);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateField = (index: number, updates: Partial<DynamicField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    // Auto-generate fieldKey from fieldLabel
    if (updates.fieldLabel && !newFields[index].fieldKey) {
      newFields[index].fieldKey = updates.fieldLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }
    setFields(newFields);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Campos Dinámicos</DialogTitle>
          <DialogDescription>
            {template?.name} — Define los campos que se rellenarán al generar el documento.
            La clave del campo debe coincidir con {"{{clave}}"} en la plantilla Word.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No hay campos configurados. Agrega campos dinámicos.</p>
            </div>
          ) : (
            fields.map((field, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Campo #{index + 1}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeField(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Etiqueta (visible al usuario)</Label>
                    <Input
                      value={field.fieldLabel}
                      onChange={(e) => updateField(index, { fieldLabel: e.target.value })}
                      placeholder="Ej: Nombre del Cliente"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Clave en plantilla {"{{clave}}"}</Label>
                    <Input
                      value={field.fieldKey}
                      onChange={(e) => updateField(index, { fieldKey: e.target.value })}
                      placeholder="Ej: nombre_cliente"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de campo</Label>
                    <Select
                      value={field.fieldType}
                      onValueChange={(v) => updateField(index, { fieldType: v as DynamicField["fieldType"] })}
                    >
                      <SelectTrigger>
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
                  {field.fieldType === "project" && (
                    <div>
                      <Label className="text-xs">Mapeo automático</Label>
                      <Select
                        value={field.projectMapping || ""}
                        onValueChange={(v) => updateField(index, { projectMapping: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona campo del proyecto" />
                        </SelectTrigger>
                        <SelectContent>
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
                      <Label className="text-xs">Opciones (separadas por coma)</Label>
                      <Input
                        value={field.options || ""}
                        onChange={(e) => updateField(index, { options: e.target.value })}
                        placeholder="Ej: Opción 1, Opción 2, Opción 3"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Valor por defecto</Label>
                    <Input
                      value={field.defaultValue || ""}
                      onChange={(e) => updateField(index, { defaultValue: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.isRequired}
                    onChange={(e) => updateField(index, { isRequired: e.target.checked })}
                    className="rounded"
                  />
                  <Label className="text-xs">Campo obligatorio</Label>
                </div>
              </div>
            ))
          )}

          <Button variant="outline" onClick={addField} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Campo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !hasChanges}
          >
            {saveMutation.isPending ? "Guardando..." : "Guardar Campos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
