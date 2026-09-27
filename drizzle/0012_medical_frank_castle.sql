ALTER TABLE `kuraattori_category` ADD `nameEn` text;--> statement-breakpoint
ALTER TABLE `kuraattori_category` ADD `nameSv` text;--> statement-breakpoint
ALTER TABLE `kuraattori_exhibition` ADD `translationHash` text;--> statement-breakpoint
ALTER TABLE `kuraattori_museum` ADD `nameEn` text;--> statement-breakpoint
ALTER TABLE `kuraattori_museum` ADD `nameSv` text;--> statement-breakpoint
ALTER TABLE `kuraattori_user` ADD `locale` text;