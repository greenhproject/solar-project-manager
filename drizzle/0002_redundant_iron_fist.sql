CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('milestone','delay','ai_alert','general') NOT NULL,
	`projectId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enablePushNotifications` boolean NOT NULL DEFAULT true,
	`enableMilestoneReminders` boolean NOT NULL DEFAULT true,
	`enableDelayAlerts` boolean NOT NULL DEFAULT true,
	`enableAIAlerts` boolean NOT NULL DEFAULT true,
	`milestoneReminderDays` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `project_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`category` enum('technical','legal','financial','other') NOT NULL DEFAULT 'other',
	`description` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_attachments_id` PRIMARY KEY(`id`)
);
