# Propositions v2: Struktura i testy — plan i standardy

## Cele
- Uprościć nawigację, ograniczyć „szum” w root, ujednolicić warstwy testów, zmniejszyć flaky.

## Stan bazowy (po refaktorze)
- Configi: `tests/config/vitest.config.mts`, `tests/e2e/playwright.config.ts`
- Setup: `tests/setup/vitest.setup.ts`
- Skrypty: `test:int` (tylko integracyjne), `test:smoke` (alias na Vitest smoke), `test:e2e` (Playwright), `test:ci` (int → smoke → e2e)
- Playwright `webServer.command`: `yarn dev`

## Docelowa struktura
- `tests/`
  - `int/**` — testy integracyjne
  - `smoke/**` — szybkie sprawdzenia HTTP
  - `e2e/**` — scenariusze UI (Playwright)
  - `setup/` — `vitest.setup.ts`
  - `config/` — `vitest.config.mts`
- `scripts/` — `smoke.sh` (opcjonalnie `smoke.ts`)
- `docs/` — `tests.md`

## Zmiany obowiązkowe (DONE)
- Przeniesienie configów i setupu do `tests/...`
- Naprawa `webServer` na `yarn dev`
- Rozdzielenie `test:int` i smoke, dodanie `test:smoke` oraz `test:ci`
- Uaktualniona dokumentacja ścieżek i CI

## Dalsze usprawnienia (opcjonalne)
- `.env.test` + jawne ładowanie w Vitest/Playwright (`DOTENV_CONFIG_PATH`)
- `scripts/smoke.ts` (Node/TS) zamiast bash dla przenośności
- `cloudflare-env.d.ts` → `src/types/` (porządek typów)
- `migrations/README.md` z konwencją i sposobem uruchamiania
- Ujednolicenie `engines` (Yarn; rozważyć usunięcie `pnpm`)
- Artefakty Playwright (reporter HTML, `outputDir`) w CI

## CI pipeline (propozycja)
- PR/CI: `yarn test:ci`
- Post‑deploy: `yarn smoke:test` na docelowym środowisku (`CLOUDFLARE_ENV`/`SMOKE_BASE`)
- Nightly: `yarn test:e2e` — rozszerzone scenariusze

## Ryzyka i mitigacje
- esbuild/wrangler w Node: separacja smoke vs int (zrobione) i pin wersji
- Dev server dla E2E: `reuseExistingServer: true` i krótki timeout na zimnym starcie
- R2 EU: wymuś `jurisdiction: "eu"` w `wrangler.jsonc` i w CLI

## Definition of Done
- `yarn test:ci` zielone lokalnie i w CI
- Dokumentacja testów aktualna i zwięzła
- Brak duplikacji coverage/zakresów między warstwami

## Plan na kolejne kroki (jeśli zdecydujemy się)
- Wdrożyć `.env.test` i `scripts/smoke.ts`
- Dodać `migrations/README.md`
- Uporządkować `engines` pod Yarn