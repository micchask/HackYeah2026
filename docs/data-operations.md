# Plan utrzymania danych i moderacji zgłoszeń

## Cel i zakres

Plan określa, jak utrzymujemy aktualność danych o dostępności, jak reagujemy na awarie
źródeł oraz jak zgłoszenie użytkownika staje się zaufaną informacją widoczną w aplikacji.
Dotyczy providerów skonfigurowanych w `backend/cities/<miasto>.yaml`, grafu tras,
zbiorów importowanych ręcznie i zgłoszeń użytkowników.

Założenia:

- każda informacja zachowuje pochodzenie (`source`, `source_ref`, `fetched_at`,
  `last_verified`), confidence i status;
- awaria zewnętrznego źródła nie usuwa ostatnich poprawnych danych;
- niezweryfikowane zgłoszenie nie nadpisuje automatycznie danych urzędowych;
- użytkownik widzi, gdy informacja jest niepewna, sprzeczna albo nieaktualna;
- w zgłoszeniach nie zbieramy konta, e-maila ani innych danych osobowych.

## Stan obecny i stan docelowy

| Obszar | Stan obecny | Stan docelowy |
|---|---|---|
| Providery | `ProviderService` pobiera dane i zapisuje ostatni poprawny wynik w `data/cache/<city>/`; przy błędzie używa cache | cykliczne zadania, metryki i alerty dla każdego źródła |
| Aktualność | provenance zawiera daty; normalizacja oznacza jako `outdated` dane nieweryfikowane od ponad 2 lat i obniża confidence o połowę | progi świeżości zależne od źródła oraz czytelna data aktualizacji w API/UI |
| Zgłoszenia | zapis w PostgreSQL/PostGIS (`reports`, #72); potwierdzanie przez użytkowników (`POST /api/reports/{id}/votes`, #116); moderacja przez `PATCH /api/reports/{id}` bez logowania | panel moderatora z logowaniem i historią decyzji |
| Provider zgłoszeń | `user_reports` publikuje aktywne zgłoszenia `confirmed`; routing blokuje lub obciąża odcinki przy potwierdzonej barierze (#121); zgłoszenia wygasają | progi wygasania konfigurowane per miasto |
| Ochrona przed nadużyciami | walidacja modelu, limit komentarza 500 znaków, zgłoszenie w bbox miasta, limit 50 głosów na urządzenie na dobę | rate limiting na poziomie sieci, deduplikacja, filtrowanie treści niedozwolonych |

Kolumna „stan obecny” opisuje działający prototyp (4.10.2026); „stan docelowy” i dalsze sekcje
tego dokumentu to plan wdrożenia.

## Odświeżanie danych

### Harmonogram

| Dane | Częstotliwość docelowa | Kiedy uznajemy za nieświeże | Sposób odświeżenia |
|---|---:|---:|---|
| OSM: miejsca i atrybuty | co 24 godziny, nocą | 7 dni bez udanego pobrania | provider `osm`, zapis atomowy do cache po pełnej walidacji |
| Graf pieszy OSM | raz w tygodniu, nocą | 30 dni | ponowne zbudowanie GraphML; publikacja dopiero po testach spójności |
| Kraków Open Data / MSIP | co 24 godziny po uruchomieniu providerów | 7 dni lub wcześniej, jeśli źródło podaje termin ważności | provider właściwy dla zbioru; ETag/`Last-Modified`, jeśli dostępne |
| GTFS ZTP | codziennie | 48 godzin | pobranie aktualnej paczki i ponowne przygotowanie przystanków |
| Deklaracje dostępności BIP | raz w miesiącu oraz po sygnale o zmianie | 90 dni od ostatniej kontroli | import, walidacja i ręczna kontrola różnic przed publikacją |
| Zgłoszenia użytkowników | na bieżąco | zależnie od ważności, patrz niżej | po moderacji przez `user_reports` |
| Cache geokodera Photon | na żądanie | po 1 godzinie | istniejący cache procesu; wynik geokodera nie jest źródłem cech dostępności |

Harmonogram uruchamia osobne zadanie dla pary miasto–provider. Dodanie nowego miasta nie
powinno wymagać zmiany kodu planisty zadań. Ręczne uruchomienie tego samego zadania musi
być bezpieczne i idempotentne.

### Przebieg odświeżenia

1. Pobierz dane do pliku tymczasowego, z limitem czasu i ograniczoną liczbą ponowień.
2. Zwaliduj schemat, współrzędne względem bbox miasta, liczbę rekordów i wymagane pola.
3. Porównaj wynik z poprzednią wersją. Wstrzymaj publikację przy podejrzanym spadku lub
   wzroście liczby rekordów (domyślnie ponad 30%) albo przy masowym braku geometrii.
4. Znormalizuj wartości i zachowaj provenance. `fetched_at` oznacza czas pobrania,
   a `last_verified` wyłącznie czas rzeczywistego potwierdzenia informacji.
5. Dopiero po poprawnej walidacji atomowo zastąp cache i zaktualizuj bazę.
6. Przelicz konflikty, confidence i statusy. Nie zmieniaj daty weryfikacji tylko dlatego,
   że ponownie pobrano tę samą starą informację.
7. Zapisz wynik zadania: provider, miasto, czas, liczba rekordów, liczba zmian, błędy i
   informacja, czy aplikacja używa danych live czy fallbacku.

### Awaria i rollback

- Błąd pobrania lub walidacji nie nadpisuje ostatniego poprawnego cache.
- Aplikacja przechodzi na cache i raportuje stan `cache`; bez cache raportuje `failed`.
- Po 2 kolejnych błędach powstaje ostrzeżenie, po przekroczeniu progu nieświeżości alert
  dla osoby dyżurującej i widoczny status nieaktualności w API/UI.
- Ostatnie 7 poprawnych wersji lub 30 dni historii (dłuższy wariant) przechowujemy do
  rollbacku. Raw dumpy pozostają poza repozytorium.
- Po awarii formatu źródła najpierw poprawiamy parser i testujemy go na zapisanej próbce;
  dopiero potem ponawiamy publikację.

### Kontrola jakości

Każde źródło ma automatyczne kontrole: poprawność schematu, unikalność identyfikatorów,
zakres współrzędnych, dopuszczalne wartości atrybutów, brak pustego wyniku i nagłe zmiany
liczebności. Raz w miesiącu moderator sprawdza próbkę co najmniej 20 zmienionych obiektów
oraz wszystkie konflikty między źródłami o wysokim confidence.

## Moderacja zgłoszeń

### Cykl życia

```text
pending -> confirmed -> resolved
   |           |
   +---------> rejected
```

- `pending` — zapisane i oczekuje na decyzję; nie wpływa jeszcze na trasę ani dane miejsca;
- `confirmed` — potwierdzone przez moderatora lub wiarygodne, zgodne dowody; może być
  opublikowane przez provider `user_reports`;
- `rejected` — duplikat, spam, zgłoszenie poza zakresem, błędna lokalizacja/wartość albo
  treść naruszająca zasady; nie jest publikowane;
- `resolved` — wcześniej potwierdzony problem przestał istnieć; nie wpływa na bieżące dane,
  ale pozostaje w historii audytowej.

Każda zmiana statusu zapisuje czas, identyfikator moderatora lub reguły automatycznej,
powód decyzji i poprzedni status. Zmiana decyzji jest nowym wpisem historii, a nie edycją
bez śladu.

### Przyjęcie i automatyczna kontrola

Przed zapisaniem zgłoszenia API:

1. Waliduje typ atrybutu i wartość, długość komentarza oraz położenie w bbox miasta.
2. Odrzuca HTML/skrypty i treści zawierające dane kontaktowe; tekst wyświetlany w UI jest
   dodatkowo escapowany.
3. Stosuje rate limiting per anonimowy klient bez trwałego zapisywania surowego IP.
4. Szuka podobnych aktywnych zgłoszeń w pobliżu (ten sam atrybut i wartość). Duplikat jest
   dołączany jako kolejne potwierdzenie zamiast tworzyć osobny publiczny problem.
5. Nadaje priorytet na podstawie wpływu: blokada przejazdu lub nieczynna winda ma wyższy
   priorytet niż brak informacji o udogodnieniu.

Automatyczna kontrola może odrzucić oczywisty spam, ale nie potwierdza samodzielnie
informacji o dostępności. Niejednoznaczne przypadki zawsze trafiają do moderatora.

### Kryteria decyzji moderatora

Moderator widzi lokalizację, atrybut, wartość, komentarz, podobne zgłoszenia, istniejące
dane i ich provenance. Decyzje podejmuje według kolejności:

1. Sprawdza, czy lokalizacja i atrybut opisują właściwy obiekt lub odcinek.
2. Łączy duplikaty oraz odrzuca spam i treści niezwiązane z dostępnością.
3. Porównuje zgłoszenie z aktualnymi danymi OSM, miejskimi i wcześniejszymi zgłoszeniami.
4. Potwierdza zmianę, gdy istnieje wiarygodny dowód: aktualne źródło urzędowe, kontrola
   terenowa moderatora albo co najmniej dwa niezależne, zgodne zgłoszenia. Pojedyncze
   zgłoszenie może wystarczyć dla tymczasowego zagrożenia, jeśli zawiera jednoznaczny opis;
   otrzymuje wtedy krótki termin ponownej weryfikacji.
5. Przy konflikcie nie usuwa alternatywy: publikuje status `conflicting`, obniża confidence
   i zleca ponowną kontrolę.

Komentarze służą moderatorowi jako kontekst. Publicznie pokazujemy ustrukturyzowaną cechę,
lokalizację, status i datę; komentarz publikujemy tylko po kontroli, bez danych osobowych
i obraźliwych treści.

### SLA i wygaśnięcie

| Rodzaj zgłoszenia | Pierwsza decyzja | Ponowna weryfikacja po potwierdzeniu |
|---|---:|---:|
| krytyczna blokada lub zagrożenie | do 4 godzin w godzinach obsługi | po 24 godzinach, potem co 7 dni |
| problem tymczasowy (remont, awaria windy) | do 1 dnia roboczego | po 7 dniach |
| trwała cecha miejsca lub trasy | do 3 dni roboczych | po 90 dniach |
| brakująca informacja / korekta opisu | do 5 dni roboczych | po 180 dniach |

Brak potwierdzenia przy terminie ponownej weryfikacji oznacza obniżenie confidence i status
`outdated`, a nie automatyczne uznanie problemu za rozwiązany. `resolved` wymaga źródła lub
zgłoszenia potwierdzającego usunięcie problemu.

### Wpływ zgłoszeń na dane i routing

- Tylko `confirmed` jest wejściem providera `user_reports`; `pending`, `rejected` i
  `resolved` nigdy nie wpływają na wynik routingu.
- Atrybut ze zgłoszenia otrzymuje `source_type=user_report`, referencję do zgłoszenia,
  daty weryfikacji i bazowe confidence 0,4.
- Tymczasowa, potwierdzona blokada może wyłączyć odcinek z routingu mimo niższego confidence,
  ale musi mieć termin ponownej weryfikacji. To jawna reguła bezpieczeństwa, nie efekt
  zwykłego sortowania źródeł.
- Konflikt ze źródłem urzędowym lub OSM jest zachowany jako alternatywa i prezentowany
  użytkownikowi. Moderator nie usuwa źródłowej historii.

## Role i odpowiedzialność

| Rola | Odpowiedzialność |
|---|---|
| opiekun danych | harmonogramy, licencje, integracja providerów, naprawa importów |
| moderator | kolejka zgłoszeń, uzasadnienia decyzji, kontrola duplikatów i konfliktów |
| osoba dyżurująca | reakcja na alerty, przełączenie na cache, rollback i komunikat o awarii |
| administrator | uprawnienia moderatorów, retencja, kopie zapasowe i audyt dostępu |

Moderator nie może usuwać historii decyzji. Dostęp do kolejki i dziennika audytowego jest
ograniczony rolami; operacje administracyjne wymagają uwierzytelnienia.

## Retencja, prywatność i bezpieczeństwo

- Zgłoszenie nie wymaga konta ani danych kontaktowych. Jeżeli użytkownik wpisze dane osobowe
  w komentarzu, moderator je usuwa przed ewentualną publikacją.
- Surowe `pending` i `rejected` przechowujemy przez 90 dni, potem anonimizujemy komentarz;
  metadane decyzji i ustrukturyzowaną cechę przechowujemy przez rok do audytu.
- `confirmed` i `resolved` przechowujemy przez rok od rozwiązania, chyba że są potrzebne do
  wyjaśnienia aktywnego konfliktu.
- Logi techniczne nie zawierają komentarza ani pełnego IP. Identyfikator do rate limitingu
  jest krótkotrwałym hashem z rotowanym sekretem.
- Backup bazy wykonujemy codziennie; raz w miesiącu sprawdzamy odtworzenie na środowisku
  testowym.

## Monitoring i raport operacyjny

Dashboard dla każdego miasta i providera pokazuje:

- czas ostatniego udanego pobrania i wiek aktywnych danych;
- stan `live` / `cache` / `failed`, czas zadania i liczbę rekordów;
- liczbę zmian, konfliktów, danych `outdated` i błędów walidacji;
- liczbę zgłoszeń w każdym statusie, wiek najstarszego `pending` i przekroczenia SLA;
- odsetek decyzji cofniętych oraz czas od `confirmed` do `resolved`.

Raz w tygodniu opiekun danych przegląda raport i zaległą kolejkę. Raz w miesiącu dokumentuje
wynik kontroli próbki oraz aktualizuje harmonogram, jeśli źródło zmieniło częstotliwość.

## Kolejność wdrożenia

1. Zapisać zgłoszenia w istniejącej tabeli `reports` i dodać migrację oraz repozytorium.
2. Dodać walidację bbox, rate limiting, deduplikację i testy API.
3. Dodać uwierzytelniony endpoint/panel moderacji i historię decyzji.
4. Zaimplementować `user_reports`, który czyta tylko `confirmed`, oraz test wpływu statusów
   na miejsca i routing.
5. Uruchomić cykliczne zadania providerów z walidacją, atomowym cache i metrykami.
6. Pokazać w API/UI źródło, datę aktualizacji, confidence i stan nieaktualności.
7. Skonfigurować alerty, retencję wersji i okresowy test odtworzenia backupu.

## Kryteria odbioru wdrożenia planu

- każdy aktywny provider ma właściciela, harmonogram, próg nieświeżości i alarm;
- nieudane lub podejrzane pobranie nie zastępuje poprawnych danych;
- użytkownik potrafi rozpoznać źródło, wiek i poziom pewności informacji;
- zgłoszenie przechodzi audytowalny cykl `pending` → `confirmed`/`rejected` → `resolved`;
- wyłącznie aktywne `confirmed` wpływają na dane i routing;
- zaległe zgłoszenia i awarie providerów są widoczne na dashboardzie;
- testy obejmują fallback cache, progi świeżości, wszystkie przejścia statusów,
  deduplikację oraz brak wpływu odrzuconych zgłoszeń na routing.

Dokumenty powiązane: [źródła danych](data-sources.md),
[bezpieczeństwo i prywatność](security-privacy.md) oraz [architektura](architecture.md).
