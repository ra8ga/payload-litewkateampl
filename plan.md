# Plan środowisk — Cloudflare Workers (payload-litewkateampl)

Cel: lokalna praca na `localhost` i Workers preview, z bazą D1 w trybie lokalnym (mirror schematu produkcyjnego) oraz z R2 w wersji deweloperskiej (`payload-litewkateampl-dev`).

## Założenia
- Menedżer pakietów: `yarn`
- Katalog aplikacji: `apps/payload-litewkateampl`
- Zasoby Cloudflare (istniejące):
  - D1: `payload-litewkateampl`
  - R2 (prod): `payload-litewkateampl`
  - R2 (dev): `payload-litewkateampl-dev`
- Wymagane narzędzia: `wrangler ~4.43`, `node ^18.20.2 || >=20.9.0`, konto CF z dostępem do D1/R2.

## Konfiguracja wrangler.jsonc (wymagana)
Aby lokalnie używać D1 w trybie lokalnym oraz dev-bucket R2:
- Upewnij się, że w `env.dev.r2_buckets[0].bucket_name` jest `payload-litewkateampl-dev`.
- D1 pozostaje zbindowane jako `binding: "D1"` (bez zmian), lokalny tryb zapewni `wrangler dev/preview`.

Przykład sekcji (fragment):
```
"env": {
  "dev": {
    "name": "payload-litewkateampl-dev",
    "d1_databases": [{
      "binding": "D1",
      "database_id": "017ab6aa-526e-4e10-8cca-e5624874d2ed",
      "database_name": "payload-litewkateampl",
      "remote": true
    }],
    "r2_buckets": [{
      "binding": "R2",
      "bucket_name": "payload-litewkateampl-dev",
      "jurisdiction": "eu"
    }]
  }
}
```
Uwaga: w trybie podglądu lokalnego (`preview`) D1 będzie działać lokalnie, nawet jeśli w pliku widnieje `remote: true` — decyduje tryb uruchomienia (`wrangler dev/preview`).

## Checklist — Lokalnie (localhost + Workers preview)
- [x] Ustaw `CLOUDFLARE_ENV=dev` (korzystamy z sekcji `env.dev`).
- [x] Zaktualizuj `wrangler.jsonc`, aby `env.dev` wskazywało `R2` na `payload-litewkateampl-dev`.
- [x] Uruchom Next na `localhost:3000`: `yarn dev` (uruchomione na `localhost:3001` — port 3000 był zajęty).
- [x] Uruchom Workers preview (lokalny worker + lokalne D1): `CLOUDFLARE_ENV=dev yarn preview` (HTTP `http://localhost:8787`).
- [x] Wykonaj migracje D1 w trybie lokalnym (mirror schematu prod):
  - `cross-env NODE_ENV=development PAYLOAD_SECRET=ignore payload migrate`
  - `wrangler d1 execute D1 --local --command 'PRAGMA optimize'`
- [x] Zweryfikuj `/admin/collections/docs` na `localhost:8787` (200/302 OK).
- [ ] Zweryfikuj operacje plikowe idą do R2 dev (patrz „R2 upload smoke test — lokalny preview”).

## Checklist — PROD (opcjonalnie)
- [ ] Ustaw sekrety: `wrangler secret put PAYLOAD_SECRET --env=prod`
- [ ] Migracje D1 (prod, remote): `CLOUDFLARE_ENV=prod yarn deploy:database`
- [ ] Build + deploy Workera (prod): `CLOUDFLARE_ENV=prod yarn deploy:app`
- [ ] Weryfikacja `/admin/collections/docs` i tail logów: `wrangler tail --env=prod --remote`

## Polecenia referencyjne
- Lokalny Workers preview (D1 lokalnie + R2 dev):
  - Start: `CLOUDFLARE_ENV=dev yarn preview`
  - Migracje D1 (lokalnie): `cross-env NODE_ENV=development PAYLOAD_SECRET=ignore payload migrate`
  - Optymalizacja: `wrangler d1 execute D1 --local --command 'PRAGMA optimize'`
- Next (localhost):
  - `yarn dev`
- DEV deploy (zdalne środowisko, gdy potrzebne):
  - `CLOUDFLARE_ENV=dev yarn deploy:app` lub `CLOUDFLARE_ENV=dev yarn deploy`
- PROD deploy:
  - `CLOUDFLARE_ENV=prod yarn deploy:app`

## Weryfikacja
- D1 lokalnie:
  - `wrangler d1 execute D1 --local --command 'PRAGMA user_version'` (sprawdzenie, że DB działa).
  - Jeśli zobaczysz `no such table: ...`, uruchom lokalne migracje (`payload migrate` z `NODE_ENV=development`) i odśwież preview.
- R2 dev:
  - Test upload: `yarn smoke:test:upload` (skrypt korzysta z bindingu `R2`, który w `env.dev` wskazuje dev-bucket).
- Endpoint:
  - `curl -I http://localhost:8787/admin/collections/docs` → 200/302 OK.

### R2 upload smoke test — lokalny preview
- Cel: sprawdzić zapis plików do dev bucketa R2 oraz odpowiedzi API podczas uploadu.
- Wymagania: użytkownik z uprawnieniami uploadu w kolekcji `Users`.
- Kroki:
  - Utwórz użytkownika w Admin: `http://localhost:8787/admin/collections/users`.
  - Ustaw zmienne: `SMOKE_EMAIL`, `SMOKE_PASSWORD`; opcjonalnie `SMOKE_BASE=http://localhost:8787`, `CLOUDFLARE_ENV=dev`.
  - Uruchom test: `SMOKE_BASE=http://localhost:8787 CLOUDFLARE_ENV=dev SMOKE_EMAIL=<email> SMOKE_PASSWORD=<password> yarn smoke:test:upload`.
- Oczekiwane wyniki:
  - `POST /api/media` → `200/201` i zwraca utworzony dokument z `id`.
  - `GET /api/media/:id` → `200` i odpowiedź zawiera `filename` (lub `file.filename`).
- Alternatywa (ręcznie):
  - Wejdź na `http://localhost:8787/admin/collections/media` i wgraj plik.
  - Potwierdź, że plik trafia do bucketa `payload-litewkateampl-dev` (binding `R2` w `env.dev`).
- O co w tym chodzi:
  - Lokalny preview korzysta z bindingów `env.dev`; plugin `@payloadcms/storage-r2` zapisuje pliki bezpośrednio do wskazanego bucketa.
  - Test odtwarza realny przepływ: logowanie → upload → odczyt, weryfikując integrację Worker+D1+R2.
  - Zapewnia, że środowisko deweloperskie nie zapisuje do produkcyjnego bucketa i że schemat D1 obsługuje Media.
- Migracje lokalne uruchamiaj z `NODE_ENV=development` — dzięki temu w `src/payload.config.ts` użyte zostaną lokalne bindingi z Wranglera i D1 będzie lokalne.
- Na produkcję zawsze uruchamiaj migracje z `NODE_ENV=production` i `--remote` (jak w `deploy:database`).
- Dev-bucket R2 (`payload-litewkateampl-dev`) stosuj w całym cyklu deweloperskim; prod-bucket (`payload-litewkateampl`) tylko w `env.prod`.
- Tail logów lokalnych odbywa się standardowo przez konsolę procesu preview; dla zdalnych: `wrangler tail --env=<env> --remote`.