import { it, expect } from 'vitest';
import mysql from 'mysql2/promise';
import { readFile, readdir } from 'node:fs/promises';
it('additive migration preserves old URLs/visibility, historical publication and new draft default', async () => {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 13316,
    user: 'root',
    password: 'local-test-only',
    multipleStatements: true,
    dateStrings: true,
  });
  const name = 'blog_migration_' + Date.now();
  try {
    await db.query('CREATE DATABASE ' + name);
    await db.query('USE ' + name);
    const dirs = (await readdir('prisma/migrations')).filter((d) => /^\d/.test(d)).sort();
    const optimizationIndex = dirs.indexOf('202611160001_blog_optimization');
    expect(optimizationIndex).toBeGreaterThanOrEqual(0);
    for (const dir of dirs.slice(0, optimizationIndex))
      await db.query(await readFile('prisma/migrations/' + dir + '/migration.sql', 'utf8'));
    await db.query(
      "INSERT INTO Post(title,slug,content,published,createdAt,updatedAt) VALUES ('old','old-url','body',1,'2020-01-01','2020-01-01'),('draft','draft-url','body',0,'2020-01-01','2020-01-01'); INSERT INTO Dynamic(content,excerpt,createdAt,updatedAt) VALUES('old status','summary','2020-01-01','2020-01-01'); INSERT INTO Note(syncId,slug,title,content,published,createdAt,updatedAt) VALUES('old/note','old-note','old note','body',1,'2020-01-01','2020-01-01')",
    );
    for (const dir of dirs.slice(optimizationIndex))
      await db.query(await readFile('prisma/migrations/' + dir + '/migration.sql', 'utf8'));
    const [posts] = await db.query<mysql.RowDataPacket[]>(
      'SELECT slug,published,publishedAt FROM Post ORDER BY id',
    );
    expect(posts[0]).toMatchObject({
      slug: 'old-url',
      published: 1,
      publishedAt: '2020-01-01 00:00:00',
    });
    expect(posts[1].publishedAt).toBeNull();
    const [dynamics] = await db.query<mysql.RowDataPacket[]>(
      'SELECT published,publishedAt FROM Dynamic',
    );
    expect(dynamics[0]).toMatchObject({ published: 1, publishedAt: '2020-01-01 00:00:00' });
    await db.query("INSERT INTO Dynamic(content,excerpt,updatedAt) VALUES ('new','summary',NOW())");
    const [newRows] = await db.query<mysql.RowDataPacket[]>(
      'SELECT published FROM Dynamic ORDER BY id DESC LIMIT 1',
    );
    expect(newRows[0].published).toBe(0);
    const [notes] = await db.query<mysql.RowDataPacket[]>('SELECT slug,kind,publishedAt FROM Note');
    expect(notes[0]).toMatchObject({
      slug: 'old-note',
      kind: 'TECH',
      publishedAt: '2020-01-01 00:00:00',
    });
    const [columns] = await db.query<mysql.RowDataPacket[]>(
      "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND COLUMN_NAME='content'",
      [name],
    );
    expect(columns.every((r) => r.DATA_TYPE === 'longtext')).toBe(true);
    const [about] = await db.query<mysql.RowDataPacket[]>('SELECT * FROM AboutPage');
    expect(about).toHaveLength(0);
  } finally {
    await db.query('DROP DATABASE ' + name);
    await db.end();
  }
});
