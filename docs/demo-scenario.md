# Scenariusz demo

Demo trwa ok. 3 minuty i pokazuje główny scenariusz z wyzwania „Kraków bez barier”: osoba na wózku
sprawdza trasę i miejsce, widzi konkretne bariery i udogodnienia oraz źródło, datę i pewność każdej
informacji. Liczby poniżej pochodzą z działającej aplikacji (stan danych z 3–4.10.2026).

## Obszar i punkty

Obszar demo (`demo_bbox` w `backend/cities/krakow.yaml`): Stare Miasto, Planty, Wawel, Stradom,
Kazimierz – ok. 2,3 × 1,6 km. W tym obszarze OSM ma 329 odcinków schodów i 580 odcinków bruku.

| Punkt | Opis | Współrzędne |
|---|---|---|
| A | Rynek Główny (Sukiennice) | 50.0617, 19.9373 |
| B | Wawel (Dziedziniec Arkadowy) | 50.0541, 19.9355 |
| C | Kazimierz (Plac Nowy) | 50.0516, 19.9447 |

Trasy A → B, B → C i A → C są dostępne jednym kliknięciem („Trasy demo” w panelu).

## Przed demo

```
docker compose up --build -d
make seed
```

Otworzyć http://localhost:5173 w oknie prywatnym (bez zapisanego profilu – pokaże się ekran powitalny),
okno przeglądarki ≥ 1280 px. Wersja online: patrz `docs/deploy-render.md`.

## Przebieg (ok. 3 min)

### 1. Problem (20 s)

> „Najkrótsza piesza droga z Rynku na Wawel to Grodzka i Kanonicza: 1,07 km, dwa odcinki schodów
> na wzgórze i 764 m bruku. Dla osoby na wózku albo rodzica z wózkiem to nie jest trasa.”

### 2. Wybór trybu (15 s)

Ekran powitalny → **„Osoba na wózku”** → „Kontynuuj”.

> „Nie pytamy o niepełnosprawność. Tryb to zestaw ustawień: bez schodów, nachylenie do 6%,
> krawężnik do 2 cm, omijanie bruku. Każde ustawienie można zmienić.”

### 3. Trasa dla wózka (60 s)

„Dla Ciebie” → **„Rynek → Wawel”**.

| Wariant | Długość | Schody | Bruk / nierówna nawierzchnia | Wynik dostępności |
|---|---|---|---|---|
| Najbardziej dostępna | 1,70 km | 0 | 222 m | 70/100 |
| Kompromis | 1,62 km | 0 | 217 m | – |
| Najkrótsza | 1,07 km | 2 odcinki | 764 m | – |

Co pokazać:
- trasa omija Grodzką, Kanoniczą i schody na wzgórze; szara przerywana linia to trasa najkrótsza;
- „Porównanie i szczegóły” – tabela wariantów i wyjaśnienie („omija 2 odcinki schodów,
  w zamian dłuższa o ok. 630 m”);
- „Opis krok po kroku” → klik w odcinek: nawierzchnia, nachylenie (z NMT GUGiK), źródło, data,
  pewność; odcinek bez danych o nawierzchni ma niższą pewność i ostrzeżenie.

> „Trasa jest dłuższa, ale bez schodów. A tam, gdzie nie mamy pewności, mówimy to wprost.”

Opcjonalnie: profil „Rodzina z wózkiem dziecięcym” – trasa 1,53 km, 409 m bruku, wynik 83/100
(dopuszcza nachylenie do 10% i trochę bruku).

### 4. Miejsce i sprzeczne źródła (40 s)

Wyszukiwarka → **„Bazylika Mariacka”** → karta miejsca.

- OSM podaje „dostępne dla wózka”, dane wprowadzone ręcznie – „częściowo”; aplikacja pokazuje status
  **„źródła się nie zgadzają”** i obie wartości.
- Sekcja „Źródła danych”: źródło, data, pewność każdej informacji.
- Brak informacji (np. o toalecie) jest opisany jako „brak danych”, nigdy jako „dostępne”.

> „Każda informacja ma źródło i datę. Gdy źródła się różnią, pokazujemy obie wersje zamiast zgadywać.”

### 5. Zgłoszenie bariery (30 s)

„Zgłoś problem” → typ (np. niedziałająca winda / zablokowany chodnik) → miejsce na mapie → wyślij.

- Zgłoszenie jest anonimowe i ma status „czeka na weryfikację”.
- Inni użytkownicy je potwierdzają (przewaga 2 głosów); potwierdzone zgłoszenie blokuje
  lub obciąża odcinek i **trasa je omija**. Zgłoszenia wygasają (winda 7 dni, remont do daty końca).

### 6. Dla miasta (15 s)

Dashboard (`#/miasto`): najczęstsze problemy ze zgłoszeń i mapa braków danych.

> „Miasto widzi, gdzie są bariery i gdzie brakuje danych – to podstawa do decyzji, co naprawić najpierw.”

### 7. Dostępność aplikacji (opcjonalnie, 20 s)

Bez myszy: Tab → wyszukiwarka → panel → opis trasy krok po kroku. Wyniki audytu: `docs/wcag-audit.md`.

## Ryzyka i plan B

| Ryzyko | Plan B |
|---|---|
| Brak internetu na sali | dane i trasy działają lokalnie (`make seed`); bez internetu znika tylko podkład mapy i geokoder – zostają trasy demo i opis tekstowy; w ostateczności film |
| Overpass / Photon niedostępne | aplikacja działa na snapshocie z repo; wyszukiwarka pokazuje komunikat, trasy demo działają |
| Darmowy hosting usypia backend | otworzyć link kilka minut przed prezentacją (pierwsze zapytanie budzi backend) |
| Czas | sceny 1–4 to rdzeń (ok. 2,5 min); 5–7 skracamy |

## Checklista przed demo

- [ ] `docker compose up --build -d` i `make seed` na czystym klonie
- [ ] Rynek → Wawel (wózek): 0 schodów, ok. 1,70 km
- [ ] Bazylika Mariacka: status „źródła się nie zgadzają”
- [ ] zgłoszenie bariery zapisuje się i widać je na liście
- [ ] przejście scenariusza samą klawiaturą
- [ ] okno prywatne (ekran powitalny), zoom 100–125%, wyłączone powiadomienia
