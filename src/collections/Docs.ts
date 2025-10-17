import type { CollectionConfig } from 'payload'

export const Docs: CollectionConfig = {
  slug: 'docs',
  labels: {
    singular: 'Doc',
    plural: 'Docs',
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
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}