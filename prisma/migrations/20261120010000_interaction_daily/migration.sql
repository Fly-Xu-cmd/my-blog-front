CREATE TABLE `InteractionDaily` (
  `day` DATE NOT NULL,
  `event` VARCHAR(24) NOT NULL,
  `target` VARCHAR(32) NOT NULL,
  `count` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`day`, `event`, `target`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
