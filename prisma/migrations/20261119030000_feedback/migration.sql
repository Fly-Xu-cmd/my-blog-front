CREATE TABLE `Feedback` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `submissionId` VARCHAR(36) NOT NULL,
  `payloadHash` VARCHAR(64) NOT NULL,
  `resource` VARCHAR(8) NOT NULL,
  `contentId` INTEGER NOT NULL,
  `type` VARCHAR(16) NOT NULL,
  `message` TEXT NOT NULL,
  `contact` VARCHAR(160) NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'NEW',
  `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  UNIQUE INDEX `Feedback_submissionId_key` (`submissionId`),
  INDEX `Feedback_status_createdAt_idx` (`status`,`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `FeedbackSettings` (
  `id` INTEGER NOT NULL,
  `githubUrl` VARCHAR(512) NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
