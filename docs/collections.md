# Kolekcje Payload

## users
- `slug: 'users'`, `auth: true`.
- Panel admin: `useAsTitle: 'email'`.
- Pola: domyślnie `email` + mechanizmy haseł i sesji.
- Migracje tworzą tabele: `users`, `users_sessions` oraz indeksy (`users_email_idx`).

## media
- `slug: 'media'`, publiczny odczyt (`access.read: () => true`).
- Pole: `alt: text` (wymagane).
- Upload na `R2`; przy Workerach wyłączone `crop` i `focalPoint` (brak `sharp`).

## docs
- `slug: 'docs'`, publiczny odczyt (`access.read: () => true`).
- Pola: `title: text (required)`, `description: textarea`, `file: upload (relationTo: 'media', required)`.

## posts
- `slug: 'posts'`, publiczny odczyt (`access.read: () => true`).
- Pola: `title: text (required)`, `slug: text (unique)`, `status: select ('draft'|'published')`, `publishedAt: date`, `content: richText`, `image: upload (relationTo: 'media')`, `author: relationship (relationTo: 'users')`.
- Hooki: generowanie `slug` z `title`; ustawianie `publishedAt` przy statusie `published`.