import { openSolarClient } from './server/_core/openSolarClient.ts';

async function explore() {
  try {
    console.log('=== EXPLORANDO API DE OPENSOLAR ===\n');
    
    // 1. Obtener un proyecto completo
    const projectId = '8616702';
    console.log(`1. Obteniendo proyecto ${projectId}...`);
    const project = await openSolarClient.getProjectById(projectId);
    
    console.log('\n=== CAMPOS DEL PROYECTO ===');
    console.log('Campos disponibles:', Object.keys(project).join(', '));
    
    // 2. Buscar campos relacionados con documentos
    console.log('\n=== BUSCANDO CAMPOS DE DOCUMENTOS ===');
    const docFields = Object.keys(project).filter(key => 
      key.toLowerCase().includes('doc') || 
      key.toLowerCase().includes('file') || 
      key.toLowerCase().includes('attach') ||
      key.toLowerCase().includes('media') ||
      key.toLowerCase().includes('image')
    );
    
    if (docFields.length > 0) {
      console.log('Campos relacionados con documentos:', docFields);
      docFields.forEach(field => {
        console.log(`  ${field}:`, project[field]);
      });
    } else {
      console.log('❌ No se encontraron campos de documentos en el objeto del proyecto');
    }
    
    // 3. Mostrar proyecto completo para análisis manual
    console.log('\n=== PROYECTO COMPLETO (JSON) ===');
    console.log(JSON.stringify(project, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

explore();
