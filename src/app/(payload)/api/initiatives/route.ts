import config from '@payload-config'
import { getPayload } from 'payload'

export const GET = async (req: Request): Promise<Response> => {
  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') ?? 10)
    const depthParam = url.searchParams.get('depth')
    const depth = depthParam !== null ? Number(depthParam) : 1

    const whereParams = Object.fromEntries(url.searchParams.entries())
    // Basic support for `where[...]` passthrough; Payload will parse it from Request in REST normally,
    // but here we only support simple cases via query string

    const result = await payload.find({
      collection: 'initiatives',
      limit,
      depth,
      // NOTE: Advanced `where` parsing is omitted; rely on default behavior for now
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