ALTER TABLE `kuraattori_exhibition` ADD `imageArchiveKey` text;--> statement-breakpoint
ALTER TABLE `kuraattori_exhibition` ADD `imageWidth` integer;--> statement-breakpoint
ALTER TABLE `kuraattori_exhibition` ADD `imageHeight` integer;--> statement-breakpoint
ALTER TABLE `kuraattori_exhibition` ADD `imageArchiveRemoved` integer DEFAULT false NOT NULL;