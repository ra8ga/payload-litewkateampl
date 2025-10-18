import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`INSERT INTO \`posts\` (\`title\`, \`slug\`, \`status\`, \`published_at\`, \`content\`, \`image_id\`, \`author_id\`) VALUES (
    'Hello World',
    'hello-world',
    'published',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    'Pierwszy post — treść przykładowa.',
    NULL,
    NULL
  );`)

  await db.run(sql`INSERT INTO \`posts\` (\`title\`, \`slug\`, \`status\`, \`published_at\`, \`content\`, \`image_id\`, \`author_id\`) VALUES (
    'Drugi wpis',
    'second-post',
    'draft',
    NULL,
    'Drugi post — w statusie draft.',
    NULL,
    NULL
  );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DELETE FROM \`posts\` WHERE \`slug\` IN ('hello-world', 'second-post');`)
}
