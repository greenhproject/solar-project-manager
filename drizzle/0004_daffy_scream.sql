CREATE TABLE IF NOT EXISTS `ghp_notification_delivery_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` varchar(160) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `recipientEmail` varchar(320) NOT NULL,
  `payload` text NOT NULL,
  `deliveryStatus` enum('sent','failed','skipped') NOT NULL,
  `responseStatus` int,
  `responseBody` text,
  `error` text,
  `durationMs` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `ghp_notification_delivery_logs_id` PRIMARY KEY(`id`),
  INDEX `ghp_delivery_event_idx` (`eventId`),
  INDEX `ghp_delivery_recipient_idx` (`recipientEmail`),
  INDEX `ghp_delivery_created_idx` (`createdAt`)
);
