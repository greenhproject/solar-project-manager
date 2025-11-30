// Storage system that works in both Manus and Railway environments
// - Manus: Uses built-in Forge API storage
// - Railway: Uses Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)

import { ENV } from "./_core/env";

type StorageConfig = { baseUrl: string; apiKey: string };

// Detectar entorno
function isRailwayEnvironment(): boolean {
  return !ENV.forgeApiUrl || !ENV.forgeApiKey;
}

// ============================================================================
// MANUS STORAGE (Forge API)
// ============================================================================

function getManusStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

async function manusStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function manusStorageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

// ============================================================================
// CLOUDINARY STORAGE (Railway)
// ============================================================================

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
}

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'solar_project_manager';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary no configurado. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en Railway'
    );
  }

  return { cloudName, apiKey, apiSecret, uploadPreset };
}

async function cloudinaryPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const config = getCloudinaryConfig();

  // Convertir datos a base64
  const base64Data = typeof data === 'string' 
    ? Buffer.from(data).toString('base64')
    : Buffer.from(data).toString('base64');

  const dataUri = `data:${contentType};base64,${base64Data}`;

  // Determinar resource_type basado en contentType
  let resourceType = 'auto';
  if (contentType.startsWith('image/')) {
    resourceType = 'image';
  } else if (contentType.startsWith('video/')) {
    resourceType = 'video';
  } else {
    resourceType = 'raw'; // Para PDFs, documentos, etc.
  }

  const folder = 'solar-project-manager';
  const publicId = `${folder}/${normalizeKey(relKey)}`;

  try {
    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', config.uploadPreset);
    formData.append('public_id', publicId);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Cloudinary upload failed (${response.status}): ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();

    return {
      key: relKey,
      url: result.secure_url,
    };
  } catch (error: any) {
    console.error('[Cloudinary] Upload error:', error);
    throw new Error(`Error al subir archivo a Cloudinary: ${error.message}`);
  }
}

async function cloudinaryGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const config = getCloudinaryConfig();
  
  const folder = 'solar-project-manager';
  const publicId = `${folder}/${normalizeKey(relKey)}`;

  // Construir URL pública de Cloudinary
  const url = `https://res.cloudinary.com/${config.cloudName}/raw/upload/${publicId}`;

  return { key: relKey, url };
}

// ============================================================================
// EXPORTED FUNCTIONS (Auto-detect environment)
// ============================================================================

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (isRailwayEnvironment()) {
    console.log('[Storage] Using Cloudinary (Railway environment)');
    return await cloudinaryPut(relKey, data, contentType);
  } else {
    console.log('[Storage] Using Manus Forge API');
    return await manusStoragePut(relKey, data, contentType);
  }
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  if (isRailwayEnvironment()) {
    return await cloudinaryGet(relKey);
  } else {
    return await manusStorageGet(relKey);
  }
}
