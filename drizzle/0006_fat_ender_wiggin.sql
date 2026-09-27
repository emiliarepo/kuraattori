CREATE TABLE `kuraattori_saved_trip` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`place` text DEFAULT '' NOT NULL,
	`fromDate` text NOT NULL,
	`toDate` text NOT NULL,
	`exhibitionIds` text DEFAULT '[]' NOT NULL,
	`days` text DEFAULT '[]' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_trip_user_idx` ON `kuraattori_saved_trip` (`userId`,`place`,`fromDate`,`toDate`);--> statement-breakpoint
ALTER TABLE `kuraattori_museum` ADD `geocodedAddress` text;