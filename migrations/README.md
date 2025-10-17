# Migrations — D1 (Payload)

Ten folder zbiera ustalenia dot. migracji dla D1 używanej przez Payload.

## Jak uruchamiać migracje

- Zalecana komenda (wybiera środowisko przez `CLOUDFLARE_ENV`):
  - `CLOUDFLARE_ENV=dev yarn deploy:database`
  - `CLOUDFLARE_ENV=prod yarn deploy:database`
- Co robi `deploy:database`:
  - Uruchamia `payload migrate` (generuje/aktualizuje schemat DB na podstawie kolekcji),
  - Wykonuje `wrangler d1 execute D1 --command 'PRAGMA optimize' --env=$CLOUDFLARE_ENV --remote`.

## Środowiska

- Zmienna `CLOUDFLARE_ENV` wybiera sekcję `env.<env>` z `wrangler.jsonc` (binding do D1).
- Migracje są wykonywane na zdalnym D1 (`--remote`).

## Dobre praktyki

- Zmieniaj schemat kolekcji w kodzie (Payload), a następnie uruchamiaj `deploy:database`.
- Po migracjach sprawdź `/admin/collections/docs` na środowisku docelowym (brak `SQLITE_ERROR`).
- W CI nie uruchamiaj migracji na prod — tylko DEV/STAGE.

## Rozwiązywanie problemów

- `no such table: ...` — uruchom `deploy:database` dla właściwego `CLOUDFLARE_ENV`.
- `Missing secret key` — ustaw sekret przez `wrangler secret put PAYLOAD_SECRET --env=<env>`.
- Błędy R2 — upewnij się, że `wrangler.jsonc` ma `jurisdiction: "eu"` dla `r2_buckets`.

## Lokalnie

- Podgląd lokalny: `CLOUDFLARE_ENV=dev yarn preview` (OpenNext, HTTP `:8787`).
- Migracje lokalne nie są wymagane — operujemy na zdalnym D1.