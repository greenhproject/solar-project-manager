import { openSolarClient } from './server/_core/openSolarClient';

async function testActions() {
  try {
    console.log('=== Probando OpenSolar Actions ===\n');
    
    // Obtener proyectos
    const projects = await openSolarClient.getProjects(5);
    
    if (projects.length === 0) {
      console.log('No hay proyectos disponibles');
      return;
    }
    
    console.log(`Encontrados ${projects.length} proyectos\n`);
    
    // Tomar el primer proyecto
    const project = projects[0];
    console.log(`Proyecto: ${project.title} (ID: ${project.id})`);
    
    // Ver si tiene actions
    console.log('\n=== Estructura del proyecto ===');
    console.log(JSON.stringify(project, null, 2));
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testActions();
