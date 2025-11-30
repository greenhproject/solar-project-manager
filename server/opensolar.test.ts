import { describe, it, expect } from 'vitest';
import { ENV } from './_core/env';
import { openSolarClient } from './_core/openSolarClient';

/**
 * Tests de validación de credenciales de OpenSolar API
 */

describe('OpenSolar API Credentials', () => {
  it('should have OPENSOLAR_EMAIL, OPENSOLAR_PASSWORD and OPENSOLAR_ORG_ID configured', () => {
    expect(ENV.openSolarEmail).toBeDefined();
    expect(ENV.openSolarEmail).not.toBe('');
    expect(ENV.openSolarPassword).toBeDefined();
    expect(ENV.openSolarPassword).not.toBe('');
    expect(ENV.openSolarOrgId).toBeDefined();
    expect(ENV.openSolarOrgId).not.toBe('');
  });

  it('should authenticate and get projects from OpenSolar (empty org is valid)', async () => {
    // Intentar obtener proyectos (esto autentica automáticamente)
    const projects = await openSolarClient.getProjects(5);
    
    // Debe retornar un array (puede estar vacío si la org no tiene proyectos)
    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    
    if (projects.length > 0) {
      console.log(`✅ Obtenidos ${projects.length} proyectos de OpenSolar`);
      const project = projects[0];
      console.log('Proyecto de ejemplo:', {
        id: project.id,
        title: project.title,
        address: project.address
      });
    } else {
      console.log('⚠️ La organización no tiene proyectos (esto es válido)');
    }
  }, 30000); // 30 segundos de timeout

  it('should map OpenSolar project to form data (if projects exist)', async () => {
    const projects = await openSolarClient.getProjects(1);
    
    if (projects.length === 0) {
      console.log('⚠️ No hay proyectos para probar el mapeo - test omitido');
      return; // Test pasa si no hay proyectos
    }
    
    const project = projects[0];
    const formData = openSolarClient.mapProjectToForm(project);
    
    expect(formData).toBeDefined();
    expect(formData.name).toBeDefined();
    expect(formData.location).toBeDefined();
    expect(formData.startDate).toBeInstanceOf(Date);
    
    console.log('✅ Mapeo exitoso:', formData);
  }, 30000);
});
