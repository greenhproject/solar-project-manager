import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, Upload, Loader2, Globe, Phone, Mail, MapPin, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CompanySettings() {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Query para obtener configuración actual
  const { data: settings, isLoading } = trpc.system.getCompanySettings.useQuery();

  // Estados del formulario
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [nit, setNit] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar datos cuando lleguen
  useState(() => {
    if (settings) {
      setCompanyName(settings.companyName || "");
      setAddress(settings.address || "");
      setNit(settings.nit || "");
      setWebsite(settings.website || "");
      setPhone(settings.phone || "");
      setEmail(settings.email || "");
      setLogoUrl(settings.logoUrl || "");
      setLogoKey(settings.logoKey || "");
    }
  });

  // Efecto para cargar datos cuando settings cambie
  if (settings && !hasChanges && companyName !== settings.companyName) {
    setCompanyName(settings.companyName || "");
    setAddress(settings.address || "");
    setNit(settings.nit || "");
    setWebsite(settings.website || "");
    setPhone(settings.phone || "");
    setEmail(settings.email || "");
    setLogoUrl(settings.logoUrl || "");
    setLogoKey(settings.logoKey || "");
  }

  // Mutations
  const updateSettings = trpc.system.updateCompanySettings.useMutation({
    onSuccess: () => {
      utils.system.getCompanySettings.invalidate();
      setHasChanges(false);
      toast.success("Configuración de empresa guardada exitosamente");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const uploadLogo = trpc.system.uploadCompanyLogo.useMutation({
    onSuccess: (data) => {
      setLogoUrl(data.logoUrl);
      setLogoKey(data.logoKey);
      
      // Guardar automáticamente la configuración con el nuevo logo
      updateSettings.mutate({
        companyName: companyName || settings?.companyName || "Mi Empresa",
        address,
        nit,
        website,
        phone,
        email,
        logoUrl: data.logoUrl,
        logoKey: data.logoKey,
      });
      
      toast.success("Logo subido y guardado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Solo se permiten archivos PNG o JPG");
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo no puede superar 2MB");
      return;
    }

    setIsUploading(true);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogo.mutate({
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!companyName.trim()) {
      toast.error("El nombre de la empresa es requerido");
      return;
    }

    updateSettings.mutate({
      companyName,
      address,
      nit,
      website,
      phone,
      email,
      logoUrl,
      logoKey,
    });
  };

  const handleInputChange = (setter: (value: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setter(e.target.value);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Datos de la Empresa</CardTitle>
            <CardDescription>
              Esta información aparecerá en los encabezados de reportes PDF y Excel
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo de la empresa */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-2 border-dashed border-muted-foreground/25">
              <AvatarImage src={logoUrl} alt="Logo de la empresa" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {companyName ? companyName.charAt(0).toUpperCase() : "E"}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Logo de la Empresa</p>
            <p className="text-xs text-muted-foreground">
              Formatos: PNG, JPG. Máximo 2MB
            </p>
            <p className="text-xs text-muted-foreground">
              Recomendado: 200x200px o mayor
            </p>
          </div>
        </div>

        {/* Nombre de la empresa */}
        <div className="space-y-2">
          <Label htmlFor="companyName" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Nombre de la Empresa *
          </Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={handleInputChange(setCompanyName)}
            placeholder="ej: GreenH Project S.A.S."
          />
        </div>

        {/* NIT */}
        <div className="space-y-2">
          <Label htmlFor="nit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            NIT
          </Label>
          <Input
            id="nit"
            value={nit}
            onChange={handleInputChange(setNit)}
            placeholder="ej: 900.123.456-7"
          />
        </div>

        {/* Dirección */}
        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Dirección
          </Label>
          <Textarea
            id="address"
            value={address}
            onChange={handleInputChange(setAddress)}
            placeholder="ej: Calle 123 #45-67, Bogotá, Colombia"
            rows={2}
          />
        </div>

        {/* Teléfono y Email en grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={handleInputChange(setPhone)}
              placeholder="ej: +57 300 123 4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleInputChange(setEmail)}
              placeholder="ej: contacto@empresa.com"
            />
          </div>
        </div>

        {/* Página web */}
        <div className="space-y-2">
          <Label htmlFor="website" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Página Web
          </Label>
          <Input
            id="website"
            value={website}
            onChange={handleInputChange(setWebsite)}
            placeholder="ej: https://www.empresa.com"
          />
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending || !hasChanges}
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </div>

        {/* Preview de cómo se verá en reportes */}
        {(companyName || logoUrl) && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-3">
              Vista previa del encabezado de reportes:
            </p>
            <div className="flex items-center gap-4 p-4 bg-background rounded border">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 object-contain"
                />
              )}
              <div className="flex-1">
                <p className="font-semibold text-lg">{companyName || "Nombre de la Empresa"}</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {nit && <p>NIT: {nit}</p>}
                  {address && <p>{address}</p>}
                  <div className="flex gap-4">
                    {phone && <span>{phone}</span>}
                    {email && <span>{email}</span>}
                  </div>
                  {website && <p>{website}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
