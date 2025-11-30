/**
 * Sistema de almacenamiento alternativo para Railway
 * 
 * Usa Cloudinary como servicio de almacenamiento gratuito
 * Cloudinary ofrece 25GB de almacenamiento y 25GB de ancho de banda gratis/mes
 * 
 * Variables de entorno requeridas:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[Storage] Cloudinary no configurado. Sistema de archivos no disponible.');
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Sube un archivo a Cloudinary
 */
export async function cloudinaryPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getCloudinaryConfig();
  
  if (!config) {
    throw new Error(
      'Cloudinary no configurado. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET'
    );
  }

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

  // Generar firma para la petición
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'solar-project-manager';
  const publicId = `${folder}/${relKey.replace(/^\/+/, '')}`;

  try {
    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', 'unsigned_preset'); // Necesitarás crear esto en Cloudinary
    formData.append('public_id', publicId);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', timestamp.toString());

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
    throw new Error(`Error al subir archivo: ${error.message}`);
  }
}

/**
 * Obtiene la URL de un archivo en Cloudinary
 */
export async function cloudinaryGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const config = getCloudinaryConfig();
  
  if (!config) {
    throw new Error('Cloudinary no configurado');
  }

  const folder = 'solar-project-manager';
  const publicId = `${folder}/${relKey.replace(/^\/+/, '')}`;

  // Construir URL pública de Cloudinary
  const url = `https://res.cloudinary.com/${config.cloudName}/raw/upload/${publicId}`;

  return { key: relKey, url };
}
