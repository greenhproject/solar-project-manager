CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`prefix` varchar(8) NOT NULL,
	`userId` int NOT NULL,
	`permissions` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text NOT NULL,
	`description` text,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `cad_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`marcaInversor` varchar(100) NOT NULL,
	`modeloInversor` varchar(100),
	`potenciaInversor` varchar(50),
	`operadorRed` varchar(100),
	`cantidadPaneles` int,
	`potenciaPaneles` varchar(50),
	`marcaPaneles` varchar(100),
	`descripcion` text,
	`tags` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cad_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_project_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientUserId` int NOT NULL,
	`projectId` int NOT NULL,
	`canViewFiles` boolean NOT NULL DEFAULT true,
	`canViewUpdates` boolean NOT NULL DEFAULT true,
	`grantedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_project_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `common_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tipo` enum('certificado_inversor','certificado_paneles','manual_inversor','matricula_constructor','matricula_disenador','experiencia_constructor') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`marca` varchar(100),
	`modelo` varchar(100),
	`potencia` varchar(50),
	`descripcion` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `common_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dynamic_doc_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`fieldKey` varchar(100) NOT NULL,
	`fieldLabel` varchar(255) NOT NULL,
	`fieldType` enum('text','number','date','select','project') NOT NULL DEFAULT 'text',
	`options` text,
	`projectMapping` varchar(100),
	`defaultValue` text,
	`orderIndex` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dynamic_doc_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dynamic_doc_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dynamic_doc_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('resend','sendgrid','smtp') NOT NULL DEFAULT 'resend',
	`apiKey` text,
	`smtpHost` varchar(255),
	`smtpPort` int,
	`smtpUser` varchar(255),
	`smtpPassword` text,
	`smtpSecure` boolean DEFAULT true,
	`fromEmail` varchar(255) NOT NULL DEFAULT 'admin@greenhproject.com',
	`fromName` varchar(255) NOT NULL DEFAULT 'Solar Project Manager',
	`enableEmailNotifications` boolean NOT NULL DEFAULT true,
	`sendCopyToAdmin` boolean NOT NULL DEFAULT true,
	`adminEmail` varchar(255) DEFAULT 'admin@greenhproject.com',
	`isActive` boolean NOT NULL DEFAULT false,
	`lastTestedAt` timestamp,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_dynamic_docs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`templateId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`fieldValues` text NOT NULL,
	`generatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_dynamic_docs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`milestoneId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `milestone_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_reminder_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`sendHourUtc` int NOT NULL DEFAULT 12,
	`reminderDaysThreshold` int NOT NULL DEFAULT 1,
	`urgentDaysThreshold` int NOT NULL DEFAULT 4,
	`criticalDaysThreshold` int NOT NULL DEFAULT 8,
	`maxReminderDays` int NOT NULL DEFAULT 30,
	`sendCopyToAdmin` boolean NOT NULL DEFAULT true,
	`adminCcEmail` varchar(255) DEFAULT 'admin@greenhproject.com',
	`reminderSubject` varchar(255) DEFAULT 'Recordatorio: Hito pendiente de completar',
	`urgentSubject` varchar(255) DEFAULT '⚠️ Urgente: Hito con retraso significativo',
	`criticalSubject` varchar(255) DEFAULT '🚨 Crítico: Hito con retraso grave - Acción inmediata requerida',
	`customMessage` text,
	`scheduleCronTaskUid` varchar(65),
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestone_reminder_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestone_reminder_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`milestoneId` int NOT NULL,
	`projectId` int NOT NULL,
	`recipientUserId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(255),
	`urgencyLevel` enum('reminder','urgent','critical') NOT NULL,
	`daysOverdue` int NOT NULL,
	`status` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	`rescheduleRequested` boolean NOT NULL DEFAULT false,
	`rescheduleJustification` text,
	`rescheduleNewDate` timestamp,
	`rescheduleRespondedAt` timestamp,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `milestone_reminder_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outgoing_webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`event` varchar(100) NOT NULL,
	`payload` text NOT NULL,
	`responseStatus` int,
	`responseBody` text,
	`success` boolean NOT NULL DEFAULT false,
	`error` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outgoing_webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `project_legalization_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`documentType` enum('certificado_tradicion','cedula_cliente','plano_agpe','autodeclaracion_retie','certificado_inversor','certificado_paneles','manual_inversor','matricula_inversor','experiencia_constructor','matricula_disenador','memoria_calculo','disponibilidad_red','otros') NOT NULL,
	`fileName` varchar(500),
	`fileKey` varchar(500),
	`fileUrl` varchar(1000),
	`fileSize` int,
	`mimeType` varchar(255),
	`isCompleted` boolean NOT NULL DEFAULT false,
	`autoLoaded` boolean NOT NULL DEFAULT false,
	`uploadedBy` int,
	`uploadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_legalization_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(50) NOT NULL DEFAULT 'opensolar',
	`event` varchar(50) NOT NULL,
	`model` varchar(50) NOT NULL,
	`modelId` int,
	`eventId` int,
	`action` varchar(100),
	`status` enum('processed','ignored','error') NOT NULL DEFAULT 'processed',
	`message` text,
	`errorDetails` text,
	`projectId` int,
	`payload` text,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`secretKey` varchar(64) NOT NULL,
	`eventTypes` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`userId` int NOT NULL,
	`lastTriggeredAt` timestamp,
	`failCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','engineer','ingeniero_tramites','client') NOT NULL DEFAULT 'client';--> statement-breakpoint
ALTER TABLE `milestone_templates` ADD `defaultAssignedUserId` int;--> statement-breakpoint
ALTER TABLE `milestones` ADD `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `milestones` ADD `durationDays` int;--> statement-breakpoint
ALTER TABLE `milestones` ADD `observations` text;--> statement-breakpoint
ALTER TABLE `milestones` ADD `assignedUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(255);--> statement-breakpoint
CREATE INDEX `key_idx` ON `api_keys` (`keyHash`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `api_keys` (`userId`);--> statement-breakpoint
CREATE INDEX `client_access_client_idx` ON `client_project_access` (`clientUserId`);--> statement-breakpoint
CREATE INDEX `client_access_project_idx` ON `client_project_access` (`projectId`);--> statement-breakpoint
CREATE INDEX `template_idx` ON `dynamic_doc_fields` (`templateId`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `generated_dynamic_docs` (`projectId`);--> statement-breakpoint
CREATE INDEX `template_idx` ON `generated_dynamic_docs` (`templateId`);--> statement-breakpoint
CREATE INDEX `milestone_idx` ON `milestone_comments` (`milestoneId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `milestone_comments` (`userId`);--> statement-breakpoint
CREATE INDEX `reminder_log_milestone_idx` ON `milestone_reminder_logs` (`milestoneId`);--> statement-breakpoint
CREATE INDEX `reminder_log_project_idx` ON `milestone_reminder_logs` (`projectId`);--> statement-breakpoint
CREATE INDEX `reminder_log_sent_idx` ON `milestone_reminder_logs` (`sentAt`);--> statement-breakpoint
CREATE INDEX `outgoing_wh_log_webhook_idx` ON `outgoing_webhook_logs` (`webhookId`);--> statement-breakpoint
CREATE INDEX `outgoing_wh_log_event_idx` ON `outgoing_webhook_logs` (`event`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `webhook_logs` (`source`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `webhook_logs` (`status`);--> statement-breakpoint
CREATE INDEX `assigned_user_idx` ON `milestones` (`assignedUserId`);