import { describe, it, expect } from 'vitest'

const env = process.env.CLOUDFLARE_ENV ?? 'prod'
const BASE = process.env.SMOKE_BASE ?? `https://payload-litewkateampl-${env}.spottedx.workers.dev`

function b64ToUint8(base64: string) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/users/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual' as RequestRedirect,
  })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {}
  const token: string | undefined = json?.token
  const setCookie = res.headers.get('set-cookie') || undefined
  return { res, token, setCookie }
}

describe('upload smoke', () => {
  it('POST /api/media -> creates dummy image and is retrievable', async () => {
    const email = process.env.SMOKE_EMAIL
    const password = process.env.SMOKE_PASSWORD

    if (!email || !password) {
      console.warn('⚠ Ustaw SMOKE_EMAIL i SMOKE_PASSWORD, aby uruchomić test uploadu.')
      expect(true).toBe(true)
      return
    }

    const { token, setCookie } = await login(email, password)
    expect(token || setCookie).toBeTruthy()

    // 1x1 PNG base64
    const pngB64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2kH20AAAAASUVORK5CYII='
    const bytes = b64ToUint8(pngB64)
    const blob = new Blob([bytes], { type: 'image/png' })

    const form = new FormData()
    form.append('file', new File([blob], 'dummy.png', { type: 'image/png' }))
    form.append('alt', 'dummy image')

    const headers: Record<string, string> = {}
    if (token) headers['authorization'] = `Bearer ${token}`
    if (!token && setCookie) headers['cookie'] = setCookie

    const createRes = await fetch(`${BASE}/api/media`, {
      method: 'POST',
      body: form,
      headers,
      redirect: 'manual' as RequestRedirect,
    })

    expect([200, 201]).toContain(createRes.status)

    const text = await createRes.text()
    let created: any = null
    try {
      created = JSON.parse(text)
    } catch {}

    // payload REST create returns created doc
    const doc = created?.doc ?? created
    expect(doc).toBeTruthy()
    const id = doc?.id
    expect(id).toBeTruthy()

    // Verify retrieval (public read access)
    const getRes = await fetch(`${BASE}/api/media/${id}`, { redirect: 'manual' as RequestRedirect })
    expect(getRes.status).toBe(200)
    const got = (await getRes.json()) as any
    expect(got?.id).toBe(id)
    // check some upload fields
    const hasFilename = !!(got?.filename || got?.file?.filename)
    expect(hasFilename).toBe(true)
  })
})