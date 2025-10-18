# Plan: kolekcja Posts

Ten plan opisuje dodanie nowej kolekcji `posts` w aplikacji `payload-litewkateampl` oraz sposób jej weryfikacji (migracje, preview, testy).

## Kontekst i styl projektu
- Zobacz istniejące kolekcje w `docs/collections.md`:
  - `users` (auth)
  - `media` (publiczny odczyt, upload do R2)
  - `docs` (publiczny odczyt, pola: `title`, `description`, `file` upload)
- Admin: `useAsTitle` używany do wyświetlania rekordów.
- Bindingi: D1/R2 wybierane przez `CLOUDFLARE_ENV` (zdalne w preview i deploy).

## Cel
- Dodać kolekcję `posts` do publikacji treści blogowych/artykularnych.
- Publiczny odczyt (lista i szczegóły), tworzenie/edycja przez zalogowanych użytkowników.

## Model danych (propozycja)
- `title: text (required)` — tytuł posta.
- `slug: text (required, unique)` — unikalny slug, generowany z tytułu (hook, tylko gdy brak).
- `status: select ['draft', 'published'] (default: 'draft')` — status publikacji.
- `publishedAt: date` — data publikacji, automatycznie ustawiona przy przejściu w `published` (hook, jeśli brak).
- `content: richText` — treść (Lexical editor).
- `image: upload (relationTo: 'media')` — opcjonalna grafika wyróżniająca.
- `author: relationship (relationTo: 'users')` — autor posta.

## Admin i dostęp
- `admin.useAsTitle: 'title'`.
- `access.read: () => true` — publiczny odczyt.
- (opcjonalnie w przyszłości) `access.create/update`: wymaga zalogowania (rolowanie uprawnień po stronie `users`).

## Hooki
- `beforeValidate`: ustawia `slug` na podstawie `title`, jeśli nie podano.
- `beforeChange`: ustawia `publishedAt` (ISO) przy zmianie `status` na `published`, jeśli `publishedAt` jest puste.

## Integracja
- Import i dopięcie `Posts` w `src/payload.config.ts` (lista `collections`).
- Generacja typów (`yarn generate:types`) — opcjonalnie po wdrożeniu.

## Migracje i preview (dev)
- Migracje D1 (zdalne, dev):
  - `CLOUDFLARE_ENV=dev yarn deploy:database`
- Lokalny preview (OpenNext → Workers, z bindingami dev):
  - `CLOUDFLARE_ENV=dev yarn preview` → `http://localhost:8787`
  - Weryfikacja UI: `/admin/collections/posts` (status `200/302`, brak `SQLITE_ERROR`).

## Testy
- Smoke (Vitest) — można rozszerzyć o prostą weryfikację `/api/posts?limit=1`.
- Integracyjne — dodanie testów tworzenia posta (po uwierzytelnieniu).

## Kroki implementacji
1) Utworzyć `src/collections/Posts.ts` z polami i hookami (jak wyżej).
2) Dodać `import { Posts } from './collections/Posts'` i `Posts` do `collections` w `src/payload.config.ts`.
3) Uruchomić migracje dla dev: `CLOUDFLARE_ENV=dev yarn deploy:database`.
4) Uruchomić preview: `CLOUDFLARE_ENV=dev yarn preview`; sprawdzić panel admin.
5) (Opcjonalnie) dodać wpis do `docs/collections.md` o `posts`.
6) Commit i push zmian.