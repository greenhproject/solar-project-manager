-- Migración para Railway: Módulo de Trámites y Diseño v3.0
-- Ejecutar este script en la base de datos de Railway

-- 1. Agregar rol ingeniero_tramites si no existe
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'engineer', 'ingeniero_tramites') NOT NULL DEFAULT 'engineer';

-- 2. Crear tabla cad_templates si no existe
CREATE TABLE IF NOT EXISTS `cad_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `marcaInversor` VARCHAR(255) NOT NULL,
  `modeloInversor` VARCHAR(255),
  `potenciaInversor` VARCHAR(255),
  `operadorRed` VARCHAR(255),
  `cantidadPaneles` INT,
  `potenciaPaneles` VARCHAR(255),
  `marcaPaneles` VARCHAR(255),
  `descripcion` TEXT,
  `tags` TEXT,
  `fileName` VARCHAR(500) NOT NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `fileUrl` VARCHAR(1000) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(255),
  `uploadedBy` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 3. Crear tabla common_documents si no existe
CREATE TABLE IF NOT EXISTS `common_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo` ENUM('certificado_inversor', 'certificado_paneles', 'manual_inversor', 'matricula_constructor', 'matricula_disenador', 'experiencia_constructor') NOT NULL,
  `fileName` VARCHAR(500) NOT NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `fileUrl` VARCHAR(1000) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(255),
  `marca` VARCHAR(255),
  `modelo` VARCHAR(255),
  `potencia` VARCHAR(255),
  `descripcion` TEXT,
  `uploadedBy` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 4. Crear tabla project_legalization_checklist si no existe
CREATE TABLE IF NOT EXISTS `project_legalization_checklist` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL,
  `documentType` ENUM(
    'certificado_tradicion',
    'cedula_cliente',
    'plano_agpe',
    'autodeclaracion_retie',
    'certificado_inversor',
    'certificado_paneles',
    'manual_inversor',
    'matricula_inversor',
    'experiencia_constructor',
    'matricula_disenador',
    'memoria_calculo',
    'disponibilidad_red',
    'otros'
  ) NOT NULL,
  `fileName` VARCHAR(500),
  `fileKey` VARCHAR(500),
  `fileUrl` VARCHAR(1000),
  `fileSize` INT,
  `mimeType` VARCHAR(255),
  `isCompleted` BOOLEAN DEFAULT FALSE,
  `autoLoaded` BOOLEAN DEFAULT FALSE,
  `uploadedBy` INT,
  `uploadedAt` TIMESTAMP,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_project_document` (`projectId`, `documentType`),
  FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Verificar que las tablas se crearon correctamente
SELECT 'Migración completada exitosamente' AS status;
