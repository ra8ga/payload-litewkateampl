# Localhost vs Cloudflare — jak działa aplikacja (DEV/PROD)

Ten dokument wyjaśnia różnice między uruchomieniem aplikacji lokalnie (localhost) a działaniem w środowisku Cloudflare (dev/prod). Zawiera praktyczne komendy, zachowania i checklisty.

## Szybkie porównanie

### Localhost (Next dev)
- Komenda: `yarn dev`
- Host: `http://localhost:3000`
- Platforma: Node.js dev server (Next)
- D1/R2: brak natywnych bindingów; operacje Payload zależne od Workers mogą nie działać
- Testy: `yarn test:e2e` (otwiera dev server), `yarn smoke:test:vitest` (wymaga hosta)
- Logi: konsola dev/przeglądarka
- Sekrety: zwykle niepotrzebne; gdy wymagane, użyj tymczasowych wartości lokalnie

### Lokalny preview (Workers)
- Komenda: `yarn preview`
- Host: `http://localhost:8787`
- Platforma: OpenNext (symulacja Cloudflare Worker) z zdalnymi bindingami
- D1/R2: zdalne bindingi według `CLOUDFLARE_ENV`
- Migracje: lokalne (`--local`) lub zdalne
- Testy: `yarn smoke:test:vitest`, `yarn test:e2e`
- Logi: `wrangler tail` pomocniczo
- Sekrety: wczytywane z wranglera/remote bindings

### Cloudflare (DEV/PROD)
- Komenda: `yarn deploy:app` (po `yarn deploy:database`)
- Host: `https://payload-litewkateampl-<env>.spottedx.workers.dev`
- Platforma: Cloudflare Workers (produkcyjnie)
- D1/R2: bindingi `D1` i `R2` (jurysdykcja EU)
- Testy: automatyczny smoke (`yarn smoke:test`) po deployu; `yarn test:e2e` na host prod/dev
- Logi: `wrangler tail payload-litewkateampl --env=<env>`
- Sekrety: `wrangler secret put PAYLOAD_SECRET` per środowisko
- GraphQL Playground: `200` lub `404` (akceptowalne w prod)

## Localhost (Next dev)

- Uruchomienie: `yarn dev` → serwer Next na `http://localhost:3000`.
- Przeznaczenie: szybki rozwój UI/React, bez pełnej emulacji środowiska Cloudflare Workers.
- Baza i storage:
  - D1 (SQLite na Workers) nie jest natywnie dostępne w trybie Node dev.
  - Operacje Payload zależne od Cloudflare bindings mogą nie w pełni działać.
- Testy:
  - E2E: `yarn test:e2e` otwiera `yarn dev` jako `webServer` i klika UI.
  - Smoke (Vitest): `yarn smoke:test:vitest` (wymaga hosta — domyślnie workers.dev lub `SMOKE_BASE`).
- Kiedy używać: codzienny frontend, praca nad komponentami, routingiem i CSS.

## Lokalny preview (OpenNext → Cloudflare Workers)

- Uruchomienie: `yarn preview` → `http://localhost:8787`.
- Co się dzieje:
  - Buduje się aplikacja przez OpenNext (`opennextjs-cloudflare build`).
  - Startuje lokalna symulacja Cloudflare Workers z zdalnymi bindingami (D1/R2).
  - Wybór środowiska przez `CLOUDFLARE_ENV=dev|prod`.
- Zalety:
  - Realistyczne zachowanie Workera (routing, fetch, limitacje środowiska, redirecty).
  - Sprawdzenie panelu admin oraz kolekcji Payload (np. `/admin/collections/<slug>`) i błędów typu `SQLITE_ERROR` bez deployu.
- Uwaga: preview korzysta z "remote bindings" wranglera — to nadal komunikacja ze zdalnym D1 i R2.

## Cloudflare (DEV/PROD)

- Wdrożenie:
  - Migracje: `yarn deploy:database` → uruchamia `payload migrate` i `wrangler d1 execute D1 'PRAGMA optimize'` (zdalnie, wg `CLOUDFLARE_ENV`).
  - Aplikacja: `yarn deploy:app` → buduje i publikuje Workera (OpenNext), po czym uruchamia smoke (`tests/smoke.sh`).
- Hostname:
  - `https://payload-litewkateampl-<env>.spottedx.workers.dev` (np. `-dev`, `-prod`).
- Bindingi:
  - D1: `binding: "D1"` w `wrangler.jsonc`.
  - R2: `binding: "R2"`, `jurisdiction: "eu"` (wymóg zgodności lokalizacji danych).
- Sekrety:
  - `PAYLOAD_SECRET` w prod: `wrangler secret put PAYLOAD_SECRET --env=prod`.
- Logi i debug:
  - `wrangler tail payload-litewkateampl --env=<env>`.
  - Jeżeli widzisz `"This Worker does not exist"`, użyj bazowej nazwy Workera i poprawnego `--env`.
- Statusy endpointów (akceptacja):
  - `/admin` i `/admin/login` → `200` lub `302` (redirecty są poprawne).
  - `/api/users/me` → `200` (z `user`) lub `401` (z `errors`).
  - GraphQL Playground w prod → `404` akceptowalne.

## Migracje: lokalne vs zdalne (skrót)

- Lokalna migracja (pod preview):
  - `cross-env NODE_ENV=development PAYLOAD_SECRET=ignore payload migrate`
  - `wrangler d1 execute D1 --local --command 'PRAGMA optimize'`
  - Weryfikacja: panel admin i dowolna kolekcja (np. `/admin/collections/<slug>`) na `http://localhost:8787`.
- Zdalna migracja (dev/prod):
  - `CLOUDFLARE_ENV=<env> yarn deploy:database`
  - Weryfikacja: `curl -I https://payload-litewkateampl-<env>.spottedx.workers.dev/admin/collections/<slug>` → `200` lub `302`.
- Typowe błędy i rozwiązania: zobacz `./migrations.md` (sekcja „Różnice lokalne vs zdalne” i „Typowe błędy”).

## Testy: smoke, integracyjne i E2E

- Smoke (bash) po deployu: `yarn deploy:app` odpala `tests/smoke.sh`.
- Smoke (Vitest): `yarn smoke:test:vitest` (domyślny host wg `CLOUDFLARE_ENV`, można podać `SMOKE_BASE`).
- Upload smoke (Vitest): `yarn smoke:test:upload` → wymaga `SMOKE_EMAIL` i `SMOKE_PASSWORD`.
- Integracyjne (Vitest): `yarn test:int`.
- E2E (Playwright): `yarn test:e2e`.

## Zmienne środowiskowe (ważne)

- `CLOUDFLARE_ENV=dev|prod` — wybór środowiska dla preview, deployu i smoke.
- `SMOKE_BASE` — nadpisanie hosta (np. pełny `https://...workers.dev`).
- `SMOKE_EMAIL`, `SMOKE_PASSWORD` — konto do testu uploadu.
- `PAYLOAD_SECRET` (prod) — ustawiane przez `wrangler secret put`.

## Sekrety: gdzie trzymamy

- Produkcja (Cloudflare): sekrety przechowywane w Workerze (`wrangler secret put ...`) per środowisko (`--env=dev|prod`).
- Lokalny preview/migracje: używaj tymczasowych wartości w komendzie (np. `PAYLOAD_SECRET=ignore`) lub `.env.test` wyłącznie dla testów; nie commituj prawdziwych sekretów.
- Localhost (Next dev): zwykle nie wymagane; jeśli potrzebne, ustaw tymczasowe zmienne tylko lokalnie.
- Zasada: brak realnych sekretów w repo; `.env.example` dokumentuje co ustawić, `.env.test` służy do testów.

## Gdzie szukać więcej

- Deploy i checklista: `./deployment.md`.
- Migracje i typowe błędy: `./migrations.md`.
- Testy i troubleshoot: `./tests.md`.