ALTER TABLE `Post` ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1;
CREATE TABLE `PostRevision` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `postId` INTEGER NOT NULL,
  `revision` INTEGER NOT NULL,
  `snapshot` JSON NOT NULL,
  `actor` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `PostRevision_postId_revision_key`(`postId`, `revision`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
