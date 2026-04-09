/**
 * Utilidades compartidas para manejo de archivos
 * Centraliza funciones reutilizables relacionadas con archivos y documentos
 */

import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  FileCode,
  FileArchive,
} from "lucide-react";

/**
 * Tipos de archivo soportados
 */
export type FileCategory = "technical" | "legal" | "financial" | "other";

/**
 * Extensiones de archivo permitidas
 */
export const ALLOWED_FILE_EXTENSIONS = [
  // Documentos
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  // Imágenes
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  // Hojas de cálculo
  ".xls",
  ".xlsx",
  ".csv",
  // Otros
  ".zip",
  ".rar",
] as const;

/**
 * Tamaño máximo de archivo en bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Obtiene el icono apropiado según la extensión del archivo
 * @param filename - Nombre del archivo
 * @returns Componente de icono de Lucide React
 */
export function getFileIcon(filename: string) {
  const extension = filename.toLowerCase().split(".").pop() || "";

  // Imágenes
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
    return Image;
  }

  // Documentos
  if (["pdf", "doc", "docx", "txt"].includes(extension)) {
    return FileText;
  }

  // Hojas de cálculo
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return FileSpreadsheet;
  }

  // Archivos comprimidos
  if (["zip", "rar", "7z"].includes(extension)) {
    return FileArchive;
  }

  // Código
  if (["js", "ts", "jsx", "tsx", "py", "java", "cpp"].includes(extension)) {
    return FileCode;
  }

  // Por defecto
  return File;
}

/**
 * Obtiene el color asociado a un tipo de archivo
 * @param filename - Nombre del archivo
 * @returns Color en formato hexadecimal
 */
export function getFileColor(filename: string): string {
  const extension = filename.toLowerCase().split(".").pop() || "";

  const colorMap: Record<string, string> = {
    // Imágenes - Azul
    jpg: "#3B82F6",
    jpeg: "#3B82F6",
    png: "#3B82F6",
    gif: "#3B82F6",
    webp: "#3B82F6",
    svg: "#3B82F6",
    // Documentos - Rojo
    pdf: "#EF4444",
    doc: "#2563EB",
    docx: "#2563EB",
    txt: "#6B7280",
    // Hojas de cálculo - Verde
    xls: "#10B981",
    xlsx: "#10B981",
    csv: "#10B981",
    // Archivos comprimidos - Ámbar
    zip: "#F59E0B",
    rar: "#F59E0B",
  };

  return colorMap[extension] || "#6B7280";
}

/**
 * Valida si un archivo es del tipo permitido
 * @param filename - Nombre del archivo
 * @returns true si el archivo es válido
 */
export function isValidFileType(filename: string): boolean {
  const extension = "." + filename.toLowerCase().split(".").pop();
  return ALLOWED_FILE_EXTENSIONS.includes(extension as any);
}

/**
 * Valida si el tamaño del archivo está dentro del límite
 * @param fileSize - Tamaño del archivo en bytes
 * @returns true si el tamaño es válido
 */
export function isValidFileSize(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
}

/**
 * Formatea el tamaño de un archivo en formato legible
 * @param bytes - Tamaño en bytes
 * @returns Texto formateado (ej: "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Obtiene la categoría de un archivo basado en su extensión
 * @param filename - Nombre del archivo
 * @returns Categoría del archivo
 */
export function getFileCategory(filename: string): FileCategory {
  const extension = filename.toLowerCase().split(".").pop() || "";

  // Documentos técnicos
  if (["pdf", "doc", "docx", "xls", "xlsx"].includes(extension)) {
    return "technical";
  }

  // Imágenes (pueden ser planos, fotos del sitio, etc.)
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return "technical";
  }

  return "other";
}

/**
 * Verifica si un archivo es una imagen
 * @param filename - Nombre del archivo
 * @returns true si es una imagen
 */
export function isImageFile(filename: string): boolean {
  const extension = filename.toLowerCase().split(".").pop() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension);
}

/**
 * Verifica si un archivo es un PDF
 * @param filename - Nombre del archivo
 * @returns true si es un PDF
 */
export function isPDFFile(filename: string): boolean {
  const extension = filename.toLowerCase().split(".").pop() || "";
  return extension === "pdf";
}

/**
 * Genera un nombre de archivo único agregando timestamp
 * @param filename - Nombre original del archivo
 * @returns Nombre de archivo único
 */
export function generateUniqueFilename(filename: string): string {
  const timestamp = Date.now();
  const extension = filename.split(".").pop();
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."));

  return `${nameWithoutExt}-${timestamp}.${extension}`;
}

/**
 * Obtiene el texto descriptivo de una categoría de archivo
 * @param category - Categoría del archivo
 * @returns Texto descriptivo
 */
export function getCategoryText(category: FileCategory): string {
  const texts: Record<FileCategory, string> = {
    technical: "Técnico",
    legal: "Legal",
    financial: "Financiero",
    other: "Otro",
  };

  return texts[category] || "Otro";
}
