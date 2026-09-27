CREATE TABLE `kuraattori_calendar_feed` (
	`userId` text(255) PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kuraattori_calendar_feed_token_unique` ON `kuraattori_calendar_feed` (`token`);