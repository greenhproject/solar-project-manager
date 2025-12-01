import { openSolarClient } from "./server/_core/openSolarClient";
import { writeFileSync } from "fs";

async function saveResponse() {
  const projects = await openSolarClient.getProjects(1);
  
  if (projects.length > 0) {
    writeFileSync("opensolar-project-sample.json", JSON.stringify(projects[0], null, 2));
    console.log("✅ Guardado en opensolar-project-sample.json");
  }
}

saveResponse().catch(console.error);
