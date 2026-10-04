# Model biznesowy

Jak „Kraków bez Barier” staje się usługą, która utrzymuje się sama: kto korzysta, kto płaci
i za co, ile to kosztuje, jak wchodzimy do kolejnego miasta. Dokument odpowiada na wymagania
wyzwania (model biznesowy, utrzymanie poza infrastrukturą UMK, plan przejścia od prototypu do
usługi, warunki uruchomienia w kolejnym mieście). Na końcu jest mapowanie na kryteria oceny.

Kwoty to **założenia do walidacji** z pierwszymi klientami, nie cennik.

## W skrócie (slajd)

> **Mieszkańcy i turyści korzystają za darmo. Płacą ci, którym zależy na rzetelnej informacji
> o dostępności: miasto, właściciele obiektów i firmy, które tę informację pokazują u siebie.**

| Kto | Co dostaje | Jak płaci |
|---|---|---|
| 🧑‍🦽 Mieszkańcy, turyści, rodzice z wózkami, seniorzy | trasy i miejsca dopasowane do swoich potrzeb, nawigacja, zgłaszanie barier | **za darmo, zawsze** |
| 🏛️ Miasto (B2G) | dashboard barier, ranking priorytetów inwestycji, mapa braków danych, moderacja zgłoszeń, eksport danych | roczna licencja SaaS + jednorazowe wdrożenie |
| 🏨 Hotele, organizatorzy wydarzeń, instytucje kultury, zarządcy nieruchomości (B2B) | rozszerzony profil miejsca, audyt i odznaka ✅ „Verified Accessibility”, widżet na stronę | abonament profilu + opłata za audyt |
| 🔌 Systemy rezerwacyjne, aplikacje turystyczne, dostawcy map | API: atrybuty dostępności miejsc z pochodzeniem i pewnością, trasy dostępne | pakiety zapytań API (darmowy próg dla projektów społecznych) |
| 📢 Lokalne firmy | wyróżnienie „Promowane” w osobnej sekcji | opłata za promocję – **bez wpływu na ocenę dostępności** |

## Problem i wartość

Osoba na wózku albo z wózkiem dziecięcym nie pyta „czy to miejsce jest dostępne?”, tylko
„czy **ja** tam dojadę i wejdę”: jaki jest krawężnik, nachylenie, nawierzchnia, czy działa
winda, czy jest toaleta. Mapy ogólnego przeznaczenia dają zwykle jedną flagę
„dostępne / niedostępne”, bez źródła i daty. Brak informacji wygląda tam tak samo jak
potwierdzona dostępność.

Wartość dla każdej strony:

- **Użytkownik:** konkretne bariery i udogodnienia na trasie i w miejscu, źródło, data
  i pewność każdej informacji, porównanie z najkrótszą zwykłą trasą („o 180 m dłużej, ale
  bez schodów”), aktualne zgłoszenia innych (zepsuta winda, remont).
- **Miasto:** dane, których dziś nie ma w jednym miejscu: gdzie są bariery na popularnych
  trasach, gdzie brakuje danych, co mieszkańcy zgłaszają – bez utrzymywania własnej bazy
  i bez dostępu do systemów UMK / MJO.
- **Firma (hotel, organizator):** wiarygodna, zweryfikowana informacja o dostępności, którą
  może pokazać gościom – i sposób, żeby wyróżnić się na rynku, który dopiero uczy się
  o dostępności mówić.

## Zasady, które budują zaufanie (i dlaczego to część modelu)

Produkt jest wart tyle, ile zaufanie do jego danych. Dlatego te zasady są nienegocjowalne
i część z nich jest zapisana w kodzie:

1. **Darmowy dla mieszkańców i turystów.** Żadnych funkcji dostępności za paywallem.
2. **Promocja nigdy nie zmienia oceny dostępności, kolejności tras ani dopasowania miejsc.**
   Promowane miejsca są w osobnej sekcji z etykietą „Promowane”. Gdyby można było kupić lepszą
   ocenę, osoba na wózku przestałaby ufać całej mapie – a wtedy nie ma czego sprzedawać
   ani miastu, ani firmom. Zasada ma być zapisana testem (#67).
3. **Firma nie nadpisuje swoich danych.** Może je zgłosić do weryfikacji; „Verified
   Accessibility” to audyt na miejscu według checklisty, z datą i ważnością (np. 12 miesięcy).
   Po wygaśnięciu odznaka znika sama.
4. **Każda informacja ma źródło, datę i pewność.** Zgłoszenia użytkowników są wyraźnie
   oznaczone jako niepotwierdzone, dopóki inni ich nie potwierdzą (przewaga 2 głosów).
   Brak danych to „nie wiemy”, nie „dostępne”.
5. **Nie pytamy o niepełnosprawność.** Wystarczą preferencje (schody, nachylenie,
   nawierzchnia, krawężnik). Zgłoszenia bez kont i danych osobowych
   ([bezpieczeństwo i prywatność](security-privacy.md)).

## Źródła przychodu

### 1. Licencja dla miasta (B2G)

Pakiet dla urzędu, MZD / ZDMK, rzecznika osób z niepełnosprawnościami:

- **Dashboard miasta** (działa w demie: `#/miasto`, `GET /api/stats`): pokrycie danymi,
  najczęstsze bariery, zgłoszenia wg statusu, **ranking priorytetów inwestycji** – ulice
  z największą liczbą barier ważonych rodzajem.
- **Mapa braków danych** (działa: `GET /api/data-gaps`): gdzie nie wiemy nic o nawierzchni –
  zlecenie inwentaryzacji tam, gdzie jest najbardziej potrzebna.
- **Moderacja i eksport zgłoszeń** do systemów miasta (np. do zarządcy drogi).
- **Raport okresowy** o dostępności przestrzeni – materiał do polityk i wniosków o fundusze.

Model: jednorazowe wdrożenie (konfiguracja miasta, import lokalnych zbiorów) + roczna licencja
SaaS zależna od wielkości miasta. Założenie na start: wdrożenie 20–40 tys. zł, licencja
30–80 tys. zł rocznie dla miasta wielkości Krakowa, mniej dla mniejszych.

Dlaczego miasto zapłaci: dane o barierach wspierają planowanie inwestycji i realizację
obowiązków z ustawy o zapewnianiu dostępności osobom ze szczególnymi potrzebami, a koszt jest
niższy niż własny system i własna inwentaryzacja.

### 2. Profile firm i „Verified Accessibility” (B2B)

Dla hoteli, organizatorów wydarzeń, muzeów, restauracji, zarządców nieruchomości:

- **Rozszerzony profil:** opis dostępności, zdjęcia wejścia, toalety, windy (#57), kontakt
  w sprawie dostępności, godziny.
- **Audyt na miejscu i odznaka ✅ „Verified Accessibility”** z datą i ważnością.
  Wynik audytu trafia do danych jako źródło o najwyższej pewności – korzystają z niego
  wszyscy użytkownicy, także ci, którzy nie widzą profilu.
- **Widżet na stronę i do systemu rezerwacji:** karta dostępności obiektu z pochodzeniem
  danych + „jak dojechać bez barier” z najbliższego przystanku.

Założenie: profil 49–149 zł miesięcznie, audyt 500–1500 zł (zależnie od wielkości obiektu),
pakiet dla organizatora wydarzenia jednorazowo za wydarzenie.

### 3. Promocja (oddzielona od oceny)

Wyróżnienie miejsca w osobnej sekcji „Promowane” w okolicy trasy lub w wynikach
wyszukiwania. Bez wpływu na ocenę, kolejność „Miejsc dla mnie” i wybór trasy (zasada 2).
To dodatkowy przychód, nie podstawa modelu.

### 4. API dla partnerów

Atrybuty dostępności miejsc (z `source`, `fetched_at`, `last_verified`, `confidence`),
trasy dostępne i bariery jako usługa dla systemów rezerwacyjnych, aplikacji turystycznych
i dostawców map. Pakiety wg liczby zapytań, darmowy próg dla organizacji pozarządowych
i projektów badawczych.

Ograniczenie licencyjne: dane z OpenStreetMap są na licencji ODbL – baza pochodna musi
pozostać otwarta. Dlatego sprzedajemy **usługę** (API z SLA, aktualizację, łączenie źródeł,
audyty, trasy), a nie zamknięty zbiór danych. Własne dane z audytów i zgłoszeń licencjonujemy
osobno.

### 5. Finansowanie uzupełniające

Granty i programy publiczne na dostępność (krajowe i unijne), partnerstwa z organizacjami
osób z niepełnosprawnościami (testy, audyty, rekrutacja audytorów). Pomaga sfinansować
wejście do nowego miasta, zanim licencja się zwróci.

## Kto prowadzi usługę i ile to kosztuje

**Operator:** zespół projektu jako spółka albo fundacja (decyzja po walidacji z pierwszymi
klientami) – odpowiada za hosting, aktualizacje, bezpieczeństwo i obsługę zgłoszeń.
Rozwiązanie nie wymaga infrastruktury ani systemów UMK.

Według regulaminu konkursu autorskie prawa majątkowe do nagrodzonego rozwiązania przechodzą
na Gminę Miejską Kraków. Model to uwzględnia: kod może być własnością miasta i otwarty,
a operator świadczy usługę (hosting, dane, audyty, rozwój) na podstawie umowy z miastem.
Otwarty kod pomaga też w kolejnych miastach – obniża barierę zakupu dla samorządów.

| Obszar | Kto | Jak |
|---|---|---|
| Hosting | operator | chmura w UE: statyczny frontend przez CDN, API w kontenerach, zarządzany PostgreSQL + PostGIS ([architektura](architecture.md)) |
| Aktualizacja danych | automatycznie + operator | providery odświeżane według harmonogramu, awaria źródła nie usuwa ostatnich poprawnych danych ([utrzymanie danych](data-operations.md)) |
| Zgłoszenia i błędy w danych | społeczność + operator + miasto | głosowanie użytkowników, moderacja operatora, eksport do zarządcy drogi |
| Bezpieczeństwo | operator | HTTPS, brak danych osobowych w zgłoszeniach, limity zapytań, kopie zapasowe |
| Audyty „Verified” | operator + przeszkoleni audytorzy (np. z organizacji osób z niepełnosprawnościami) | checklista, wynik jako dane z datą ważności |

Szacunkowy koszt utrzymania jednego miasta wielkości Krakowa (chmura w UE, bez wynagrodzeń):

| Pozycja | Miesięcznie |
|---|---|
| API (2 repliki) + workery odświeżania danych | 300–600 zł |
| Zarządzany PostgreSQL + PostGIS z kopiami | 200–500 zł |
| CDN, storage snapshotów, monitoring, domena | 50–150 zł |
| Geokodowanie i kafelki mapy (własna instancja albo płatny dostawca przy większym ruchu) | 0–500 zł |
| **Razem** | **ok. 0,6–1,8 tys. zł** |

Kolejne miasto dzieli tę samą infrastrukturę – koszt rośnie głównie o bazę i odświeżanie
danych, nie o nową instalację. Największy koszt to praca: rozwój, moderacja, audyty.
Jedna licencja miejska pokrywa infrastrukturę z dużym zapasem; resztę finansują B2B i API.

## Skalowanie: kolejne miasto i kolejne sektory

Technicznie nowe miasto to **plik `backend/cities/<miasto>.yaml`** + lokalne zbiory danych –
kod aplikacji nie zna listy miast ([architektura](architecture.md#nowe-miasto--yaml--providery)).
Część źródeł działa w całej Polsce bez zmian:

| Źródło | Zasięg | Co wymaga nowe miasto |
|---|---|---|
| OpenStreetMap (miejsca, chodniki, krawężniki, nawierzchnia) | cały świat | tylko obszar w YAML |
| Deklaracje dostępności podmiotów publicznych | cała Polska (jednolity wzór, obowiązek ustawowy) | zbiór instytucji + reguły w YAML |
| NMT GUGiK (nachylenia) | cała Polska | nic – kafle pobierane automatycznie |
| GTFS przewoźnika (przystanki) | większość miast | adres pliku GTFS |
| Zgłoszenia użytkowników | wszędzie | nic |
| Dane miejskie (MSIP, otwarte dane) | lokalnie | nowy provider dla lokalnego API |

**Warunki uruchomienia w kolejnym mieście:** plik YAML z obszarem i źródłami, sprawdzenie
pokrycia danymi na mapie braków, lokalny partner (urząd albo organizacja osób
z niepełnosprawnościami) do testów i pierwszych audytów, jedna kampania zachęcająca do zgłoszeń.

**Kolejne sektory:** hotele i systemy rezerwacyjne (widżet, API), organizatorzy wydarzeń
(dostępny dojazd i wejście na wydarzenie), zarządcy nieruchomości (audyt i odznaka), turystyka
(trasy zwiedzania bez barier), operatorzy transportu (dojście do przystanku).

## Konkurencja i wyróżnik

| | Mapy ogólne | Mapy dostępności oparte na OSM | **Kraków bez Barier** |
|---|---|---|---|
| Informacja o miejscu | zwykle jedna flaga | ocena miejsca (np. skala kolorów) | konkretne cechy: wejście, winda, toaleta, przewijak, parking OzN |
| Źródło, data, pewność | brak | częściowo | przy każdej informacji |
| Trasy dla wózka | brak albo ogólne | brak | trasa wg preferencji (krawężnik, nachylenie z NMT, nawierzchnia), porównanie z najkrótszą |
| Bieżące problemy | brak | brak | zgłoszenia z głosowaniem; potwierdzone od razu omijane przez trasy |
| Dane dla miasta | brak | brak | dashboard, priorytety inwestycji, mapa braków |

Wyróżniki, które pokazuje demo: pochodzenie i pewność każdej informacji, porównanie
z najkrótszą zwykłą trasą, nowe miasto = plik YAML, zgłoszenia, które od razu zmieniają trasy.

## Stan obecny i dalsze prace

Wymagany przez wyzwanie wykaz: co już działa w prototypie, a co jest planem.

| Element modelu | Stan |
|---|---|
| Darmowa aplikacja: trasy wg profilu (wózek, wózek dziecięcy, senior, turysta), porównanie z najkrótszą trasą, nachylenia z NMT GUGiK | ✅ działa |
| Miejsca z cechami dostępności, źródłem, datą i pewnością; wyszukiwarka („hotel”, „przewijak”) | ✅ działa |
| Zgłoszenia bez kont, potwierdzanie przez innych, wpływ potwierdzonych zgłoszeń na trasy | ✅ działa |
| Dashboard miasta z rankingiem priorytetów inwestycji, mapa braków danych | ✅ działa |
| Nowe miasto = YAML + providery | ✅ działa (jedno miasto skonfigurowane) |
| Nawigacja głosowa w trakcie trasy | 🔄 w przeglądzie (PR) |
| Profile firm, „Verified Accessibility”, „Promowane” | 📋 plan (#67) |
| Widżet dla hoteli, publiczne API z kluczami i limitami | 📋 plan |
| Konta firm, płatności, faktury | 📋 plan – na start ręczne umowy i formularz kontaktowy |

## Plan: od prototypu do usługi

| Etap | Czas | Co robimy | Miara sukcesu |
|---|---|---|---|
| 0. Pilotaż w Krakowie | 0–3 mies. | testy z użytkownikami i organizacjami osób z niepełnosprawnościami, uzupełnienie danych w obszarze centrum, umowa pilotażowa z miastem | 1 umowa pilotażowa, aktywni zgłaszający |
| 1. Pierwsze przychody | 3–6 mies. | licencja dla Krakowa, 10–20 obiektów z audytem (hotele w centrum), widżet | pokrycie infrastruktury z przychodu |
| 2. Kolejne miasta | 6–12 mies. | 2–3 miasta w Polsce na tej samej infrastrukturze, API dla partnera rezerwacyjnego | czas wdrożenia miasta < 1 mies. |
| 3. Skala | 12+ mies. | aplikacja natywna (nawigacja w tle), integracja z transportem publicznym, kolejne kraje (OSM + lokalne źródła) | przychód B2B/API ≥ B2G |

## Ryzyka

| Ryzyko | Jak ograniczamy |
|---|---|
| Za mało danych w nowym mieście | mapa braków pokazuje luki; źródła ogólnopolskie (OSM, deklaracje, NMT); kampania zgłoszeń z lokalnym partnerem |
| Nieaktualne lub fałszywe zgłoszenia | głosowanie z przewagą 2 głosów, ważność zgłoszeń wg rodzaju, limity głosów, moderacja |
| Utrata zaufania przez monetyzację | zasady 1–3 powyżej, promocja zapisana testem jako niezależna od oceny |
| Długie zakupy w samorządach | pilotaż i otwarty kod obniżają próg wejścia; równolegle przychód B2B |
| Zależność od zewnętrznych usług (Overpass, Photon, kafelki OSM) | snapshoty danych, własne instancje przy większym ruchu, działanie offline na ostatnich danych |

## Mapowanie na kryteria oceny

**Kryteria wyzwania „Kraków bez barier”:**

| Kryterium | Waga | Gdzie w modelu |
|---|---|---|
| Związek z wyzwaniem i użyteczność dla grupy, łatwość użytkowania | 25% | darmowa aplikacja, profile zamiast pytań o niepełnosprawność, konkretne bariery zamiast flagi |
| Jakość i kompletność prototypu | 20% | tabela „Stan obecny i dalsze prace” |
| Wiarygodność, prezentacja i aktualizacja danych | 15% | zasady zaufania, źródło/data/pewność, audyty z ważnością, głosowanie nad zgłoszeniami |
| Potencjał wdrożeniowy i skalowanie | 20% | operator i koszty, nowe miasto = YAML, źródła ogólnopolskie, plan etapów |
| Model biznesowy, komercjalizacja, rozwój rynkowy | 20% | B2G, B2B (profile, audyt, widżet), API, promocja oddzielona od oceny |

**Kryteria HackYeah:**

| Kryterium | Waga | Co pokazujemy |
|---|---|---|
| Idea | 30% | dostępność „dla mnie”, nie „dla wszystkich”; dane z pochodzeniem; zgłoszenia zmieniające trasy |
| Technical aspects | 30% | routing z NMT i krawężnikami, łączenie źródeł z pewnością, głosowanie i ważność zgłoszeń |
| Design (architektura, skalowalność, produkcja) | 20% | [architektura](architecture.md), wielomiejskość przez YAML, plan hostingu i kosztów |
| Relation to category | 10% | pełne pokrycie wymagań wyzwania (tabela wyżej) |
| WOW factor | 10% | porównanie z najkrótszą trasą, potwierdzone zgłoszenie od razu omijane przez trasę, nawigacja głosowa |
