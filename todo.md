# TODO: Preview route na własnej domenie i migracja sekretów

## Problem
Spróbowałem dodać `routes` dla `litewka.team/payload-preview/*` w `env.prod`, ale Cloudflare zwróciło błąd:

> Could not find zone for `litewka.team`. Make sure the domain is set up to be proxied by Cloudflare.

To oznacza, że strefa DNS `litewka.team` nie jest przypięta do **tego** konta Cloudflare, na którym działa Worker. Nie można tworzyć tras (`routes`) dla stref, których konto nie posiada.

## Na czym to polega
- Trasy Workerów (`routes`) działają tylko w ramach domen/stref zarządzanych przez bieżące konto CF.
- Domena musi być dodana do Cloudflare i mieć włączone proxy (pomarańczowa chmurka) na rekordzie, który ma obsługiwać Worker.
- Dopiero wtedy `wrangler` może dodać regułę: np. `your-zone.tld/payload-preview/*` kierującą ruch do Workera.

## Co można zrobić
1. Podpiąć domenę do właściwego konta Cloudflare:
   - Dodać `litewka.team` do konta CF i ustawić NS na Cloudflare.
   - Upewnić się, że rekordy DNS (np. `payload-preview`) są proxy (pomarańczowa chmurka).
2. Dodać route w `wrangler.jsonc`:
   ```jsonc
   {
     "env": {
       "prod": {
         "routes": [
           { "pattern": "cms-preview.litewka.team/*" }
         ]
       }
     }
   }
   ```
3. Alternatywy, jeśli domena nie jest dostępna na tym koncie:
   - Użyć `workers.dev` jako preview (już działa): `https://payload-litewkateampl-prod.spottedx.workers.dev`.
   - Cloudflare Pages Preview (jeśli masz projekt Pages) i reverse proxy do Workera.
   - Tymczasowy subdomenowy host na strefie, którą masz na bieżącym koncie CF.

## Migracja do pełnych `wrangler secrets` (zrobione)
- Usunięto `env.prod.vars.PAYLOAD_SECRET` z `wrangler.jsonc`.
- Wdrożenie bez `vars` (żeby zwolnić binding).
- Dodano sekret przez `wrangler secret put PAYLOAD_SECRET --env=prod`.
- Ponownie wdrożono i zweryfikowano smoke-test: OK.

## Dalsze kroki
- Jeśli chcesz preview na `litewka.team`, podaj strefę na właściwym koncie CF albo alternatywną domenę na tym koncie. Wtedy włączę trasę i powtórzę deploy + test.
- Rozszerzyć smoke-test o dodatkowe ścieżki (np. `admin/login`, `api/users/me`) i prosty check treści.