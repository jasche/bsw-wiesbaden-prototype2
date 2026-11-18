# Redaktion bsw-wiesbaden-kv.de – Kurzanleitung

## Einmalig: Zugang einrichten (ca. 5 Minuten)

1. Sie brauchen ein GitHub-Konto mit Schreibrechten auf dieses Repository (`jasche/bsw-wiesbaden-prototype2`). Jürgen Aschenbrenner kann Sie unter *Settings → Collaborators* einladen.
2. Öffnen Sie **https://www.bsw-wiesbaden-kv.de/admin/**
3. Klicken Sie auf **„Sign in with Token“**. Das CMS führt Sie zur GitHub-Seite, auf der Sie einen Zugangsschlüssel (Personal Access Token) erzeugen. Rechte: nur dieses Repository, „Contents: Read and write“. Ablaufdatum: 1 Jahr.
4. Schlüssel kopieren, im CMS einfügen, fertig. Der Browser merkt sich die Anmeldung.

Den Schlüssel nicht weitergeben. Wer ausscheidet, löscht seinen Schlüssel auf GitHub unter *Settings → Developer settings → Personal access tokens*.

## Texte ändern

1. Unter **Seiten** die gewünschte Seite wählen (z. B. „Programm“).
2. Text im Formular ändern. Einträge in Listen (Termine, Meldungen, Personen) lassen sich mit **+** hinzufügen, verschieben oder löschen.
3. **Speichern**. Die Änderung ist nach ca. 1 Minute live.

Jede Speicherung wird auf GitHub protokolliert und kann zurückgenommen werden.

## Formatierung in Textfeldern

| Eingabe | Ergebnis |
|---|---|
| neue Zeile | neuer Absatz |
| `- Punkt` | Aufzählung |
| `**fett**` | **fett** |
| `*kursiv*` | *kursiv* |
| `[Linktext](https://…)` | Link |
| `### Zwischenüberschrift` | Zwischenüberschrift |
| `> Zitat` | hervorgehobenes Zitat |

## Regeln

- Parteiname bei erster Nennung je Seite ausschreiben: **BSW – Bündnis Soziale Gerechtigkeit und Wirtschaftliche Vernunft**, danach „BSW“.
- Keine Platzhalter wie `[Name]` stehen lassen, wenn die Seite öffentlich wird.
- Fotos nur mit schriftlicher Einwilligung; Bilder, Videos und Musik nur mit geklärten Rechten.
- Termine: neueste oben, vergangene löschen. Die drei obersten Meldungen unter „Aktuelles“ erscheinen auf der Startseite.

## Für Technik-Verantwortliche

- Inhalte: je Seite eine JSON-Datei im Seitenordner (`{ ueberschrift, einleitung, eintraege: [...] }`).
- Darstellung und Seitenmenü: zentral in `/assets/kv.js` (Menü-Reihenfolge oben in der Datei).
- CMS: Sveltia CMS, Konfiguration in `/admin/config.yml`. Hochgeladene Dateien landen in `/uploads/`.
- Mehr als 2–3 Redakteure: statt Tokens die GitHub-Anmeldung über den Sveltia-Authenticator (Cloudflare Worker) einrichten und in `config.yml` unter `backend` als `base_url` eintragen.
