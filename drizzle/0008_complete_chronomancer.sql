CREATE INDEX `exhibition_kind_end_idx` ON `kuraattori_exhibition` (`kind`,coalesce("endDate", '9999-12-31'),`id`);--> statement-breakpoint
CREATE INDEX `exhibition_kind_start_idx` ON `kuraattori_exhibition` (`kind`,`startDate`);
