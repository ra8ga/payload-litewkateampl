/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'
import { getPayload } from 'payload'

const RAW_GET = REST_GET(config)
export const GET = async (req: Request, ctx: any): Promise<Response> => {
  const { pathname, searchParams } = new URL(req.url)

  if (pathname.includes('/api/initiatives')) {
    try {
      const payloadConfig = await config
      const payload = await getPayload({ config: payloadConfig })
      const limit = Number(searchParams.get('limit') ?? 10)
      const depthParam = searchParams.get('depth')
      const depth = depthParam !== null ? Number(depthParam) : 1

      const result = await payload.find({
        collection: 'initiatives',
        limit,
        depth,
      })

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    } catch (err: unknown) {
      const error = err as Error
      console.error('Initiatives GET error:', error?.message, error?.stack)
      return new Response(
        JSON.stringify({ errors: [{ message: error?.message ?? 'Unknown error', stack: error?.stack }] }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      )
    }
  }

  try {
    return await RAW_GET(req, ctx)
  } catch (err: unknown) {
    const error = err as Error
    console.error('REST GET error:', error?.message, error?.stack)
    return new Response(
      JSON.stringify({ errors: [{ message: error?.message ?? 'Unknown error', stack: error?.stack }] }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    )
  }
}

export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
