ALTER TABLE `kuraattori_exhibition` ADD `admissionText` text;--> statement-breakpoint
ALTER TABLE `kuraattori_exhibition` ADD `admissionAdultCents` integer;
--> statement-breakpoint
UPDATE `kuraattori_exhibition` SET `sourcePayloadHash` = '';