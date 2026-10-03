# Bezpieczeństwo i prywatność

## Zasady

- **Nie pytamy o niepełnosprawność.** Użytkownik wybiera preferencje trasy (schody, nachylenie, nawierzchnia).
- **Zgłoszenia bez danych osobowych:** lokalizacja, cecha, wartość, opcjonalny komentarz (max 500 znaków). Bez konta, e-maila, IP w bazie.
- **Preferencje** trasy idą tylko w zapytaniu o trasę i nie są zapisywane na serwerze.
- **Sekrety** tylko w `.env` (ignorowany przez git). `.env.example` bez prawdziwych wartości.

## Zgłoszenia barier (`POST /api/reports`)

Co zapisujemy w tabeli `reports` (i nic więcej):

| Pole | Po co |
|---|---|
| `type` | rodzaj zgłoszenia (bariera, winda, remont, wejście, parking OzN) |
| `geom` | miejsce bariery (punkt), nie miejsce zgłaszającego |
| `attribute`, `value` | cecha dostępności i jej stan, np. `elevator = false` |
| `comment` | opcjonalny opis, max 500 znaków |
| `valid_until` | przewidywany koniec utrudnienia (remont) |
| `status`, `created_at`, `updated_at` | moderacja i aktualność |

Czego **nie** zapisujemy: adresu IP, identyfikatora urządzenia, konta, imienia, e-maila, telefonu, lokalizacji użytkownika.

Zabezpieczenia w kodzie (`backend/app/models/report.py`, `backend/app/api/reports.py`):

- komentarz z adresem e-mail albo numerem telefonu jest odrzucany (422) z prośbą o usunięcie danych; formularz ostrzega o tym przed wysłaniem;
- komentarz ma limit 500 znaków (w API i w formularzu);
- zgłoszenie musi leżeć w granicach miasta (`bbox` z `cities/<miasto>.yaml`);
- zgłoszenie trafia do danych (`providers/user_reports.py`) dopiero po potwierdzeniu (`status=confirmed`) i z niskim zaufaniem (confidence 0,4); zgłoszenia z minioną datą `valid_until` są pomijane.

Uwaga: serwer HTTP (uvicorn) domyślnie loguje IP w logach dostępu na konsoli. Nie trafiają one do bazy; na produkcji logi dostępu trzeba wyłączyć albo anonimizować.

## TODO

- [ ] Rate limiting na `POST /api/reports`
- [ ] Uprawnienia moderatora dla `PATCH /api/reports/{id}` (teraz bez logowania – plan w #37)
- [x] Moderacja zgłoszeń (statusy `pending` → `confirmed`/`rejected`/`resolved`, `PATCH /api/reports/{id}`)
- [x] Walidacja, że zgłoszenie leży w bbox miasta
- [ ] Wyłączenie / anonimizacja logów dostępu z IP na produkcji
- [ ] Nagłówki bezpieczeństwa (CSP) na produkcji
