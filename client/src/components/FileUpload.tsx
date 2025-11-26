import { useState, useCallback } from "react";
import { Upload, X, FileText, Image as ImageIcon, File } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { storagePut } from "../../../server/storage";
import { trpc } from "@/lib/trpc";

interface FileUploadProps {
  projectId: number;
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function FileUpload({ projectId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<"technical" | "legal" | "financial" | "other">("technical");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = trpc.attachments.upload.useMutation();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`El archivo es demasiado grande. Máximo 10MB`);
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Tipo de archivo no permitido. Solo PDF, imágenes y documentos de Office`);
      return false;
    }

    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && validateFile(files[0]!)) {
      setSelectedFile(files[0]!);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && validateFile(files[0]!)) {
      setSelectedFile(files[0]!);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setIsUploading(true);

    try {
      // Leer archivo como ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `project-${projectId}/attachments/${timestamp}-${randomSuffix}-${selectedFile.name}`;

      // Subir a S3
      const { url } = await storagePut(fileKey, buffer, selectedFile.type);

      // Guardar metadata en base de datos
      await uploadMutation.mutateAsync({
        projectId,
        fileName: selectedFile.name,
        fileKey,
        fileUrl: url,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        category,
        description: description || undefined,
      });

      toast.success("Archivo subido exitosamente");
      setSelectedFile(null);
      setDescription("");
      onUploadComplete?.();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    } else if (file.type === "application/pdf") {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-orange-500 bg-orange-50"
              : "border-gray-300 hover:border-orange-400"
          }`}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            Arrastra y suelta un archivo aquí, o
          </p>
          <label htmlFor="file-upload">
            <Button type="button" variant="outline" className="cursor-pointer" asChild>
              <span>Seleccionar Archivo</span>
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            PDF, imágenes, Word, Excel (máx. 10MB)
          </p>
        </div>

        {selectedFile && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Técnico</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="financial">Financiero</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción del archivo"
                  disabled={isUploading}
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? "Subiendo..." : "Subir Archivo"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
