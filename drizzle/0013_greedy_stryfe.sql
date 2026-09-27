CREATE TABLE `kuraattori_edition` (
	`region` text NOT NULL,
	`date` text NOT NULL,
	`leadId` integer,
	`endingIds` text NOT NULL,
	`openingIds` text NOT NULL,
	`gemId` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`region`, `date`)
);
