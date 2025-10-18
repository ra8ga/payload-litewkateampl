import fs from 'node:fs'

const BASE = 'http://localhost:8787'
const cookie = 'payload-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiY29sbGVjdGlvbiI6InVzZXJzIiwiZW1haWwiOiJzbW9rZS5hZG1pbkBleGFtcGxlLmNvbSIsInNpZCI6IjU2NTg1YzA4LWEwNzgtNGYxNC04NjQ2LTdjYjg4YjFiZWU4ZCIsImlhdCI6MTc2MDc3Mzc5NiwiZXhwIjoxNzYwNzgwOTk2fQ.QfZ3SlXqKRoKKKAWT_LV6gZcHe0e93sEJhLGMZ2Pz5s'

async function main() {
  // Verify session
  const meRes = await fetch(`${BASE}/api/users/me`, { headers: { cookie } })
  if (!meRes.ok) throw new Error(`me failed: ${meRes.status}`)
  // Prepare form
  const buf = fs.readFileSync('/Users/rafalfurmaga/spottedx-fe/test-logo.png')
  const blob = new Blob([buf], { type: 'image/png' })
  const form = new FormData()
  form.append('file', new File([blob], 'test-logo.png', { type: 'image/png' }))
  form.append('data', JSON.stringify({ alt: 'Smoke test logo' }))
  // Upload
  const upRes = await fetch(`${BASE}/api/media`, {
    method: 'POST',
    body: form,
    headers: { cookie },
    redirect: 'manual',
  })
  const upText = await upRes.text()
  let created
  try { created = JSON.parse(upText) } catch {}
  if (!upRes.ok) {
    console.error('Upload failed', upRes.status, upText)
    process.exit(1)
  }
  const doc = created?.doc ?? created
  if (!doc?.id) { console.error('No doc id', upText); process.exit(1) }
  const id = doc.id
  // Retrieve
  const getRes = await fetch(`${BASE}/api/media/${id}`, { redirect: 'manual' })
  if (!getRes.ok) throw new Error(`get failed: ${getRes.status}`)
  const got = await getRes.json()
  const filename = got?.filename || got?.file?.filename
  console.log(JSON.stringify({ status: upRes.status, id, filename }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })