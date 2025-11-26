CREATE TABLE `milestone_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectTypeId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`orderIndex` int NOT NULL,
	`estimatedDurationDays` int DEFAULT 7,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestone_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`startDate` timestamp,
	`dueDate` timestamp NOT NULL,
	`completedDate` timestamp,
	`status` enum('pending','in_progress','completed','overdue') NOT NULL DEFAULT 'pending',
	`orderIndex` int NOT NULL,
	`weight` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#FF6B35',
	`estimatedDurationDays` int DEFAULT 30,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`updateType` enum('status_change','milestone_completed','assignment_change','progress_update','note_added') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`oldValue` text,
	`newValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int NOT NULL,
	CONSTRAINT `project_updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`projectTypeId` int NOT NULL,
	`assignedEngineerId` int,
	`openSolarId` varchar(255),
	`startDate` timestamp NOT NULL,
	`estimatedEndDate` timestamp NOT NULL,
	`actualEndDate` timestamp,
	`status` enum('planning','in_progress','on_hold','completed','cancelled') NOT NULL DEFAULT 'planning',
	`progressPercentage` int NOT NULL DEFAULT 0,
	`location` varchar(500),
	`clientName` varchar(255),
	`clientEmail` varchar(320),
	`clientPhone` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int NOT NULL,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`milestoneId` int,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`reminderDate` timestamp NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`isSent` boolean NOT NULL DEFAULT false,
	`type` enum('milestone_due','project_overdue','custom','sync_required') NOT NULL DEFAULT 'custom',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`syncType` enum('manual','automatic','scheduled') NOT NULL DEFAULT 'manual',
	`direction` enum('import','export','bidirectional') NOT NULL DEFAULT 'import',
	`status` enum('success','partial','failed') NOT NULL DEFAULT 'success',
	`message` text,
	`errorDetails` text,
	`dataSynced` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`syncedBy` int NOT NULL,
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','engineer') NOT NULL DEFAULT 'engineer';--> statement-breakpoint
CREATE INDEX `project_idx` ON `milestones` (`projectId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `milestones` (`status`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `project_updates` (`projectId`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `project_updates` (`updateType`);--> statement-breakpoint
CREATE INDEX `engineer_idx` ON `projects` (`assignedEngineerId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `opensolar_idx` ON `projects` (`openSolarId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `reminders` (`userId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `reminders` (`reminderDate`);--> statement-breakpoint
CREATE INDEX `read_idx` ON `reminders` (`isRead`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `sync_logs` (`projectId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `sync_logs` (`status`);