ALTER TABLE `kuraattori_exhibition` ADD `exhibitionGroup` text;--> statement-breakpoint
ALTER TABLE `kuraattori_exhibition` ADD `kind` text DEFAULT 'exhibition' NOT NULL;--> statement-breakpoint
CREATE INDEX `exhibition_group_idx` ON `kuraattori_exhibition` (`exhibitionGroup`);