import { openSolarClient } from "./server/_core/openSolarClient.js";

async function exploreEquipment() {
  const projects = await openSolarClient.getProjects();
  
  if (projects.length > 0) {
    const project = projects[0];
    console.log("=== Proyecto Completo ===");
    console.log(JSON.stringify(project, null, 2));
  }
}

exploreEquipment().catch(console.error);
