# Aktualizacja formularza kontaktowego — integracja z Payload

Data: 2025-10-15
Zakres: dodanie kolekcji ContactMessages w Payload, endpointu `/api/contact` w web-frontend oraz podłączenie istniejącego komponentu `ContactForm` do realnej wysyłki.

## Podsumowanie
- Dodano kolekcję `contactMessages` w Payload, przechowującą zgłoszenia z formularza.
- Dodano serwerowy endpoint w Next.js: `POST /api/contact` (relay do Payload), aby uniknąć CORS i trzymać klucze po stronie serwera.
- Zmieniono `ContactForm`, aby wysyłał dane do `/api/contact` zamiast symulacji.
- Zweryfikowano działanie lokalnie; UI bez błędów.

## Zmiany w kodzie
- `apps/payload-litewkateam/src/collections/ContactMessages.ts`
  - Nowa kolekcja z polami: `name`, `email`, `phone`, `message`, `status`, `consent`, `receivedAt`.
  - Access:
    - `create: true` (publiczny, umożliwia wysyłkę z formularza),
    - `read/update/delete`: tylko zalogowani użytkownicy (panel admina).
  - Hook `beforeChange`: automatycznie ustawia `receivedAt` jeśli brak.

- `apps/payload-litewkateam/src/payload.config.ts`
  - Dodano kolekcję `ContactMessages` do tablicy `collections`.

- `apps/litewkateam-pl-web/app/api/contact/route.ts`
  - Nowy endpoint `POST /api/contact` przyjmujący JSON `{ name, email, phone?, message }`.
  - Walidacja wymaganych pól po stronie serwera; relay do `${PAYLOAD_API_URL || http://localhost:3003}/api/contactMessages`.
  - Zwraca `{ ok: true, id }` lub `{ ok: false, error }`.

- `apps/litewkateam-pl-web/components/features/ContactForm/index.tsx`
  - Zamiast `setTimeout` wysyła `fetch('/api/contact', { method: 'POST', body: JSON.stringify(data) })`.
  - Dodano prostą obsługę błędów (`submitError`) wyświetlaną pod przyciskiem.

## Kontrakt API (frontend)
- Endpoint: `POST /api/contact`
- Body (JSON):
  ```json
  {
    "name": "Imię i nazwisko",
    "email": "adres@example.com",
    "phone": "+48 600 700 800",
    "message": "Treść wiadomości"
  }
  ```
- Odpowiedzi:
  - Sukces: `200 { ok: true, id: "..." }`
  - Błąd walidacji: `400 { ok: false, error: "..." }`
  - Błąd serwera / relay: `5xx { ok: false, error: "..." }`

## Struktura kolekcji (Payload)
- `contactMessages`:
  - `name: text (required)`
  - `email: email (required)`
  - `phone: text (optional)`
  - `message: textarea (required)`
  - `status: select` (domyślnie `new`; wartości: `new`, `in_review`, `responded`, `spam`, `archived`)
  - `consent: checkbox` (domyślnie `false`)
  - `receivedAt: date` (ustawiane automatycznie w hooku)

## Uruchomienie lokalne
- Payload (API):
  - Uruchom dev serwer w `apps/payload-litewkateam` (np. port `3003` lub `3004`).
  - Jeśli pojawią się błędy schematu, wykonaj migrację: `payload migrate` (z odpowiednimi env).

- Web-frontend:
  - Uruchom Next.js w `apps/litewkateam-pl-web`: `yarn dev`.
  - Domyślny `PAYLOAD_API_URL` dla klienta to `http://localhost:3003/api`. Jeśli Payload działa na innym porcie, ustaw `PAYLOAD_API_URL` w env lub przeglądarka przełączy się na fallback zgodnie z istniejącą logiką klienta.

## Testy manualne
- Formularz na stronie głównej (sekcja „Kontakt”): wypełnij i wyślij.
- Alternatywny test przez curl:
  ```bash
  curl -X POST http://localhost:3000/api/contact \
    -H 'Content-Type: application/json' \
    -d '{"name":"Jan Kowalski","email":"jan@example.com","phone":"+48 600 700 800","message":"Chciałbym pomóc."}'
  ```
- Weryfikacja w panelu Payload: kolekcja `ContactMessages` powinna pokazać nowy wpis.

## Bezpieczeństwo i RODO
- Anti-spam (zalecenia):
  - Dodanie honeypot (ukryte pole, nie wypełniane przez użytkowników).
  - Rate limiting na endpointzie `/api/contact` (np. limit per IP/time window).
  - Captcha: Cloudflare Turnstile lub Google reCAPTCHA.
- Dane osobowe:
  - Przechowywane: imię i nazwisko, email, opcjonalnie telefon, treść wiadomości.
  - Statusy moderacji: pozwalają oznaczyć spam i archiwizować.
  - Zgoda (`consent`) dostępna; trzeba dopiąć UI i logikę, jeśli wymagana.

## Powiadomienia (opcjonalne, do wdrożenia)
Zobacz dwie ścieżki: e-mail (wdrożone) i Telegram (plan/zalecenie).

### Powiadomienia e-mail (wdrożone)
- Konfiguracja w `apps/payload-litewkateam/src/payload.config.ts` — sekcja `email` aktywowana przez zmienne środowiskowe:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true`/`false`), `SMTP_USER`, `SMTP_PASS`
  - `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME`
- Adresaci — lista w `CONTACT_NOTIFY_EMAILS` (rozdzielana przecinkami). Jeśli pusta, wysyłka jest pomijana.
- Hook: `afterChange` w `ContactMessages` wysyła maila tylko przy `operation === 'create'`.
- Treść: prosty plaintext + HTML z danymi: imię, e-mail, telefon, treść, data.

Przykład zmiennych `.env` (dev):
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey-or-user
SMTP_PASS=secret-pass
SMTP_FROM_ADDRESS=no-reply@litewka.team
SMTP_FROM_NAME=Litewka Team
CONTACT_NOTIFY_EMAILS=kontakt@litewka.team,zarzad@litewka.team
```

Diagnostyka:
- Jeśli SMTP nie jest skonfigurowane, sekcja `email` w Payload jest pomijana i wysyłka nie występuje.
- Błędy wysyłki logowane są przez logger Payload; zapis do kolekcji nie jest blokowany (best-effort).

### Powiadomienia Telegram (plan)
- W repo istnieje helper: `packages/helpers/telegram/index.ts` z funkcjami:
  - `sendTelegramNotification({ text, parseMode?, disableWebPagePreview? }, { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID })`
  - `createContactNotification({ name, email?, phone?, message, createdAt })` — generuje sformatowaną wiadomość
- Plan integracji w Payload (hook `afterChange` w `ContactMessages`):
  - Import helpera i użycie `createContactNotification` + `sendTelegramNotification`
  - Sekrety z env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - Brak sekretów ⇒ ciche pominięcie i log do konsoli (tak jak w helperze)

### Plan: wariant `formData` (Cloudflare/edge)
- W środowiskach edge można użyć `request.formData()` (zob. deklaracje w cloudflare-env.d.ts) i budować powiadomienie bezpośrednio, analogicznie do `apps/smakovo-pl-web/app/edge-functions/contact.ts`.
- Opcja rozszerzenia: dodać alternatywny endpoint (np. `POST /api/contact-form`) akceptujący `multipart/form-data` i mapujący do tego samego flow (Payload + Telegram + e-mail), aby:
  - wspierać uploady/załączniki (docelowo — wymaga zmian w modelu),
  - korzystać z `FormData` w środowisku Cloudflare.

### Slack/Discord (opcjonalnie)
- Webhook do Slack/Discord z treścią zgłoszenia (do dopisania analogicznie do Telegrama) — planowane jako osobny etap.

## Dalsze kroki
- Dodać Captcha i honeypot do `ContactForm`.
- Dodać masowe akcje w panelu (oznacz „responded”, „spam”).
- Eksport CSV z kolekcji `ContactMessages` (np. przycisk w adminie).

## Revert / modyfikacje
- Usunięcie integracji:
  - Usuń plik `app/api/contact/route.ts` w web-frontend.
  - Usuń `ContactMessages.ts` i wypnij kolekcję z `payload.config.ts`.
  - Przywróć starą logikę `ContactForm` (symulacja lub inny backend).
- Zmiana pól:
  - Edytuj `ContactMessages.ts` i wykonaj migrację payload (w prod), w dev zrestartuj serwer.

## Uwagi techniczne
- `ContactForm` używa `react-hook-form` + `zod` z walidacją w trybie `onChange`.
- `payload-client.ts` posiada mechanizm failover w dev dla portów `3001 → 3003 → 3004`.
- Endpoint `/api/contact` robi relay z pełnym `Content-Type: application/json` i podstawową walidacją wymaganych pól po stronie serwera.