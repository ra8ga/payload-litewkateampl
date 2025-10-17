# Deployment: payload-litewkateampl na Cloudflare Workers

Poniżej znajdziesz sprawdzoną (wzorową) procedurę wdrożenia aplikacji `payload-litewkateampl` na Cloudflare Workers z D1 (SQL) i R2 (storage).

## Wymagania

- Zainstalowany `node` i `yarn`
- Zainstalowany `wrangler` (`npm i -g wrangler` lub przez `yarn dlx`)
- Konto Cloudflare i skonfigurowany `wrangler.jsonc` (D1, R2, Assets, environments)
- Dostęp do repo: `/Users/rafalfurmaga/spottedx-fe/apps/payload-litewkateampl`

## Środowisko dev (zalecane na start)

1. Ustaw zmienną środowiskową:
   - Linux/macOS: `export CLOUDFLARE_ENV=dev`
   - Jednorazowo w komendzie: `CLOUDFLARE_ENV=dev <komenda>`
2. Zastosuj migracje D1 na zdalnym dev:
   - `CLOUDFLARE_ENV=dev yarn deploy:database`
3. Zbuduj i wdroż aplikację (Worker + Assets):
   - `CLOUDFLARE_ENV=dev yarn deploy:app`
   - Alternatywnie: `CLOUDFLARE_ENV=dev yarn deploy`
4. Zweryfikuj działanie:
   - `curl -I https://payload-litewkateampl-dev.spottedx.workers.dev/admin/collections/docs` → oczekiwane `200`
   - Sprawdź też: `/admin`, `/admin/login`, `/api/users/me`
5. Podejrzyj logi błędów (opcjonalnie):
   - `wrangler tail payload-litewkateampl --env=dev --status=error`

## Środowisko production

1. Sekrety:
   - Ustaw `PAYLOAD_SECRET` dla prod: `wrangler secret put PAYLOAD_SECRET --env=prod`
2. Upewnij się, że `wrangler.jsonc` ma sekcję `env.prod` (bindings do D1/R2/Assets itd.).
3. Migracje D1 na prod:
   - `CLOUDFLARE_ENV=prod yarn deploy:database`
4. Build + deploy aplikacji na prod:
   - `CLOUDFLARE_ENV=prod yarn deploy:app`
5. Weryfikacja:
   - Sprawdź kluczowe endpointy (jak w dev) na hostname prod.

## Szybka checklista

- [ ] `wrangler.jsonc` zawiera `env.dev` i/lub `env.prod`
- [ ] D1 (migracje) wdrożone: `deploy:database`
- [ ] Worker i Assets wdrożone: `deploy:app`
- [ ] `admin/collections/docs` zwraca `200` i nie ma błędów `SQLITE_ERROR`
- [ ] `wrangler tail` nie pokazuje błędów wykonania

## Rozwiązywanie problemów

- `net::ERR_ABORTED` w przeglądarce: zwykle efekt redirectu (np. do `/admin/login`), zmiany widoku lub restartu. Sprawdź statusy przez `curl`.
- „This Worker does not exist”: w `wrangler tail` podaj bazową nazwę Workera oraz `--env=...`, np. `wrangler tail payload-litewkateampl --env=dev`.
- Brak tabeli (np. `no such table: docs`): uruchom ponownie migracje (`deploy:database`) dla właściwego środowiska.
- „Missing secret key” w prod: ustaw `PAYLOAD_SECRET` przez `wrangler secret put` dla odpowiedniego env.

## Lokalne preview (pomocniczo)

- `CLOUDFLARE_ENV=dev yarn preview` uruchamia lokalny serwer (OpenNext) pod `http://localhost:8787`.
- Wejście na `/admin/collections/docs` pozwala szybko zweryfikować UI i DB.

---

Lokalizacja tego pliku: `/Users/rafalfurmaga/spottedx-fe/apps/payload-litewkateampl/docs/deployment.md`.
