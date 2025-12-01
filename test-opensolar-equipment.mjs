/**
 * Script de prueba para verificar la obtención de equipos desde OpenSolar
 */

import { openSolarClient } from './server/_core/openSolarClient.ts';

async function testOpenSolarEquipment() {
  console.log('=== Test: OpenSolar Equipment Data ===\n');

  // Usar el ID de proyecto real del usuario
  const projectId = '8616702';

  try {
    console.log(`1. Obteniendo proyecto ${projectId}...`);
    const project = await openSolarClient.getProjectById(projectId);
    console.log(`✅ Proyecto encontrado: ${project.title}`);
    console.log(`   Dirección: ${project.address}\n`);

    console.log(`2. Obteniendo sistemas del proyecto...`);
    const systems = await openSolarClient.getSystems(projectId);
    console.log(`✅ Sistemas encontrados: ${systems.length}\n`);

    if (systems.length > 0) {
      const system = systems[0];
      console.log('📊 Información del Sistema:');
      console.log(`   - ID: ${system.id}`);
      console.log(`   - Nombre: ${system.name || '(sin nombre)'}`);
      console.log(`   - Capacidad: ${system.kw_stc} kW`);
      console.log(`   - Producción anual: ${system.output_annual_kwh.toLocaleString()} kWh`);
      console.log(`   - Compensación: ${system.consumption_offset_percentage}%`);
      console.log(`   - Es actual: ${system.is_current ? 'Sí' : 'No'}\n`);

      console.log('🔌 Paneles Solares:');
      if (system.modules && system.modules.length > 0) {
        system.modules.forEach((module, i) => {
          console.log(`   ${i + 1}. ${module.quantity}x ${module.manufacturer_name} ${module.code}`);
        });
      } else {
        console.log('   (ninguno)');
      }
      console.log('');

      console.log('⚡ Inversores:');
      if (system.inverters && system.inverters.length > 0) {
        system.inverters.forEach((inv, i) => {
          console.log(`   ${i + 1}. ${inv.quantity}x ${inv.manufacturer_name} ${inv.code}`);
        });
      } else {
        console.log('   (ninguno)');
      }
      console.log('');

      console.log('🔋 Baterías:');
      if (system.batteries && system.batteries.length > 0) {
        system.batteries.forEach((bat, i) => {
          const capacity = bat.total_kwh ? ` (${bat.total_kwh} kWh)` : '';
          console.log(`   ${i + 1}. ${bat.quantity}x ${bat.manufacturer_name} ${bat.code}${capacity}`);
        });
      } else if (system.battery_total_kwh > 0) {
        console.log(`   Capacidad total: ${system.battery_total_kwh} kWh (sin detalles)`);
      } else {
        console.log('   (ninguna)');
      }
      console.log('');
    }

    console.log('3. Mapeando a formato de formulario con equipos...');
    const formData = await openSolarClient.mapProjectToFormWithEquipment(project);
    console.log('✅ Datos mapeados:\n');
    console.log('📝 Formulario:');
    console.log(`   Nombre: ${formData.name}`);
    console.log(`   Ubicación: ${formData.location}`);
    console.log(`   Cliente: ${formData.clientName}`);
    console.log(`   Email: ${formData.clientEmail}`);
    console.log(`   Teléfono: ${formData.clientPhone}`);
    console.log(`   Fecha inicio: ${formData.startDate.toLocaleDateString()}`);
    console.log('\n📋 Descripción con equipos:');
    console.log('---');
    console.log(formData.description);
    console.log('---\n');

    console.log('✅ Test completado exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testOpenSolarEquipment();
