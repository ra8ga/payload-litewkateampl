import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

// Add missing array tables for Initiatives: initiatives_gallery and initiatives_tags
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // initiatives_gallery: stores array items for Initiatives.gallery
  await db.run(sql`CREATE TABLE \`initiatives_gallery\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_order\` integer DEFAULT 0 NOT NULL,
    \`image_id\` integer,
    \`caption\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`initiatives\`(\`id\`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );`)
  await db.run(
    sql`CREATE INDEX \`initiatives_gallery_parent_idx\` ON \`initiatives_gallery\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`initiatives_gallery_order_idx\` ON \`initiatives_gallery\` (\`_order\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`initiatives_gallery_image_idx\` ON \`initiatives_gallery\` (\`image_id\`);`,
  )

  // initiatives_tags: stores array items for Initiatives.tags
  await db.run(sql`CREATE TABLE \`initiatives_tags\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`_order\` integer DEFAULT 0 NOT NULL,
    \`tag\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`initiatives\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(
    sql`CREATE INDEX \`initiatives_tags_parent_idx\` ON \`initiatives_tags\` (\`_parent_id\`);`,
  )
  await db.run(
    sql`CREATE INDEX \`initiatives_tags_order_idx\` ON \`initiatives_tags\` (\`_order\`);`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`initiatives_gallery\`;`)
  await db.run(sql`DROP TABLE \`initiatives_tags\`;`)
}
