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
| `reporter` | skrót (SHA-256 z domieszką) losowego identyfikatora urządzenia – tylko po to, żeby autor nie potwierdził własnego zgłoszenia (#62) |

Czego **nie** zapisujemy: adresu IP, surowego identyfikatora urządzenia, konta, imienia, e-maila, telefonu, lokalizacji użytkownika.

## Potwierdzanie zgłoszeń przez innych (`POST /api/reports/{id}/votes`, #62)

Nowe zgłoszenie jest od razu widoczne na mapie jako „niepotwierdzone”; inni głosują „Potwierdzam” albo „Problemu już nie ma”. Przewaga 2 głosów jednej strony zmienia status (`pending` → `confirmed`, a przy przewadze „nie ma”: `rejected`, albo `resolved`, jeśli zgłoszenie było już potwierdzone). Reguła: `status_after_votes` w `backend/app/report_votes.py`.

Bez kont: przeglądarka losuje identyfikator urządzenia (`crypto.randomUUID`, `localStorage`: `kbb.device`) i wysyła go przy zgłoszeniu i głosie. Serwer zapisuje tylko jego skrót z domieszką (`report_votes.voter`, `reports.reporter`). To **pseudonim przeglądarki, nie osoby**: nie da się z niego odtworzyć tożsamości, ale łączy głosy z tej samej przeglądarki (to celowe – jeden głos na zgłoszenie). Wyczyszczenie danych strony daje nowy identyfikator.

Tabela `report_votes`: `report_id`, `voter` (skrót), `vote` (`confirm` / `deny`), `created_at`; unikalna para (`report_id`, `voter`).

Ochrona przed nadużyciem:

- jeden głos na zgłoszenie z urządzenia (kolejny głos zastępuje poprzedni – można zmienić zdanie);
- autor nie głosuje na własne zgłoszenie (403);
- limit 50 głosów na urządzenie na dobę (429);
- zamknięte zgłoszenia (`rejected`, `resolved`) nie przyjmują głosów (409);
- do danych miejsc (i docelowo tras) trafiają tylko potwierdzone zgłoszenia; każde potwierdzenie podnosi zaufanie o `AGREEMENT_BONUS` (0,15) od bazowych 0,4.

Ograniczenie: nowy identyfikator (wyczyszczone dane, inna przeglądarka) pozwala zagłosować ponownie. Na demo to wystarcza; na produkcji – limit na poziomie sieci i moderacja (#37).

Zabezpieczenia w kodzie (`backend/app/models/report.py`, `backend/app/api/reports.py`):

- komentarz z adresem e-mail albo numerem telefonu jest odrzucany (422) z prośbą o usunięcie danych; formularz ostrzega o tym przed wysłaniem;
- komentarz ma limit 500 znaków (w API i w formularzu);
- zgłoszenie musi leżeć w granicach miasta (`bbox` z `cities/<miasto>.yaml`);
- zgłoszenie trafia do danych (`providers/user_reports.py`) dopiero po potwierdzeniu (`status=confirmed`) – przez innych użytkowników (patrz niżej) albo moderację – z zaufaniem od 0,4; zgłoszenia z minioną datą `valid_until` są pomijane.

Uwaga: serwer HTTP (uvicorn) domyślnie loguje IP w logach dostępu na konsoli. Nie trafiają one do bazy; na produkcji logi dostępu trzeba wyłączyć albo anonimizować.

## TODO

- [ ] Rate limiting na `POST /api/reports`
- [ ] Uprawnienia moderatora dla `PATCH /api/reports/{id}` (teraz bez logowania – plan w #37)
- [x] Moderacja zgłoszeń (statusy `pending` → `confirmed`/`rejected`/`resolved`, `PATCH /api/reports/{id}`)
- [x] Walidacja, że zgłoszenie leży w bbox miasta
- [ ] Wyłączenie / anonimizacja logów dostępu z IP na produkcji
- [ ] Nagłówki bezpieczeństwa (CSP) na produkcji
