import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Calendar,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface FileListProps {
  projectId: number;
}

const categoryLabels = {
  technical: { label: "Técnico", color: "bg-blue-100 text-blue-800" },
  legal: { label: "Legal", color: "bg-purple-100 text-purple-800" },
  financial: { label: "Financiero", color: "bg-green-100 text-green-800" },
  other: { label: "Otro", color: "bg-gray-100 text-gray-800" },
};

export function FileList({ projectId }: FileListProps) {
  const utils = trpc.useUtils();
  const { data: attachments, isLoading } = trpc.attachments.list.useQuery({
    projectId,
  });
  const deleteMutation = trpc.attachments.delete.useMutation({
    onSuccess: () => {
      utils.attachments.list.invalidate({ projectId });
      toast.success("Archivo eliminado exitosamente");
    },
    onError: error => {
      toast.error(error.message || "Error al eliminar el archivo");
    },
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    } else if (mimeType === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <Card className="p-8 text-center">
        <File className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">No hay archivos adjuntos</p>
        <p className="text-sm text-gray-400 mt-1">
          Sube documentos, imágenes o PDFs relacionados con este proyecto
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.map(attachment => {
        const categoryInfo =
          categoryLabels[attachment.category as keyof typeof categoryLabels];

        return (
          <Card
            key={attachment.id}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="mt-1">{getFileIcon(attachment.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {attachment.fileName}
                    </h4>
                    <Badge className={categoryInfo.color}>
                      {categoryInfo.label}
                    </Badge>
                  </div>
                  {attachment.description && (
                    <p className="text-xs text-gray-600 mb-2">
                      {attachment.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(attachment.createdAt), "d MMM yyyy", {
                          locale: es,
                        })}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDownload(attachment.fileUrl, attachment.fileName)
                  }
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" title="Eliminar">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El archivo "
                        {attachment.fileName}" será eliminado permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(attachment.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
