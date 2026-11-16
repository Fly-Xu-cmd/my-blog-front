CREATE TABLE Series (
 id INTEGER NOT NULL AUTO_INCREMENT, slug VARCHAR(160) NOT NULL,
 name VARCHAR(100) NOT NULL, description TEXT NULL,
 createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME(0) NOT NULL,
 PRIMARY KEY (id), UNIQUE INDEX Series_slug_key (slug), UNIQUE INDEX Series_name_key (name)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE Post ADD COLUMN publishedAt DATETIME(0) NULL,
 ADD COLUMN seriesId INTEGER NULL, ADD COLUMN seriesOrder INTEGER NULL,
 ADD UNIQUE INDEX Post_seriesId_seriesOrder_key (seriesId, seriesOrder),
 ADD INDEX Post_published_publishedAt_idx (published, publishedAt);
ALTER TABLE Note ADD COLUMN publishedAt DATETIME(0) NULL,
 ADD COLUMN excerpt TEXT NULL, ADD COLUMN kind ENUM('TECH','ESSAY') NOT NULL DEFAULT 'TECH',
 ADD INDEX Note_published_publishedAt_idx (published, publishedAt);
ALTER TABLE Dynamic ADD COLUMN published BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN publishedAt DATETIME(0) NULL,
 ADD INDEX Dynamic_published_publishedAt_idx (published, publishedAt);
UPDATE Post SET publishedAt = createdAt WHERE published = true AND publishedAt IS NULL;
UPDATE Note SET publishedAt = createdAt WHERE published = true AND publishedAt IS NULL;
UPDATE Dynamic SET publishedAt = createdAt WHERE published = true AND publishedAt IS NULL;
ALTER TABLE Dynamic ALTER COLUMN published SET DEFAULT false;
CREATE TABLE CreationRequest (
 id INTEGER NOT NULL AUTO_INCREMENT, resource VARCHAR(16) NOT NULL,
 actor VARCHAR(255) NOT NULL, `key` VARCHAR(36) NOT NULL, payloadHash CHAR(64) NOT NULL,
 resultId INTEGER NOT NULL, response JSON NOT NULL,
 createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (id), UNIQUE INDEX CreationRequest_resource_actor_key_key (resource,actor,`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


ALTER TABLE Post MODIFY content LONGTEXT NOT NULL;
ALTER TABLE Dynamic MODIFY content LONGTEXT NOT NULL;


ALTER TABLE Note MODIFY content LONGTEXT NOT NULL;

