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

export const Initiatives: CollectionConfig = {
  slug: 'initiatives',
  labels: {
    singular: 'Inicjatywa',
    plural: 'Inicjatywy',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'order', 'publishedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unikalny slug (generowany z tytułu, jeśli pusty)',
      },
    },
    { name: 'excerpt', type: 'text' },
    { name: 'content', type: 'richText' },
    {
      name: 'gallery',
      type: 'array',
      admin: { description: 'Galeria zdjęć dla inicjatywy' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Zdjęcie w galerii' },
        },
        {
          name: 'caption',
          type: 'text',
          admin: { description: 'Podpis zdjęcia (opcjonalnie)' },
        },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      admin: { description: 'Tagi inicjatywy (np. #Pomoc, #Sprzęt)' },
      fields: [
        { name: 'tag', type: 'text', required: true },
      ],
    },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    {
      name: 'order',
      type: 'number',
      admin: { description: 'Kolejność na liście; wyższa wartość = wyżej' },
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