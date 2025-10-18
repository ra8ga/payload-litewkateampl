import { describe, it, expect } from 'vitest'

// Base host resolution
const env = process.env.CLOUDFLARE_ENV ?? 'prod'
const BASE = process.env.SMOKE_BASE ?? `https://payload-litewkateampl-${env}.spottedx.workers.dev`

// Helper to POST GraphQL
async function postGraphQL(query: string) {
  const res = await fetch(`${BASE}/api/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
    // avoid redirect following for consistent status checks
    redirect: 'manual' as RequestRedirect,
  })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  return { res, text, json }
}

describe('smoke', () => {
  it('GET /api/docs?limit=1 -> 200 and has "docs"', async () => {
    const res = await fetch(`${BASE}/api/docs?limit=1`, { redirect: 'manual' as RequestRedirect })
    expect(res.status).toBe(200)
    const data = (await res.json()) as any
    expect(data && 'docs' in data).toBe(true)
  })

  it('GET /admin -> 200 or 302', async () => {
    const res = await fetch(`${BASE}/admin`, { redirect: 'manual' as RequestRedirect })
    expect([200, 302]).toContain(res.status)
  })

  it('GET /admin/login -> 200 or 302; content check when 200', async () => {
    const res = await fetch(`${BASE}/admin/login`, { redirect: 'manual' as RequestRedirect })
    expect([200, 302]).toContain(res.status)
    if (res.status === 200) {
      const html = await res.text()
      const hasKeyword = /payload|sign\s*in/i.test(html)
      expect(hasKeyword).toBe(true)
      // Soft (non-failing) checks for labels that may be client-hydrated
      const hasEmailText = /email/i.test(html)
      const hasPasswordText = /password/i.test(html)
      // Log warnings without failing
      if (!hasEmailText) console.warn('⚠ /admin/login: missing "email" text (acceptable)')
      if (!hasPasswordText) console.warn('⚠ /admin/login: missing "password" text (acceptable)')
    }
  })

  it('GET /admin/collections/docs -> 200 or 302', async () => {
    const res = await fetch(`${BASE}/admin/collections/docs`, { redirect: 'manual' as RequestRedirect })
    expect([200, 302]).toContain(res.status)
  })

  it('GET /api/users/me -> 200(user) or 401(errors)', async () => {
    const res = await fetch(`${BASE}/api/users/me`, { redirect: 'manual' as RequestRedirect })
    expect([200, 401]).toContain(res.status)
    const body = await res.text()
    const json: any = JSON.parse(body)
    if (res.status === 200) {
      expect(json && 'user' in json).toBe(true)
    } else if (res.status === 401) {
      expect(json && 'errors' in json).toBe(true)
    }
  })

  it('POST /api/graphql -> Docs query returns data.Docs and 200', async () => {
    const { res, json } = await postGraphQL('query { Docs(limit: 1) { docs { id } } }')
    expect(res.status).toBe(200)
    expect(json && json.data && 'Docs' in json.data).toBe(true)
  })

  it('GET /api/graphql-playground -> 200 or 404', async () => {
    const res = await fetch(`${BASE}/api/graphql-playground`, { redirect: 'manual' as RequestRedirect })
    expect([200, 404]).toContain(res.status)
  })
})