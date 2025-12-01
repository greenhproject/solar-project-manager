import { openSolarClient } from './server/_core/openSolarClient.ts';

async function listProjects() {
  try {
    const projects = await openSolarClient.getProjects(100);
    console.log(`\n=== ${projects.length} Proyectos en OpenSolar ===\n`);
    
    for (const project of projects.slice(0, 10)) {
      console.log(`ID: ${project.id}`);
      console.log(`Título: ${project.title}`);
      console.log(`Dirección: ${project.address || '(sin dirección)'}`);
      console.log('---');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listProjects();
