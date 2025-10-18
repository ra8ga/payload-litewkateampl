import config from '@payload-config'
import { getPayload } from 'payload'

export const GET = async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const depthParam = url.searchParams.get('depth')
  const depth = depthParam !== null ? Number(depthParam) : 0
  const limit = Number(url.searchParams.get('limit') ?? 1)

  try {
    const payloadConfig = await config
    const payload = await getPayload({ config: payloadConfig })

    const results: Record<string, unknown> = {
      env: process.env.CLOUDFLARE_ENV ?? null,
      diagnostics: [],
    }

    // 1) Drizzle select only IDs + slug — sanity check; should not touch _rels
    try {
      const tbl = (payload.db.tables as any).initiatives
      const rows = await payload.db.drizzle
        .select({ id: tbl.id, slug: tbl.slug, created_at: tbl.created_at })
        .from(tbl)
        .orderBy(tbl.created_at)
        .limit(limit)
      results['drizzle_select_ids'] = rows
    } catch (e) {
      const err = e as Error
      results['drizzle_select_ids_error'] = { message: err?.message, stack: err?.stack }
    }

    // 2) Payload find with select: { id: true } — should avoid relational arrays
    try {
      const res = await payload.find({
        collection: 'initiatives',
        depth,
        limit,
        overrideAccess: true,
        select: { id: true, slug: true },
      })
      results['payload_find_select_ids'] = res
    } catch (e) {
      const err = e as Error
      results['payload_find_select_ids_error'] = { message: err?.message, stack: err?.stack }
    }

    // 3) Payload count — already known to work; include for completeness
    try {
      const count = await payload.count({ collection: 'initiatives', where: {} })
      results['payload_count'] = count
    } catch (e) {
      const err = e as Error
      results['payload_count_error'] = { message: err?.message, stack: err?.stack }
    }

    // 4) Full Payload find — the one that currently 500s; capture exact error
    try {
      const res = await payload.find({ collection: 'initiatives', depth, limit, overrideAccess: true })
      results['payload_find_full'] = res
    } catch (e) {
      const err = e as Error
      results['payload_find_full_error'] = { message: err?.message, stack: err?.stack }
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    const err = e as Error
    return new Response(
      JSON.stringify({ message: err?.message ?? 'Unknown error', stack: err?.stack }, null, 2),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    )
  }
}