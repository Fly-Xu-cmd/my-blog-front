-- CreateTable
CREATE TABLE `PageView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(512) NOT NULL,
    `visitorId` VARCHAR(64) NOT NULL,
    `referrerHost` VARCHAR(255) NULL,
    `userAgent` VARCHAR(512) NULL,
    `isBot` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `PageView_path_createdAt_idx`(`path`, `createdAt`),
    INDEX `PageView_visitorId_createdAt_idx`(`visitorId`, `createdAt`),
    INDEX `PageView_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
