-- CreateTable
CREATE TABLE `Note` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `syncId` VARCHAR(512) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `hash` VARCHAR(128) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL,
    `categoryId` INTEGER NULL,

    UNIQUE INDEX `Note_syncId_key`(`syncId`),
    UNIQUE INDEX `Note_slug_key`(`slug`),
    INDEX `Note_categoryId_idx`(`categoryId`),
    INDEX `Note_published_createdAt_idx`(`published`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteTag` (
    `noteId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `NoteTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`noteId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
