import { openSolarClient } from './server/_core/openSolarClient.ts';

async function test() {
  try {
    console.log('Obteniendo proyectos...');
    const projects = await openSolarClient.getProjects(1);
    if (projects.length > 0) {
      const project = projects[0];
      console.log('\n=== PROYECTO COMPLETO ===');
      console.log(JSON.stringify(project, null, 2));
      
      console.log('\n=== CAMPOS DISPONIBLES ===');
      console.log('Keys:', Object.keys(project));
    } else {
      console.log('No hay proyectos');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
