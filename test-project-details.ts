import { ENV } from './server/_core/env';

const OPENSOLAR_API_URL = 'https://api.opensolar.com';

async function testProjectDetails() {
  try {
    console.log('=== Obteniendo detalles completos del proyecto ===\n');
    
    // Autenticar
    const authResponse = await fetch(`${OPENSOLAR_API_URL}/api-token-auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ENV.openSolarEmail,
        password: ENV.openSolarPassword,
      }),
    });
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Autenticado correctamente\n');
    
    // Obtener proyecto con todos los detalles
    const projectId = '8636774'; // ID del primer proyecto
    const url = `${OPENSOLAR_API_URL}/api/orgs/${ENV.openSolarOrgId}/projects/${projectId}/`;
    
    console.log(`Obteniendo proyecto: ${url}\n`);
    
    const projectResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const project = await projectResponse.json();
    
    console.log('=== PROYECTO COMPLETO ===');
    console.log(JSON.stringify(project, null, 2));
    
    // Verificar si tiene actions
    if (project.actions) {
      console.log('\n=== ACTIONS ENCONTRADAS ===');
      console.log(JSON.stringify(project.actions, null, 2));
    } else {
      console.log('\n⚠️ No se encontró el campo "actions" en el proyecto');
    }
    
    // Verificar workflow
    if (project.workflow) {
      console.log('\n=== WORKFLOW ===');
      console.log(JSON.stringify(project.workflow, null, 2));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testProjectDetails();
