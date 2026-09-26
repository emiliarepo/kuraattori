CREATE TABLE `kuraattori_account` (
	`userId` text(255) NOT NULL,
	`type` text(255) NOT NULL,
	`provider` text(255) NOT NULL,
	`providerAccountId` text(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text(255),
	`scope` text(255),
	`id_token` text,
	`session_state` text(255),
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `kuraattori_account` (`userId`);--> statement-breakpoint
CREATE TABLE `kuraattori_category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`sourceId` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kuraattori_category_slug_unique` ON `kuraattori_category` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_source_idx` ON `kuraattori_category` (`source`,`sourceId`);--> statement-breakpoint
CREATE TABLE `kuraattori_data_source` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`adapter` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`lastSuccessfulImportAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kuraattori_data_source_name_unique` ON `kuraattori_data_source` (`name`);--> statement-breakpoint
CREATE TABLE `kuraattori_exhibition_category` (
	`exhibitionId` integer NOT NULL,
	`categoryId` integer NOT NULL,
	PRIMARY KEY(`exhibitionId`, `categoryId`),
	FOREIGN KEY (`exhibitionId`) REFERENCES `kuraattori_exhibition`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoryId`) REFERENCES `kuraattori_category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exhibition_category_category_idx` ON `kuraattori_exhibition_category` (`categoryId`);--> statement-breakpoint
CREATE TABLE `kuraattori_exhibition` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`sourceId` text NOT NULL,
	`museumId` integer NOT NULL,
	`slug` text NOT NULL,
	`titleFi` text NOT NULL,
	`titleEn` text,
	`titleSv` text,
	`descriptionFi` text,
	`descriptionEn` text,
	`descriptionSv` text,
	`startDate` text NOT NULL,
	`endDate` text,
	`sourceUrl` text,
	`imageUrl` text,
	`museumCardEligible` integer DEFAULT false NOT NULL,
	`sourcePayloadHash` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	`lastFetchedAt` integer,
	`lastSeenAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`museumId`) REFERENCES `kuraattori_museum`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kuraattori_exhibition_slug_unique` ON `kuraattori_exhibition` (`slug`);--> statement-breakpoint
CREATE INDEX `exhibition_museum_idx` ON `kuraattori_exhibition` (`museumId`);--> statement-breakpoint
CREATE INDEX `exhibition_dates_idx` ON `kuraattori_exhibition` (`startDate`,`endDate`);--> statement-breakpoint
CREATE UNIQUE INDEX `exhibition_source_idx` ON `kuraattori_exhibition` (`source`,`sourceId`);--> statement-breakpoint
CREATE TABLE `kuraattori_import_run` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dataSourceId` integer NOT NULL,
	`startedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`completedAt` integer,
	`status` text NOT NULL,
	`itemsFetched` integer DEFAULT 0 NOT NULL,
	`itemsCreated` integer DEFAULT 0 NOT NULL,
	`itemsUpdated` integer DEFAULT 0 NOT NULL,
	`itemsUnchanged` integer DEFAULT 0 NOT NULL,
	`itemsMissing` integer DEFAULT 0 NOT NULL,
	`itemsFailed` integer DEFAULT 0 NOT NULL,
	`errorMessage` text,
	FOREIGN KEY (`dataSourceId`) REFERENCES `kuraattori_data_source`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `import_run_data_source_idx` ON `kuraattori_import_run` (`dataSourceId`);--> statement-breakpoint
CREATE TABLE `kuraattori_museum` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`sourceId` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`city` text,
	`region` text,
	`address` text,
	`latitude` real,
	`longitude` real,
	`museumCardEligible` integer DEFAULT false NOT NULL,
	`websiteUrl` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	`lastSeenAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kuraattori_museum_slug_unique` ON `kuraattori_museum` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `museum_source_idx` ON `kuraattori_museum` (`source`,`sourceId`);--> statement-breakpoint
CREATE TABLE `kuraattori_session` (
	`sessionToken` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `kuraattori_session` (`userId`);--> statement-breakpoint
CREATE TABLE `kuraattori_user_exhibition` (
	`userId` text(255) NOT NULL,
	`exhibitionId` integer NOT NULL,
	`status` text NOT NULL,
	`visitedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	PRIMARY KEY(`userId`, `exhibitionId`),
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exhibitionId`) REFERENCES `kuraattori_exhibition`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_exhibition_status_idx` ON `kuraattori_user_exhibition` (`userId`,`status`);--> statement-breakpoint
CREATE TABLE `kuraattori_user_followed_museum` (
	`userId` text(255) NOT NULL,
	`museumId` integer NOT NULL,
	PRIMARY KEY(`userId`, `museumId`),
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`museumId`) REFERENCES `kuraattori_museum`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kuraattori_user_interest` (
	`userId` text(255) NOT NULL,
	`categoryId` integer NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`userId`, `categoryId`),
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoryId`) REFERENCES `kuraattori_category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kuraattori_user_region` (
	`userId` text(255) NOT NULL,
	`region` text NOT NULL,
	PRIMARY KEY(`userId`, `region`),
	FOREIGN KEY (`userId`) REFERENCES `kuraattori_user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `kuraattori_user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer DEFAULT (unixepoch()),
	`image` text(255)
);
--> statement-breakpoint
CREATE TABLE `kuraattori_verification_token` (
	`identifier` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
