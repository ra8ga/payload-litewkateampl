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

## Po deployu: Smoke test

- Automatyczny smoke test uruchamia się po `yarn deploy:app`.
- Alternatywnie możesz uruchomić smoke testy przez Vitest:
  - `CLOUDFLARE_ENV=prod yarn smoke:test:vitest` lub z własnym hostem `SMOKE_BASE=https://payload-litewkateampl-prod.spottedx.workers.dev yarn smoke:test:vitest`
  - Zakres (Vitest):
    - `GET /api/docs?limit=1` → `200` i JSON z kluczem `docs`
    - `GET /admin` → `200` lub `302`
    - `GET /admin/login` → `200` lub `302` (gdy `200`, sprawdza treść: `Payload`/`Sign In` oraz miękkie ostrzeżenia dla `email`/`password` w HTML)
    - `GET /admin/collections/docs` → `200` lub `302`
    - `GET /api/users/me` → `200` (ma `user`) lub `401` (ma `errors`)
    - `POST /api/graphql` (Docs query) → `200` i `data.Docs`
    - `GET /api/graphql-playground` → `200` lub `404` (akceptowane w prod)

## Cloudflare: Workers, D1 i R2 (EU)

- Platforma: aplikacja działa na `Cloudflare Workers` (OpenNext) z bazą `D1` i storage `R2`.
- Bindings (wrangler.jsonc):
  - `D1` — baza danych (SQLite na Workers); używana przez Payload do kolekcji i migracji.
  - `R2` — bucket na pliki (media) używany przez plugin `@payloadcms/storage-r2`.
- Jurysdykcja danych: `R2` musi być utworzony z jurysdykcją `EU`.
  - Potwierdza spełnienie wymagań lokalizacji danych i zgodność regulacyjną.

### D1 — baza danych
- Migracje: `CLOUDFLARE_ENV=<env> yarn deploy:database` (wykonuje `payload migrate` i `wrangler d1 execute D1 'PRAGMA optimize'`).
- Binding: `wrangler.jsonc -> env.<env>.d1_databases[]` z `binding: "D1"`.
- Debug: sprawdzaj `/admin/collections/docs` po migracjach (brak `SQLITE_ERROR`).

### R2 — bucket (EU)
- Nazwa: `payload-litewkateampl` (binding `R2`).
- Wymagane: utworzenie w jurysdykcji `EU`.
- Zalecana procedura (ostrożnie: usunięcie bucketu usuwa pliki!):
  - Usuń bieżący bucket: `wrangler r2 bucket delete payload-litewkateampl`
  - Utwórz ponownie w EU: `wrangler r2 bucket create payload-litewkateampl --jurisdiction eu`
  - Zweryfikuj listę: `wrangler r2 bucket list`
- Bindingi w `wrangler.jsonc` muszą zawierać `jurisdiction: "eu"` (root oraz `env.dev`/`env.prod`):
  - `wrangler.jsonc -> r2_buckets[]` z `binding: "R2"`, `bucket_name: "payload-litewkateampl"`, `jurisdiction: "eu"`.
- Payload plugin: w `src/payload.config.ts` skonfigurowany `r2Storage({ bucket: cloudflare.env.R2, collections: { media: true } })`.

### Weryfikacja po zmianie R2 na EU
- Deploy aplikacji: `CLOUDFLARE_ENV=<env> yarn deploy:app`.
- Sprawdź jurysdykcję i lokalizację bucketa:
  - `wrangler r2 bucket info payload-litewkateampl --jurisdiction eu --json` → oczekiwane `location: "EEUR"`.
- Test uploadu (Vitest):
  - Ustaw `SMOKE_EMAIL` i `SMOKE_PASSWORD` dla konta z uprawnieniami uploadu.
  - `CLOUDFLARE_ENV=<env> SMOKE_EMAIL=you@example.com SMOKE_PASSWORD=secret yarn smoke:test:upload`
  - Oczekiwane wyniki:
    - `POST /api/media` → `200/201`, odpowiedź zawiera utworzony dokument z `id`
    - `GET /api/media/:id` → `200` i `filename` (lub `file.filename`)
