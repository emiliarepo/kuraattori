CREATE TABLE `kuraattori_push_sent` (
	`userId` text(255) NOT NULL,
	`exhibitionId` integer NOT NULL,
	`sentOn` text NOT NULL,
	PRIMARY KEY(`userId`, `exhibitionId`),
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exhibitionId`) REFERENCES `kuraattori_exhibition`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `push_sent_user_day_idx` ON `kuraattori_push_sent` (`userId`,`sentOn`);--> statement-breakpoint
CREATE TABLE `kuraattori_push_subscription` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `push_subscription_user_idx` ON `kuraattori_push_subscription` (`userId`);