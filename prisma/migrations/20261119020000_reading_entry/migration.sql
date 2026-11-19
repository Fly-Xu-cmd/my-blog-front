CREATE TABLE `ReadingEntry` (
  `id` INTEGER NOT NULL,
  `fields` JSON NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
