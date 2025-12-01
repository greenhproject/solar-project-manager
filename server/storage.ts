// Storage system that works in both Manus and Railway environments
// - Manus: Uses built-in Forge API storage
// - Railway: Uses Cloudinary with official SDK (signed uploads)

import { ENV } from "./_core/env";

type StorageConfig = { baseUrl: string; apiKey: string };

// Detectar entorno
function isRailwayEnvironment(): boolean {
  // Railway usa Auth0, no tiene Forge API
  const hasCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME && 
                        !!process.env.CLOUDINARY_API_KEY && 
                        !!process.env.CLOUDINARY_API_SECRET;
  const hasForgeApi = !!ENV.forgeApiUrl && !!ENV.forgeApiKey;
  
  // Si tiene Cloudinary configurado, es Railway
  if (hasCloudinary) {
    console.log('[Storage] Detected Railway environment (has Cloudinary config)');
    return true;
  }
  
  // Si no tiene Forge API, asumir Railway
  if (!hasForgeApi) {
    console.log('[Storage] Detected Railway environment (no Forge API)');
    return true;
  }
  
  console.log('[Storage] Detected Manus environment (has Forge API)');
  return false;
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
// CLOUDINARY STORAGE (Railway) - Using Official SDK
// ============================================================================

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary no configurado. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en Railway'
    );
  }

  return { cloudName, apiKey, apiSecret };
}

async function cloudinaryPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const config = getCloudinaryConfig();

  // Importar SDK de Cloudinary dinámicamente
  const { v2: cloudinary } = await import('cloudinary');

  // Configurar Cloudinary
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  // Convertir datos a buffer si es necesario
  const buffer = typeof data === 'string' 
    ? Buffer.from(data) 
    : Buffer.from(data);

  // Determinar resource_type basado en contentType
  let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
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
    console.log('[Cloudinary] Uploading file:', {
      publicId,
      resourceType,
      contentType,
      size: buffer.length,
    });

    // Upload usando el SDK oficial con signed upload
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          folder: folder,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Escribir el buffer al stream
      uploadStream.end(buffer);
    });

    console.log('[Cloudinary] Upload successful:', {
      url: result.secure_url,
      publicId: result.public_id,
    });

    return {
      key: relKey,
      url: result.secure_url,
    };
  } catch (error: any) {
    console.error('[Cloudinary] Upload error:', {
      error: error.message,
      stack: error.stack,
      publicId,
      resourceType,
    });
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
