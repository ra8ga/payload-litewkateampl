# Propositions: porządkowanie struktury i testów

Cel: uprościć nawigację po projekcie, ograniczyć „szum” w katalogu głównym aplikacji, uczytelnić warstwy testów i wyrównać konfiguracje narzędzi (Vitest/Playwright/CF). Poniżej wariant minimalny (A) i porządki opcjonalne (B).

## TL;DR (rekomendacje na szybko)

- Napraw w Playwright `webServer.command`: użyj `yarn dev` zamiast `pnpm dev` (obecnie monorepo używa Yarn).  
- Zostaw pliki konfiguracyjne (Vitest/Playwright/Wrangler) w root — to standard i prostota.  
- Delikatnie posprzątaj testy: dodaj `tests/setup/` i przenieś `vitest.setup.ts` tam; w Vitest wskaż nową ścieżkę.  
- Rozważ `.env.test` zamiast `test.env` i jawne ładowanie w setupie testów.  
- Dodaj skrypt `test:smoke` i "all-in-one" `test:ci`.

---

## Obserwacje

- Konfiguracje w root (`vitest.config.mts`, `vitest.setup.ts`, `playwright.config.ts`, `wrangler.jsonc`) są czytelne i zgodne z konwencjami narzędzi.  
- `playwright.config.ts` używa `webServer: { command: 'pnpm dev' }` — to może nie działać w tym monorepo (Yarn).  
- Testy są dobrze podzielone: `tests/e2e`, `tests/int`, `tests/smoke`.  
- W `package.json` istnieją sensowne skrypty, ale można je lekko ujednolicić.

## Wariant A — minimalne zmiany (rekomendowane)

1) Playwright: dopasuj webServer do Yarn

- Plik: `playwright.config.ts`
- Zmień:

```ts
webServer: {
  command: 'yarn dev',
  reuseExistingServer: true,
  url: 'http://localhost:3000',
},
```

2) Vitest setup → `tests/setup/`

- Przenieś plik `vitest.setup.ts` do `tests/setup/vitest.setup.ts`.
- W `vitest.config.mts` zaktualizuj:

```ts
export default defineConfig({
  // ...
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts', 'tests/smoke/**/*.spec.ts'],
  },
})
```

3) Ujednolicenie env dla testów

- Zamiast `test.env` rozważ `.env.test` i jawne ładowanie w setupie Vitest:

```ts
// tests/setup/vitest.setup.ts
import { config as dotenv } from 'dotenv'
dotenv({ path: '.env.test' })
```

- Playwright już używa `import 'dotenv/config'` — można wskazać plik przez `DOTENV_CONFIG_PATH=.env.test` w skrypcie:

```json
{
  "scripts": {
    "test:e2e": "cross-env DOTENV_CONFIG_PATH=.env.test NODE_OPTIONS=\"--no-deprecation --no-experimental-strip-types\" playwright test"
  }
}
```

4) Skrypty testowe (jasny podział)

- W `package.json` dołóż:

```json
{
  "scripts": {
    "test:smoke": "vitest run tests/smoke/**/*.spec.ts --config ./vitest.config.mts",
    "test:ci": "yarn test:int && yarn test:smoke && yarn test:e2e"
  }
}
```

5) Dokumentacja

- W `docs/tests.md` dodaj krótką sekcję „Struktura testów i configów”: gdzie leżą setupy i jak ładowane są env-y (Vitest/Playwright).

Korzyści: szybkie, bezpieczne poprawki; minimalne ryzyko regresji; root pozostaje zgodny z konwencjami narzędzi.

---

## Wariant B — porządki katalogów (opcjonalne)

Jeśli chcesz mocniej odchudzić root aplikacji, możesz:

1) Przenieść setup i konfiguracje testów do `tests/config`

- Nowe pliki:
  - `tests/config/vitest.config.mts`
  - `tests/setup/vitest.setup.ts`
  - `tests/e2e/playwright.config.ts`

- Aktualizacja skryptów:

```json
{
  "scripts": {
    "test:int": "vitest run --config ./tests/config/vitest.config.mts",
    "test:smoke": "vitest run tests/smoke/**/*.spec.ts --config ./tests/config/vitest.config.mts",
    "test:e2e": "playwright test -c ./tests/e2e/playwright.config.ts"
  }
}
```

- Uwaga: to wymaga przekazywania ścieżek `--config` i jest mniej standardowe.

2) `scripts/` → Node/TS

- Rozważ zamianę `scripts/smoke.sh` na `scripts/smoke.ts` (lepsza przenośność Windows/macOS/Linux).  
- Uruchamiaj przez `tsx` lub `ts-node` (devDependency), albo zwykły Node (po transpilacji).

3) `cloudflare-env.d.ts` → `src/types/`

- Dla spójności typów aplikacyjnych można trzymać d.ts w `src/types/`.  
- TS i tak obejmuje `**/*.ts`/`**/*.d.ts`, więc to czysto porządkowe.

4) `migrations/` — opis i konwencja nazewnicza

- Dodaj `migrations/README.md` z krótką instrukcją generowania i stosowania migracji.  
- Ustal konwencję nazw: `YYYYMMDD_HHMMSS.ext` (już stosowana), opisz rolę plików `.json` vs `.ts`.

5) `src/app/(...)` — czytelniejsze grupy

- Jeśli `(frontend)` i `(payload)` są stabilne, to w porządku.  
- Alternatywnie: `(marketing)`, `(admin)`, `(api)` — ważna jest konsekwencja i jasność domeny.

6) Standaryzacja narzędzi

- Sekcja `engines` wymaga pnpm, ale monorepo używa Yarn — rozważ usunięcie `pnpm` z `engines` lub przejście całkowicie na pnpm w monorepo.  
- Jeżeli zostajesz przy Yarn, zmień w Playwright `webServer.command` na `yarn dev` (Wariant A) i rozważ usunięcie `pnpm` z `engines`.

---

## Proponowane zmiany (checklista)

- [ ] Playwright `webServer.command` → `yarn dev` (lub wyłączyć `webServer`, gdy testujesz środowisko zewnętrzne)  
- [ ] `vitest.setup.ts` → `tests/setup/vitest.setup.ts` i aktualizacja ścieżki w `vitest.config.mts`  
- [ ] `.env.test` i jawne ładowanie env (Vitest/Playwright)  
- [ ] Skrypty: `test:smoke`, `test:ci`  
- [ ] (Opcjonalnie) przenieś konfiguracje do `tests/config` i zaktualizuj skrypty  
- [ ] (Opcjonalnie) `scripts/smoke.sh` → `scripts/smoke.ts`  
- [ ] (Opcjonalnie) `cloudflare-env.d.ts` → `src/types/`  
- [ ] (Opcjonalnie) `migrations/README.md` i doprecyzowanie konwencji  
- [ ] (Opcjonalnie) zrewiduj `engines` (pnpm vs Yarn)

---

## Uwagi dot. Cloudflare/Wrangler

- `wrangler.jsonc` pozostaw w root — narzędzie domyślnie go tam szuka.  
- R2: obowiązkowo `jurisdiction: "eu"` w bindingach (root/dev/prod).  
- Tworzenie bucketa: `wrangler r2 bucket create <name> --jurisdiction eu`  
- Weryfikacja: `wrangler r2 bucket info <name> --jurisdiction eu --json` → `location: "EEUR"`.

---

## Co zrobimy, jeśli zaakceptujesz wariant A

- Zmienimy `playwright.config.ts` (`webServer.command` → `yarn dev`).  
- Przeniesiemy `vitest.setup.ts` do `tests/setup/` i poprawimy ścieżkę w `vitest.config.mts`.  
- Dodamy skrypty `test:smoke` i `test:ci`.  
- (Opcjonalnie) Zmienimy `test.env` → `.env.test` i doładujemy w setupie testów.

Czas: ~10–15 min, niski risk.

## Co zrobimy, jeśli wybierzesz wariant B

- Dodatkowo przeniesiemy configi do `tests/config` i dostosujemy skrypty.  
- (Opcjonalnie) Zmienimy skrypt smoke na Node/TS, dodamy `migrations/README.md`, uporządkujemy `engines`.

Czas: ~30–60 min, średni risk (wymagana walidacja CI).