import type { CollectionConfig } from 'payload'

const toSlug = (input: unknown): string | undefined => {
  const s = typeof input === 'string' ? input : undefined
  if (!s) return undefined
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'Post',
    plural: 'Posts',
  },
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unikalny slug (generowany z tytułu, jeśli pusty)',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        description: 'Data publikacji (ustawiana automatycznie przy Published)',
      },
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Grafika wyróżniająca (opcjonalna)',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Autor posta (użytkownik)',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        const next = { ...(data as any) }
        const title = next?.title
        if (!next?.slug) {
          const s = toSlug(title)
          if (s) next.slug = s
        }
        return next
      },
    ],
    beforeChange: [
      async ({ data }) => {
        const next = { ...(data as any) }
        const status = next?.status
        const hasPublishedAt = !!next?.publishedAt
        if (status === 'published' && !hasPublishedAt) {
          next.publishedAt = new Date().toISOString()
        }
        return next
      },
    ],
  },
}