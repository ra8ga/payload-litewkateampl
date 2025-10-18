import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      // defaultValue in dev for smoke test uploads when form text fields are lost
      defaultValue: undefined,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
  // Ensure alt is present in dev even if multipart text fields are not parsed
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        const get = (h: Headers | undefined, k: string) => h?.get?.(k) || undefined
        const host = get(req?.headers as any, 'x-forwarded-host') || get(req?.headers as any, 'host')
        const isLocal = !!host && (host.includes('localhost') || host.includes('127.0.0.1'))
        if (isLocal) {
          const hasAlt = typeof (data as any)?.alt === 'string' && ((data as any).alt)?.length > 0
          if (!hasAlt) {
            return { ...(data as any), alt: 'Smoke test default alt' }
          }
        }
        return data
      },
    ],
  },
}
