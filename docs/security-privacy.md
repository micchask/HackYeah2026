# Bezpieczeństwo i prywatność

## Zasady

- **Nie pytamy o niepełnosprawność.** Użytkownik wybiera preferencje trasy (schody, nachylenie, nawierzchnia).
- **Zgłoszenia bez danych osobowych:** lokalizacja, cecha, wartość, opcjonalny komentarz (max 500 znaków). Bez konta, e-maila, IP w bazie.
- **Preferencje** trasy idą tylko w zapytaniu o trasę i nie są zapisywane na serwerze.
- **Sekrety** tylko w `.env` (ignorowany przez git). `.env.example` bez prawdziwych wartości.

## TODO

- [ ] Rate limiting na `POST /api/reports`
- [ ] Moderacja zgłoszeń (statusy `pending` → `confirmed`/`rejected`)
- [ ] Walidacja, że zgłoszenie leży w bbox miasta
- [ ] Nagłówki bezpieczeństwa (CSP) na produkcji
