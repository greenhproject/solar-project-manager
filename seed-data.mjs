import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

// Tipos de proyecto solar comunes
const projectTypes = [
  {
    name: 'Residencial Pequeño',
    description: 'Instalación solar para viviendas unifamiliares (hasta 10 kW)',
    color: '#FF6B35',
    estimatedDurationDays: 30,
    isActive: true,
  },
  {
    name: 'Residencial Grande',
    description: 'Instalación solar para viviendas grandes o multifamiliares (10-50 kW)',
    color: '#F7B32B',
    estimatedDurationDays: 45,
    isActive: true,
  },
  {
    name: 'Comercial',
    description: 'Instalación solar para edificios comerciales y oficinas (50-250 kW)',
    color: '#15B869',
    estimatedDurationDays: 60,
    isActive: true,
  },
  {
    name: 'Industrial',
    description: 'Instalación solar para plantas industriales y almacenes (250+ kW)',
    color: '#2E86AB',
    estimatedDurationDays: 90,
    isActive: true,
  },
  {
    name: 'Agrícola',
    description: 'Instalación solar para granjas y aplicaciones agrícolas',
    color: '#6A994E',
    estimatedDurationDays: 40,
    isActive: true,
  },
];

console.log('Insertando tipos de proyecto...');
for (const type of projectTypes) {
  await db.insert(schema.projectTypes).values(type);
  console.log(`✓ ${type.name}`);
}

console.log('\n✅ Datos iniciales creados exitosamente');
await connection.end();
