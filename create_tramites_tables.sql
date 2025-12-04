-- Crear tablas del módulo de Trámites y Diseño

-- 1. Tabla de plantillas CAD
CREATE TABLE IF NOT EXISTS `cad_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `marcaInversor` VARCHAR(255),
  `potenciaInversor` VARCHAR(255),
  `operadorRed` VARCHAR(255),
  `cantidadPaneles` INT,
  `potenciaPaneles` VARCHAR(255),
  `descripcion` TEXT,
  `fileName` VARCHAR(500) NOT NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `fileUrl` VARCHAR(1000) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(255) NOT NULL,
  `uploadedBy` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de documentos comunes
CREATE TABLE IF NOT EXISTS `common_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo` ENUM('certificado_inversor', 'certificado_paneles', 'manual_inversor', 'matricula_constructor', 'experiencia_constructor', 'matricula_disenador') NOT NULL,
  `fileName` VARCHAR(500) NOT NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `fileUrl` VARCHAR(1000) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(255) NOT NULL,
  `marca` VARCHAR(255),
  `modelo` VARCHAR(255),
  `potencia` VARCHAR(255),
  `descripcion` TEXT,
  `uploadedBy` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de checklist de legalización por proyecto
CREATE TABLE IF NOT EXISTS `project_legalization_checklist` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL,
  `documentType` ENUM('certificado_tradicion', 'cedula_cliente', 'plano_agpe', 'autodeclaracion_retie', 'certificado_inversor', 'certificado_paneles', 'manual_inversor', 'matricula_inversor', 'experiencia_constructor', 'matricula_disenador', 'memoria_calculo', 'disponibilidad_red', 'otros') NOT NULL,
  `fileName` VARCHAR(500),
  `fileKey` VARCHAR(500),
  `fileUrl` VARCHAR(1000),
  `fileSize` INT,
  `mimeType` VARCHAR(255),
  `isCompleted` BOOLEAN DEFAULT FALSE,
  `autoLoaded` BOOLEAN DEFAULT FALSE,
  `uploadedBy` INT,
  `uploadedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_project_document` (`projectId`, `documentType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Actualizar enum de roles para incluir ingeniero_tramites
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin', 'engineer', 'ingeniero_tramites') NOT NULL DEFAULT 'engineer';
