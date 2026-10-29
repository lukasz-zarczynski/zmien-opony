# Glossary

## Temperatura progowa (Threshold Temperature)
The average daily temperature, 7°C, that separates winter-tire weather from summer-tire weather.

## Średnia dobowa (Daily Mean Temperature)
The average air temperature over one whole calendar day at the user's location.

## Średnia tygodniowa (Weekly Mean)
The mean of the Daily Mean Temperatures of the last 7 complete days, ending yesterday. It is the only input to the Verdict.

## Kierunek zmiany (Change Direction)
Which swap the page asks about: "na zimowe" (summer → winter) or "na letnie" (winter → summer). It is inferred from the calendar (Aug–Jan → na zimowe, Feb–Jul → na letnie) and the user can flip it. A third, joke option "całoroczne" (all-season tires) always gets NO and hides Season Alerts.

## Werdykt (Verdict)
The YES/NO answer to "is it time to change tires in the current Change Direction?".
- **na zimowe**: YES when the Weekly Mean is at or below the Threshold Temperature.
- **na letnie**: YES when the Weekly Mean is above the Threshold Temperature.

## Blisko progu (Near Threshold)
The Weekly Mean is within ±1°C of the Threshold Temperature. The Verdict stays YES/NO, but the user is told it may flip soon.

## Prognoza (Forecast)
Expected Daily Mean Temperatures for the coming days. Shown for context only; it never affects the Verdict.

## Lokalizacja (Location)
The place the Verdict is computed for. It comes from the browser's geolocation or from a city the user picked.

## Sezon (Season)
One calendar Change Direction in one year: Aug–Jan is the winter Season (e.g. "2026-winter" runs Aug 2026–Jan 2027), Feb–Jul is the summer Season.

## Powiadomienie (Season Alert)
A Web Push notification sent at most once per Season, when the Verdict for the Season's Change Direction becomes YES at the subscriber's Location. Users who sign up while it is already YES get their first alert in the next Season. The toggle on the page does not affect alerts.

