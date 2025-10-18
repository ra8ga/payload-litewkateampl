import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

const helloWorldJSON = JSON.stringify({
  root: {
    type: 'root',
    version: 1,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text: 'Pierwszy post — treść przykładowa.', detail: 0, format: 0 },
        ],
      },
    ],
  },
})

const secondPostJSON = JSON.stringify({
  root: {
    type: 'root',
    version: 1,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text: 'Drugi post — w statusie draft.', detail: 0, format: 0 },
        ],
      },
    ],
  },
})

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`UPDATE \`posts\` SET \`content\` = ${helloWorldJSON} WHERE \`slug\` = 'hello-world';`)
  await db.run(sql`UPDATE \`posts\` SET \`content\` = ${secondPostJSON} WHERE \`slug\` = 'second-post';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`UPDATE \`posts\` SET \`content\` = 'Pierwszy post — treść przykładowa.' WHERE \`slug\` = 'hello-world';`)
  await db.run(sql`UPDATE \`posts\` SET \`content\` = 'Drugi post — w statusie draft.' WHERE \`slug\` = 'second-post';`)
}