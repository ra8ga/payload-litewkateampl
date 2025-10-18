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
- Po migracjach sprawdź panel admin i dowolną kolekcję (np. `/admin/collections/<slug>`) na środowisku docelowym (brak `SQLITE_ERROR`).
- W CI nie uruchamiaj migracji na prod — tylko DEV/STAGE.

## Rozwiązywanie problemów

- `no such table: ...` — uruchom `deploy:database` dla właściwego `CLOUDFLARE_ENV`.
- `Missing secret key` — ustaw sekret przez `wrangler secret put PAYLOAD_SECRET --env=<env>`.
- Błędy R2 — upewnij się, że `wrangler.jsonc` ma `jurisdiction: "eu"` dla `r2_buckets`.

## Lokalnie

- Podgląd lokalny: `CLOUDFLARE_ENV=dev yarn preview` (OpenNext, HTTP `:8787`).
- Migracje lokalne nie są wymagane — operujemy na zdalnym D1.

## Migracje lokalne vs zdalne — różnice

- Cel:
  - Lokalnie: szybka walidacja schematu i debug przy `preview` (`wrangler dev/preview`) z D1 w trybie lokalnym.
  - Zdalnie: zastosowanie migracji na docelowym środowisku (`env.dev`/`env.prod`) w bazie D1 w chmurze.
- Konfiguracja i zmienne:
  - Lokalnie: `NODE_ENV=development`, kontekst z `wrangler` i `--local` dla `wrangler d1 execute`.
  - Zdalnie: `NODE_ENV=production`, `CLOUDFLARE_ENV=<env>`, `--remote` dla `wrangler d1 execute`.
- Bindingi:
  - Oba tryby używają bindingu `D1` z `wrangler.jsonc`; w trybie podglądu (`preview`) D1 działa lokalnie nawet gdy w pliku jest `remote: true`.
- Komendy referencyjne:
  - Lokalnie:
    - `cross-env NODE_ENV=development PAYLOAD_SECRET=ignore payload migrate`
    - `wrangler d1 execute D1 --local --command 'PRAGMA optimize'`
  - Zdalnie:
    - `CLOUDFLARE_ENV=dev yarn deploy:database`
    - `CLOUDFLARE_ENV=prod yarn deploy:database`
- Kiedy który tryb:
  - Lokalnie: gdy chcesz odtworzyć błędy `SQLITE_ERROR` lub sprawdzić nową migrację bez dotykania zdalnej bazy.
  - Zdalnie: standardowy cykl wdrożeniowy na DEV/STAGE/PROD.

## Najczęstsze błędy i rozwiązania

- `no such table: <nazwa>` — migracje nie zostały zastosowane na wskazanym środowisku.
  - Rozwiązanie: uruchom `yarn deploy:database` z właściwym `CLOUDFLARE_ENV` lub lokalnie `payload migrate` i sprawdź binding `D1`.
- `SQLITE_ERROR` na `/admin/collections/...` po deployu
  - Przyczyna: brak migracji, niezgodność schematu, niedokończone indeksy.
  - Rozwiązanie: ponów migracje na właściwym env; sprawdź logi `wrangler tail --env=<env> --remote`.
- `Missing secret key` podczas migracji/uruchomienia w prod
  - Rozwiązanie: `wrangler secret put PAYLOAD_SECRET --env=prod`; dla lokalnych/zdalnych DEV użyj `PAYLOAD_SECRET=ignore` w komendzie migracji.
- `FOREIGN KEY constraint failed` lub `mismatch`
  - Rozwiązanie: zweryfikuj typy i klucze w kolekcjach Payload; upewnij się, że `relationTo` odpowiada faktycznym tabelom, a migracje tworzą indeksy/kolumny zgodne.
- `This Worker does not exist` przy `wrangler tail`
  - Rozwiązanie: użyj bazowej nazwy Workera i właściwego `--env`, np. `wrangler tail payload-litewkateampl --env=dev`.
- Błędy R2 (np. „bucket not found” lub jurysdykcja)
  - Rozwiązanie: upewnij się, że `wrangler.jsonc` ma `jurisdiction: "eu"` dla `r2_buckets` i że istnieje bucket dla danego env (`payload-litewkateampl` lub `payload-litewkateampl-dev`).

## Szybkie scenariusze

- Lokalny preview + migracja lokalna:
  - `CLOUDFLARE_ENV=dev yarn preview`
  - `cross-env NODE_ENV=development PAYLOAD_SECRET=ignore payload migrate`
  - `wrangler d1 execute D1 --local --command 'PRAGMA optimize'`
  - Weryfikacja: panel admin i dowolna kolekcja (np. `/admin/collections/<slug>`) na `http://localhost:8787`.
- Zdalna migracja DEV:
  - `CLOUDFLARE_ENV=dev yarn deploy:database`
  - Weryfikacja: `curl -I https://payload-litewkateampl-dev.spottedx.workers.dev/admin/collections/<slug>` → `200` lub `302`.
- Zdalna migracja PROD:
  - `wrangler secret put PAYLOAD_SECRET --env=prod`
  - `CLOUDFLARE_ENV=prod yarn deploy:database`
  - Weryfikacja jak wyżej na hostname prod.

## RichText (Lexical) — seedy muszą być JSON

- Pole `richText` w Payload (Lexical) musi zawierać poprawny JSON (string). Wstawienie zwykłego tekstu skutkuje błędem `500 Internal Server Error` oraz komunikatem w logach: `SyntaxError: ... is not valid JSON`.
- Przy seedzie używaj `JSON.stringify(...)` i przekazuj wartość jako parametr do zapytania SQL (np. przez `db.run(sql\`... ${json} ...\`)`). Nie zapisuj czystego tekstu do kolumny `content`.
- Minimalna struktura Lexical (przykład):

```json
{
  "root": {
    "type": "root",
    "version": 1,
    "format": "",
    "indent": 0,
    "children": [
      {
        "type": "paragraph",
        "version": 1,
        "format": "",
        "indent": 0,
        "children": [
          { "type": "text", "version": 1, "text": "Przykładowy tekst.", "detail": 0, "format": 0 }
        ]
      }
    ]
  }
}
```

- Przykładowa migracja „patch” aktualizująca `content` na poprawny JSON (wykorzystana w case `posts`): `src/migrations/20251018_160150_patch_posts_content_json.ts`.

## Wnioski (case: posts)

- Dodanie nowej kolekcji wymaga uruchomienia migracji D1 na właściwym środowisku (`CLOUDFLARE_ENV=dev|prod yarn deploy:database`) — inaczej `/api/<slug>` zwróci `SQLITE_ERROR` / `no such table`.
- Seedy dla `richText` muszą być JSON (Lexical). Tekst wstawiony bez JSON powoduje 500 oraz błąd parsera.
- Preview lokalny używa bindingów do D1 — jeżeli wskazuje na zdalne env (dev/prod), migracje muszą być zastosowane tam.
- Seedy na produkcji: świadomie akceptuj (w tym projekcie pozostawiamy 2 rekordy przykładowe). W razie potrzeby przewidź migracje „cleanup”.
- Weryfikacja po migracjach: sprawdź `/api/<slug>` oraz `/admin/collections/<slug>`. Przykład:
  - `curl -i https://payload-litewkateampl-dev.spottedx.workers.dev/api/posts` → oczekiwany `200` i lista.
