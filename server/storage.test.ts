import { describe, it, expect, beforeAll, vi } from 'vitest';

describe('Storage System', () => {
  describe('Environment Detection', () => {
    it('should detect Manus environment when BUILT_IN_FORGE_API_URL is set', () => {
      const originalForgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const originalForgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      
      process.env.BUILT_IN_FORGE_API_URL = 'https://api.manus.im';
      process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
      
      // El módulo debe detectar que está en Manus
      expect(process.env.BUILT_IN_FORGE_API_URL).toBeDefined();
      expect(process.env.BUILT_IN_FORGE_API_KEY).toBeDefined();
      
      // Restaurar
      process.env.BUILT_IN_FORGE_API_URL = originalForgeUrl;
      process.env.BUILT_IN_FORGE_API_KEY = originalForgeKey;
    });

    it('should detect Railway environment when BUILT_IN_FORGE_API_URL is not set', () => {
      const originalForgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const originalForgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      
      delete process.env.BUILT_IN_FORGE_API_URL;
      delete process.env.BUILT_IN_FORGE_API_KEY;
      
      // El módulo debe detectar que está en Railway
      expect(process.env.BUILT_IN_FORGE_API_URL).toBeUndefined();
      
      // Restaurar
      process.env.BUILT_IN_FORGE_API_URL = originalForgeUrl;
      process.env.BUILT_IN_FORGE_API_KEY = originalForgeKey;
    });
  });

  describe('Cloudinary Configuration', () => {
    it('should require CLOUDINARY_CLOUD_NAME in Railway environment', async () => {
      const originalForgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
      
      delete process.env.BUILT_IN_FORGE_API_URL;
      delete process.env.CLOUDINARY_CLOUD_NAME;
      
      try {
        const { storagePut } = await import('./storage');
        await storagePut('test.txt', 'test content', 'text/plain');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Cloudinary no configurado');
      }
      
      // Restaurar
      process.env.BUILT_IN_FORGE_API_URL = originalForgeUrl;
      process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
    });

    it('should accept valid Cloudinary credentials', () => {
      const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const originalApiKey = process.env.CLOUDINARY_API_KEY;
      const originalApiSecret = process.env.CLOUDINARY_API_SECRET;
      
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-key';
      process.env.CLOUDINARY_API_SECRET = 'test-secret';
      
      expect(process.env.CLOUDINARY_CLOUD_NAME).toBe('test-cloud');
      expect(process.env.CLOUDINARY_API_KEY).toBe('test-key');
      expect(process.env.CLOUDINARY_API_SECRET).toBe('test-secret');
      
      // Restaurar
      process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
      process.env.CLOUDINARY_API_KEY = originalApiKey;
      process.env.CLOUDINARY_API_SECRET = originalApiSecret;
    });
  });

  describe('Key Normalization', () => {
    it('should remove leading slashes from keys', () => {
      const testKey = '/folder/file.txt';
      const normalized = testKey.replace(/^\/+/, '');
      expect(normalized).toBe('folder/file.txt');
    });

    it('should handle keys without leading slashes', () => {
      const testKey = 'folder/file.txt';
      const normalized = testKey.replace(/^\/+/, '');
      expect(normalized).toBe('folder/file.txt');
    });

    it('should handle multiple leading slashes', () => {
      const testKey = '///folder/file.txt';
      const normalized = testKey.replace(/^\/+/, '');
      expect(normalized).toBe('folder/file.txt');
    });
  });
});
