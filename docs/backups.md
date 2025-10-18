# Backups — D1 i R2 (wrangler + opcjonalnie S3)

Ten dokument opisuje, jak wykonywać kopie zapasowe bazy D1 oraz plików w R2 dla aplikacji `payload-litewkateampl` przy użyciu `wrangler` (pobieranie obiektów) oraz opcjonalnie S3 API (listowanie kluczy dla pełnego mirrora, gdy Data Catalog nie jest dostępny lub nie obejmuje zwykłych obiektów).

## Lokalizacja backupów

- Wszystkie backupy zapisujemy w folderze aplikacji: `apps/payload-litewkateampl/backups/`.
- Struktura:
  - `backups/d1/<env>/<timestamp>.sql.gz` — eksport bazy D1, skompresowany.
  - `backups/r2/<env>/...` — kopie plików z bucketa R2.
  - `backups/logs/<timestamp>-<env>.log` — pełny log operacji backupu.

Dzięki temu kopie zapasowe pozostają lokalnie w repo aplikacji — nie w katalogu monorepo nadrzędnym.

## Wymagania

- `node` + `npx` (Yarn/Node środowisko)
- `wrangler` (globalnie lub przez `npx`)
- Konto Cloudflare z dostępem do projektu
- `.env.backup` w folderze aplikacji zawierające co najmniej:
  - `CLOUDFLARE_ACCOUNT_ID=<id>`
  - `R2_PRIMARY_BUCKET_DEV=payload-litewkateampl-dev` lub `R2_PRIMARY_BUCKET_PROD=payload-litewkateampl`
  - Opcjonalnie: `R2_JURISDICTION=eu` (domyślnie `eu`) dla operacji na buckecie w UE
  - Opcjonalnie (dla listowania przez R2 SQL): `R2_SQL_WAREHOUSE=<nazwa-warehouse>`

## Komendy

- Dry‑run (bez realnego eksportu/pobierania):
  - `bash scripts/backup.sh --dry-run dev`
  - `bash scripts/backup.sh --dry-run prod`
- Pełny backup:
  - `bash scripts/backup.sh dev`
  - `bash scripts/backup.sh prod`

Możesz też ustawić środowisko przez zmienną: `CLOUDFLARE_ENV=dev bash scripts/backup.sh`.

## Co robi skrypt

- D1: `wrangler d1 export <D1_NAME> --remote --output ...` i kompresuje do `.sql.gz`.
- R2: pobiera obiekty przez `wrangler r2 object get --remote --jurisdiction <jurisdiction>` do `backups/r2/<env>/`.
- Jurysdykcja: domyślnie `eu` (można zmienić przez `R2_JURISDICTION`).
- Logi: każdy run zapisuje pełny log w `backups/logs/`.

## Listowanie obiektów R2

Aby automatycznie pobrać wszystkie obiekty, skrypt potrzebuje listy kluczy. Zapewniamy ją na trzy sposoby:

1) Manifest kluczy (prosty plik tekstowy):
- Utwórz plik `scripts/r2-keys-dev.txt` (lub `scripts/r2-keys-prod.txt`), każda linia to ścieżka obiektu (np. `media/2025/10/image.png`).
- Skrypt automatycznie użyje `scripts/r2-keys-<env>.txt` jako manifestu, jeśli istnieje.

2) S3 — pełny mirror bez manifestu:
- Skrypt korzysta z `@aws-sdk/client-s3` tylko do listowania kluczy w R2 (pobieranie nadal robi `wrangler`).
- W `.env.backup` ustaw wymagane zmienne:
  - `R2_ACCESS_KEY_ID=<...>`
  - `R2_SECRET_ACCESS_KEY=<...>`
  - `R2_S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (dla UE używamy endpointu z jurysdykcją EU)
- Uruchomienie jest automatyczne podczas backupu: skrypt wywołuje `scripts/list-s3-keys.mjs`, zapisuje manifest do `backups/r2/<env>/.keys.manifest`, a następnie pobiera obiekty przez `wrangler`.
- Wymagania techniczne: `forcePathStyle=true`, `region=auto` (zrobione w skrypcie), poprawny endpoint zgodny z kontem/bucketem.

3) R2 Data Catalog SQL (open‑beta):
- Włącz Data Catalog na buckecie: `CLOUDFLARE_ACCOUNT_ID=<id> npx wrangler r2 bucket catalog enable <bucket>`.
- Sprawdź status: `CLOUDFLARE_ACCOUNT_ID=<id> npx wrangler r2 bucket catalog get <bucket>`.
- Ustaw `R2_SQL_WAREHOUSE=<nazwa-warehouse>` w `.env.backup`.
- Skrypt wykona zapytanie: `wrangler r2 sql query <warehouse> "SELECT key FROM r2.objects WHERE bucket = '<bucket>'"` i zbuduje listę kluczy.
- SQL listing wymaga tokenu: `WRANGLER_R2_SQL_AUTH_TOKEN` (lub fallback `CLOUDFLARE_API_TOKEN`).
  - Utwórz token z uprawnieniem `R2 Data Catalog` w Cloudflare Dashboard.
  - Dodaj do `apps/payload-litewkateampl/.env.backup` zmienną `WRANGLER_R2_SQL_AUTH_TOKEN` (lub fallback `CLOUDFLARE_API_TOKEN`).
  - Skrypt przekazuje ten token automatycznie do `wrangler r2 sql query`.

Jeśli katalog nie jest włączony i nie podasz manifestu, skrypt pokaże bezpieczne komunikaty z instrukcjami.

## Jurysdykcja EU — dlaczego ważna

- Buckety R2 działają w określonej jurysdykcji; dla UE używamy `--jurisdiction eu`.
- Ustaw `R2_JURISDICTION=eu` w `.env.backup` (domyślnie tak jest), aby uniknąć błędów typu „bucket does not exist” przy operacjach.

## Przykładowe `.env.backup`

```
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=b68f146d8cd0693998364d48e5f512a4

# D1
D1_DATABASE_NAME_DEV=payload-litewkateampl
D1_DATABASE_NAME_PROD=payload-litewkateampl

# R2 (primary buckets)
R2_PRIMARY_BUCKET_DEV=payload-litewkateampl-dev
R2_PRIMARY_BUCKET_PROD=payload-litewkateampl
R2_JURISDICTION=eu

# R2 SQL (opcjonalnie, gdy używasz Data Catalog)
R2_SQL_WAREHOUSE=payload-litewkateampl
```

## Troubleshooting

- „The specified bucket does not exist”: dodaj `--jurisdiction eu` (skrypt robi to automatycznie) lub ustaw `R2_JURISDICTION=eu`.
- „Data catalog is not enabled”: włącz przez `wrangler r2 bucket catalog enable <bucket>` i ustaw `R2_SQL_WAREHOUSE`.
- Brak listy obiektów: dodaj manifest `scripts/r2-keys-<env>.txt`.
- Puste backupy R2: sprawdź czy bucket ma obiekty (`wrangler r2 object put/get`).

## Zależności i zakres użycia

- `wrangler` — eksport D1 oraz pobieranie obiektów R2.
- `@aws-sdk/client-s3` — tylko listowanie kluczy R2 (opcjonalne). Pobieranie nadal przez `wrangler`.
- Nie używamy `rclone`.

## Klucze i sekrety — gdzie trzymamy, co jest wymagane

- Lokalny plik `apps/payload-litewkateampl/.env.backup` (gitignore):
  - Zawiera: `CLOUDFLARE_ACCOUNT_ID`, nazwy bucketów (`R2_PRIMARY_BUCKET_DEV/PROD`), `R2_JURISDICTION`, opcjonalnie `R2_SQL_WAREHOUSE`, oraz (dla S3 listowania) `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_S3_ENDPOINT`.
  - Plik jest ignorowany przez Git (`apps/payload-litewkateampl/.gitignore` ma wpis `.env.backup`). Nie commitujemy sekretów.
- Cloudflare „Secrets” (wrangler secret) służą do Workerów; ten backup jest wykonywany lokalnie, więc korzysta z lokalnych zmiennych `.env.backup` i/lub z konfiguracji `wrangler whoami`/API tokenu.
- D1 vs R2 — różnice w dostępie:
  - D1: `wrangler d1 export` używa Twojej sesji/API tokenu z `wrangler` oraz `CLOUDFLARE_ACCOUNT_ID`. Nie potrzeba dodatkowych S3 poświadczeń.
  - R2: do pobierania obiektów używamy `wrangler r2 object get` (wymaga konta i jurysdykcji EU). Do listowania pełnego bez Data Catalog używamy S3‑kompatybilnych kluczy (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_S3_ENDPOINT`).
- Jeśli wolisz nie trzymać kluczy S3 lokalnie, możesz:
  - Używać manifestu ręcznie (bez S3).
  - Włączyć R2 Data Catalog i używać `WRANGLER_R2_SQL_AUTH_TOKEN` zamiast S3.

## Bezpieczeństwo

- Nie commituj `.env.backup` (jest w `.gitignore`).
- Jeśli ustawiasz zmienne na maszynie CI, ustaw je jako sekrety środowiskowe CI. W workerach używaj `wrangler secret` — ale nie dotyczy tego lokalnego backupu.