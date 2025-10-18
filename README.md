# Payload Litewkateam PL — README

Dokumentacja tej aplikacji znajduje się w `./docs/`.

Spis treści dokumentacji (apps/payload-litewkateampl/docs/):

- `collections.md` — opis kolekcji i pól w Payload (Docs, Media, Users)
- `deployment.md` — instrukcja wdrożenia aplikacji na Cloudflare Workers (D1, R2, Assets)
- `environments.md` — jak działa localhost vs Cloudflare (przegląd, komendy, różnice)
- `migrations.md` — migracje D1 (komendy i dobre praktyki)
- `tests.md` — podejście do testów (smoke bash, smoke Vitest, integracyjne, E2E Playwright) oraz jak uruchamiać
- FAQ: zobacz `docs/environments.md#faq`

## Testy — podejście i uruchamianie

- Warstwy: smoke po-deploy (`tests/smoke.sh`), smoke przez Vitest (`tests/smoke.spec.ts`), integracyjne (`tests/int/**`), E2E przez Playwright (`tests/e2e/**`).
- Uruchamianie:
  - Bash smoke: `CLOUDFLARE_ENV=prod yarn smoke:test`
  - Vitest smoke: `CLOUDFLARE_ENV=prod yarn smoke:test:vitest`
  - E2E: `yarn test:e2e`
- Host/ENV: ustaw `CLOUDFLARE_ENV` (dev/prod) lub `SMOKE_BASE` dla własnego hosta.
- Szczegóły i kryteria akceptacji znajdziesz w `./docs/tests.md`.

Lokalizacja w monorepo: `apps/payload-litewkateampl/`.
