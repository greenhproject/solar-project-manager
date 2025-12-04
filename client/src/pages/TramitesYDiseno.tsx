import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAuth0Custom } from "@/_core/hooks/useAuth0Custom";
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
} from "lucide-react";
import { toast } from "sonner";

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

export default function TramitesYDiseno() {
  // Usar el sistema de autenticación correcto
  const manusAuth = useAuth();
  const auth0 = useAuth0Custom();
  
  // Seleccionar el sistema correcto según la configuración
  const isUsingAuth0 = isAuth0Configured();
  const user = isUsingAuth0 ? (auth0.user ? {
    id: 0,
    openId: auth0.user.sub || '',
    name: auth0.user.name || '',
    email: auth0.user.email || '',
    role: 'admin' as const, // Por defecto admin para Auth0
    avatarUrl: auth0.user.picture || null,
    createdAt: new Date(),
    lastSignedIn: new Date(),
    theme: 'system' as const,
    password: null,
  } : null) : manusAuth.user;
  
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

  // Queries
  const { data: cadTemplates, isLoading: loadingCAD } =
    trpc.cadTemplates.list.useQuery(cadFilters);
  const { data: commonDocs, isLoading: loadingDocs } =
    trpc.commonDocuments.list.useQuery(docFilters);

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

  // Verificar permisos
  if (user?.role !== "admin" && user?.role !== "ingeniero_tramites") {
    return (
      <div className="container py-8">
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
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
          Trámites y Diseño
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de plantillas CAD y documentos comunes para legalización
        </p>
      </div>

      <Tabs defaultValue="cad" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cad">
            <FileCode className="mr-2 h-4 w-4" />
            Plantillas CAD
          </TabsTrigger>
          <TabsTrigger value="docs">
            <FileCheck className="mr-2 h-4 w-4" />
            Documentos Comunes
          </TabsTrigger>
        </TabsList>

        {/* TAB: Plantillas CAD */}
        <TabsContent value="cad" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plantillas CAD</CardTitle>
                  <CardDescription>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documentos Comunes</CardTitle>
                  <CardDescription>
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
