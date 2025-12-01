/**
 * Test de integración para verificar obtención de equipos desde OpenSolar
 * Este test hace llamadas reales a la API de OpenSolar
 */

import { describe, it, expect } from "vitest";
import { openSolarClient } from "./_core/openSolarClient";

describe("OpenSolar Equipment Integration Test", () => {
  it("should get systems with equipment data from real project", async () => {
    // Usar el ID de proyecto real del usuario
    const projectId = "8616702";

    console.log(`\n=== Obteniendo proyecto ${projectId} ===`);

    // 1. Obtener proyecto
    const project = await openSolarClient.getProjectById(projectId);
    console.log(`✅ Proyecto: ${project.title}`);
    console.log(`   Dirección: ${project.address}`);

    expect(project).toBeDefined();
    expect(project.id.toString()).toBe(projectId);
    expect(project.title).toBeTruthy();

    // 2. Obtener sistemas del proyecto
    console.log(`\n=== Obteniendo sistemas del proyecto ===`);
    const systems = await openSolarClient.getSystems(projectId);
    console.log(`✅ Sistemas encontrados: ${systems.length}`);

    expect(systems).toBeDefined();
    expect(Array.isArray(systems)).toBe(true);

    if (systems.length > 0) {
      const system = systems[0];
      console.log(`\n📊 Sistema principal:`);
      console.log(`   - Capacidad: ${system.kw_stc} kW`);
      console.log(
        `   - Producción anual: ${system.output_annual_kwh.toLocaleString()} kWh`
      );
      console.log(
        `   - Compensación: ${system.consumption_offset_percentage}%`
      );

      expect(system.kw_stc).toBeGreaterThan(0);
      expect(system.output_annual_kwh).toBeGreaterThan(0);

      // Verificar paneles
      console.log(`\n🔌 Paneles:`);
      if (system.modules && system.modules.length > 0) {
        system.modules.forEach((module) => {
          console.log(
            `   - ${module.quantity}x ${module.manufacturer_name} ${module.code}`
          );
        });
        expect(system.modules[0].manufacturer_name).toBeTruthy();
        expect(system.modules[0].code).toBeTruthy();
        expect(system.modules[0].quantity).toBeGreaterThan(0);
      } else {
        console.log(`   (ninguno)`);
      }

      // Verificar inversores
      console.log(`\n⚡ Inversores:`);
      if (system.inverters && system.inverters.length > 0) {
        system.inverters.forEach((inv) => {
          console.log(
            `   - ${inv.quantity}x ${inv.manufacturer_name} ${inv.code}`
          );
        });
      } else {
        console.log(`   (ninguno)`);
      }

      // Verificar baterías
      console.log(`\n🔋 Baterías:`);
      if (system.batteries && system.batteries.length > 0) {
        system.batteries.forEach((bat) => {
          const capacity = bat.total_kwh ? ` (${bat.total_kwh} kWh)` : "";
          console.log(
            `   - ${bat.quantity}x ${bat.manufacturer_name} ${bat.code}${capacity}`
          );
        });
      } else if (system.battery_total_kwh > 0) {
        console.log(`   Capacidad total: ${system.battery_total_kwh} kWh`);
      } else {
        console.log(`   (ninguna)`);
      }
    }

    // 3. Mapear a formato de formulario con equipos
    console.log(`\n=== Mapeando a formato de formulario ===`);
    const formData = await openSolarClient.mapProjectToFormWithEquipment(
      project
    );

    console.log(`\n✅ Datos mapeados:`);
    console.log(`   Nombre: ${formData.name}`);
    console.log(`   Ubicación: ${formData.location}`);
    console.log(`   Cliente: ${formData.clientName}`);
    console.log(`   Email: ${formData.clientEmail}`);
    console.log(`   Teléfono: ${formData.clientPhone}`);

    expect(formData.name).toBe(project.title);
    expect(formData.location).toBe(project.address);
    expect(formData.description).toBeTruthy();

    // Verificar que la descripción contiene información de equipos
    console.log(`\n📋 Descripción generada:`);
    console.log("---");
    console.log(formData.description);
    console.log("---");

    if (systems.length > 0) {
      // Si hay sistemas, la descripción debe contener "Sistema Solar"
      expect(formData.description).toContain("Sistema Solar");
      expect(formData.description).toContain("kW");
      expect(formData.description).toContain("kWh");
    }

    console.log(`\n✅ Test de integración completado exitosamente!`);
  }, 30000); // Timeout de 30 segundos para llamadas a API
});
