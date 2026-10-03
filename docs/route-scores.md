# Wyniki dostępności i pewności danych

API zwraca dwa niezależne wyniki dla każdego segmentu i całej trasy:

- `accessibility_score` (`0–100`) mówi, jak łatwy do pokonania jest odcinek dla wybranego
  profilu (`wheelchair`, `stroller` lub ustawienia własne). `100` oznacza brak barier i kar,
  a `0` — odcinek nieprzejezdny.
- `confidence` (`0–1`, w interfejsie prezentowane jako `0–100%`) mówi, na ile kompletne
  i wiarygodne są dane, na których opiera się wynik. Niska pewność nie oznacza automatycznie
  bariery — oznacza, że brakuje informacji potrzebnych do jej wykluczenia.

## Jak liczymy dostępność

Każda krawędź grafu zaczyna od 100 punktów. Wynik dzielimy przez iloczyn kar aktywnego
profilu routingu, tych samych, które decydują o wyborze trasy. Przykładowo profil wózka
inwalidzkiego stosuje karę `×1,3` za kostkę chodnikową, `×4` za bruk i `×6` za nawierzchnię
nieutwardzoną. Daje to odpowiednio około 77, 25 i 17 punktów. Brak danych oraz dopuszczone
schody z rampą również obniżają wynik. Krawędzie przekraczające twarde limity profilu
(np. schody bez rampy albo zbyt duże nachylenie) są odrzucane przed wyznaczeniem trasy.

Wzór dla krawędzi:

```text
accessibility = 100 / iloczyn_kar_routingu
```

Wynik segmentu to średnia wyników jego krawędzi ważona długością w metrach. Wynik całej
trasy jest tak samo średnią wyników segmentów ważoną ich długością.

## Jak liczymy pewność danych

Obecnie routing korzysta z jednego źródła — OpenStreetMap — dlatego znana nawierzchnia
daje bazowo `0,60`, a brak informacji o nawierzchni `0,35`. Nieprecyzyjne oznaczenie
nachylenia (`up`, `down` lub `yes` bez wartości procentowej) odejmuje `0,10`.

Pewność segmentu jest średnią wyników krawędzi ważoną długością. Pewność całej trasy jest
średnią wyników segmentów, również ważoną długością. Skala pozostawia miejsce na wzrost
pewności po potwierdzeniu danych przez niezależne źródła miejskie lub zgłoszenia użytkowników.

## Skrót do slajdu

> Dostępność 0–100 wynika z barier i kar profilu; pewność 0–100% z kompletności i jakości
> danych. Oba wyniki agregujemy po metrach, najpierw dla segmentu, potem dla całej trasy.
