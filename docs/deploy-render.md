# Wdrożenie na Render (darmowy plan)

Cel: publiczny link z HTTPS na czas prezentacji (tydzień). HTTPS jest potrzebny do nawigacji GPS
i instalacji PWA na telefonie. Lokalny `docker compose` działa bez zmian.

## Co stawia `render.yaml`

| Usługa | Typ | Plan | Uwagi |
|---|---|---|---|
| `kbb-db` | Postgres (PostGIS włącza backend przy starcie) | free | darmowa baza wygasa po ok. 30 dniach |
| `kbb-backend` | Docker (`backend/Dockerfile.render`) | free | usypia po ok. 15 min bez ruchu |
| `kbb-frontend` | strona statyczna (`frontend/dist`) | free | nie usypia; `/api/*` przekazuje do backendu |

Backend przy każdym starcie rozpakowuje snapshot z `data/seed/` (dysk na Renderze jest ulotny),
a bazę wypełnia tylko za pierwszym razem (`python -m app.seed --if-empty`). Sprawdzone lokalnie:
pierwszy start ok. 1 min (zapis 9105 miejsc i 7515 odcinków), kolejne ok. 8 s, pamięć ok. 265 MB
(limit darmowego planu: 512 MB).

## Krok po kroku

1. Konto na [render.com](https://render.com) (logowanie przez GitHub) i dostęp do repo `micchask/HackYeah2026`.
2. **New → Blueprint** → wybierz repo i branch → Render czyta `render.yaml` → **Apply**.
3. Poczekaj na build (backend: kilka minut, frontend: ok. 1 min).
4. **Sprawdź adres backendu** w panelu Rendera. Jeśli nie jest to `https://kbb-backend.onrender.com`
   (nazwa zajęta), popraw `destination` w `render.yaml` (sekcja `routes` frontendu) i wdróż ponownie.
5. Test: `https://<backend>/api/health` → `{"status":"ok","database":"ok"}`, potem adres frontendu.

## Żeby backend nie zasypiał w tygodniu prezentacji

- Darmowy pinger (np. UptimeRobot): zapytanie `GET https://<backend>/api/health` co 5–10 min.
  Jedna usługa całą dobę przez tydzień to ok. 170 h - mieści się w darmowym limicie godzin.
- 2–3 min przed prezentacją: otwórz aplikację i wyznacz jedną trasę (wszystko się rozgrzeje).

## Plan B na dzień prezentacji

Z laptopa z działającym `docker compose`: `cloudflared tunnel --url http://localhost:5173`
daje tymczasowy link z HTTPS (bez konta, link zmienia się przy każdym uruchomieniu).

Limity darmowych planów Render zmieniają się - przed wdrożeniem sprawdź aktualny cennik.
