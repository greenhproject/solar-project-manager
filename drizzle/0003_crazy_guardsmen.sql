CREATE TABLE `sso_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255) NOT NULL,
	`redirectTo` varchar(500),
	`used` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sso_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `sso_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `sso_token_idx` ON `sso_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `sso_expires_idx` ON `sso_tokens` (`expiresAt`);