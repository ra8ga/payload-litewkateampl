# Plan backupów (D1 + R2)

Cel
- Zapewnić szybkie, powtarzalne snapshoty D1 i kopie R2.
- Najpierw ręczna automatyzacja i lokalny katalog `backups/`, później CI i replikacja.

Zakres
- Środowiska: `dev` i `prod`.
- Zasoby: baza `D1`, pliki w `R2` (media/assets).

Struktura katalogu `backups/`
- `backups/d1/<env>/YYYYMMDD-HHMMSS.sql.gz` — snapshot bazy.
- `backups/r2/<env>/` — mirror plików z bucketa R2 (lokalna kopia).
- (Opcjonalnie) `backups/logs/<date>.txt` — logi z przebiegu.

Pełny backup — ręczna automatyzacja
- D1 (PROD):
```
TS=$(date -u +'%Y%m%d-%H%M%S')
npx wrangler d1 export <D1_DATABASE_NAME_PROD> --remote --output backups/d1/prod/$TS.sql
gzip backups/d1/prod/$TS.sql
```
- R2 (PROD, lokalna kopia do `backups/` przez rclone):
```
# wymagane: rclone + zdefiniowany remote `r2` (S3 compatible do R2)
rclone sync r2:<PRIMARY_BUCKET_PROD> backups/r2/prod --checksum --fast-list --transfers=16
```
- DEV: analogicznie, zamień nazwy na `..._DEV` i katalogi `dev/`.

Minimalna wersja — co implementujemy
- Skrypt `scripts/backup.sh` (parametr `CLOUDFLARE_ENV=prod|dev`):
  - Eksport D1 → `backups/d1/<env>/<TS>.sql`, kompresja `gzip`.
  - Mirror R2 → `backups/r2/<env>/` przez `rclone sync`.
  - Logowanie do `backups/logs/`.
- Plik `.env.backup` z wymaganymi wartościami (patrz sekcja Sekrety).
- Konwencja nazewnictwa: `YYYYMMDD-HHMMSS` w UTC.

Odtwarzanie — skrót
- D1 (time‑travel do ostatnich 30 dni):
```
npx wrangler d1 time-travel restore <D1_DATABASE_NAME_PROD> --timestamp 2025-01-05T02:15:00Z
```
- D1 (ze snapshotu `.sql.gz`):
```
gunzip -c backups/d1/prod/<TS>.sql.gz > /tmp/restore.sql
npx wrangler d1 execute <D1_DATABASE_NAME_PROD> --remote --file /tmp/restore.sql
```
- R2 (przywrócenie wybranych plików):
```
rclone copy backups/r2/prod r2:<PRIMARY_BUCKET_PROD> --checksum --transfers=16
# uwaga: `copy` nie usuwa plików w buckecie; do pełnej rekonstrukcji użyj `sync` ostrożnie
```

Strategie i opcje rozbudowy
- CI (GitHub Actions) cron: codziennie 02:00 UTC
  - D1 eksport + `gzip`, upload do backupowego bucketa R2.
  - R2 mirror: `rclone sync` PRIMARY→BACKUP bucket.
  - Retencja: usuwanie plików >90 dni.
- Cloudflare Workflows + R2 Events: near‑real‑time replikacja PUT/DELETE między bucketami.
- Szyfrowanie snapshotów D1: `age` z kluczami publicznymi zespołu.
- Lifecycle w backup bucketach: automatyczna retencja i archiwizacja (cold storage).
- Miesięczny test odtwarzania (fire‑drill) na środowisku DEV.

Sekrety / ENV
- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- `D1_DATABASE_NAME_PROD`, `D1_DATABASE_NAME_DEV`.
- R2 (rclone S3): `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, nazwy bucketów.
- (Opcjonalnie) `AGE_RECIPIENTS` do szyfrowania snapshotów.

Checklista “backup pełny”
- Ustaw `CLOUDFLARE_ENV` (prod/dev).
- Uruchom `scripts/backup.sh`.
- Sprawdź: powstał plik `backups/d1/<env>/<TS>.sql.gz` (rozmiar > 0).
- Sprawdź: `backups/r2/<env>/` zawiera najnowsze pliki (porównaj liczebność).
- Zapisz log: `backups/logs/<date>.txt`.

Ryzyka / uwagi
- Duże buckety R2: pierwsza kopia może trwać długo — używaj `--fast-list` i równoległości.
- `sync` do R2 może usuwać pliki — testuj na DEV i rozważ `copy`.
- Snapshoty przechowuj poza repozytorium git (lokalny `backups/` nie commitujemy).
- Nie zapisuj żadnych realnych sekretów w repo (trzymaj je w menedżerze sekretów).

Następne kroki
- Utworzyć `scripts/backup.sh` + `.env.backup`.
- Skonfigurować `rclone` remote do R2.
- Dodać job “backup-d1-r2” w CI (opcjonalnie).