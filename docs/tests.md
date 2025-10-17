# Testy: podejście, warstwy i uruchamianie

Celem testów jest szybka i wiarygodna weryfikacja kluczowych funkcji aplikacji w różnych środowiskach (dev/prod) z uwzględnieniem specyfiki Cloudflare Workers.

## Warstwy testów

- Smoke (bash)
  - Skrypt: `scripts/smoke.sh`
  - Cel: szybka weryfikacja po deployu (statusy, podstawowa treść)
  - Zakres: `/api/docs`, `/admin`, `/admin/login` (miękkie sprawdzenia tekstów), `/admin/collections/docs`, `/api/users/me`, `/api/graphql`, `/api/graphql-playground`
  - Akceptacja: dopuszczalne redirecty `302`, `401` dla nieautoryzowanego `/api/users/me`, `404` dla GraphQL Playground w produkcji

- Smoke (Vitest)
  - Plik: `tests/smoke/smoke.spec.ts`
  - Cel: standaryzowana wersja smoke dla CI oraz lokalnego uruchamiania
  - Bezpośrednie wywołania HTTP do hosta (konfigurowalnego przez `SMOKE_BASE`/`CLOUDFLARE_ENV`)
  - Sprawdza te same ścieżki co wersja bash; w `/admin/login` ostrzeżenia dla tekstów `email`/`password` (UI może być renderowane po stronie klienta)

- Integracyjne (Vitest)
  - Folder: `tests/int/**`
  - Cel: testy z użyciem lokalnego `getPayload` i konfiguracji Payload; bez zewnętrznych wywołań
  - Wymagania: środowisko Node zgodne z konfiguracją, lokalne uruchomienie Payload (uwaga na zależności wrangler/esbuild)

- E2E (Playwright)
  - Folder: `tests/e2e/**`
  - Cel: weryfikacja UI po hydratacji, nawigacji, elementów formularza
  - Przykładowy smoke-e2e: asercje na `/admin/login` (pola email/password, przycisk „Sign In”), sprawdzenie redirectów

## Środowiska i host

- `CLOUDFLARE_ENV` — wybór środowiska (`dev`, `prod`) do smoke testów
- `SMOKE_BASE` — nadpisanie docelowego hosta (np. `https://payload-litewkateampl-prod.spottedx.workers.dev`)

## Uruchamianie

- Po deployu (bash smoke):
  - `CLOUDFLARE_ENV=prod yarn deploy:app` (wykonuje automatycznie `yarn smoke:test`)
  - Ręcznie: `CLOUDFLARE_ENV=prod yarn smoke:test`
- Vitest smoke:
  - `CLOUDFLARE_ENV=prod yarn smoke:test:vitest`
  - Niestandardowy host: `SMOKE_BASE=https://twoj-host.example.com yarn smoke:test:vitest`
- Integracyjne (lokalnie):
  - `yarn test` lub `vitest run` (uwaga: integracyjne mogą wymagać lokalnych zależności Payload)
- Playwright (E2E):
  - `yarn test:e2e` (zgodnie z `playwright.config.ts`)

## Kryteria i akceptacja

- Redirecty `302` do `/admin/login` dla stron admina — akceptowalne
- `/api/users/me` — `200` (treść zawiera `user`) lub `401` (treść zawiera `errors`)
- GraphQL Playground w prod — `404` akceptowalne
- `/admin/login` — miękkie sprawdzenia tekstów `email`/`password` w HTML (może być renderowane po stronie klienta)

## Struktura katalogów

- `tests/smoke/smoke.spec.ts` — smoke przez Vitest
- `tests/int/**/*.int.spec.ts` — testy integracyjne (Payload lokalnie)
- `tests/e2e/**/*.spec.ts` — UI/E2E (Playwright)
- `scripts/smoke.sh` — smoke po-deploy (bash)

## Rekomendacje CI

- Pre-deploy: `yarn test` (unit + integracja) oraz `yarn smoke:test:vitest` wskazując DEV/STAGE host
- Post-deploy: automatycznie `yarn smoke:test` (bash)
- Regularnie (np. nightly): `yarn test:e2e` dla scenariuszy UI

## Rozszerzanie

- Dodawaj kolejne ścieżki do smoke (bash/Vitest) z prostą weryfikacją treści
- Dla endpointów z autoryzacją — jasno określ dopuszczalne statusy i klucze w JSON
- W Playwright — testy hydratacji, interakcji i nawigacji

## Rozwiązywanie problemów

- Błąd wrangler/esbuild w Vitest: uruchamiaj wyłącznie `tests/smoke/smoke.spec.ts` (`yarn smoke:test:vitest`), aby izolować smoke od integracji
- Brak elementów formularza w HTML na `/admin/login`: sprawdź przez Playwright (po hydratacji) lub pozostaw miękkie ostrzeżenia w smoke

---

Lokalizacja: `/Users/rafalfurmaga/spottedx-fe/apps/payload-litewkateampl/docs/tests.md`.