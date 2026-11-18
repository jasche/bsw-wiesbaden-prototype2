"""Holt den RSS-Feed der NachDenkSeiten und schreibt die neuesten Beiträge
(nur Titel, Datum, Autor, Link) nach Aktuelles/nachdenkseiten.json.

Läuft stündlich über .github/workflows/nachdenkseiten-feed.yml.
Nur Python-Standardbibliothek, keine Abhängigkeiten.
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from zoneinfo import ZoneInfo

FEED_URL = "https://www.nachdenkseiten.de/?feed=rss2"
OUT = Path(__file__).resolve().parents[2] / "Aktuelles" / "nachdenkseiten.json"
MAX_ITEMS = 10
TZ = ZoneInfo("Europe/Berlin")
MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
          "August", "September", "Oktober", "November", "Dezember"]
DC = "{http://purl.org/dc/elements/1.1/}"


def datum_de(dt):
    dt = dt.astimezone(TZ)
    return f"{dt.day}. {MONATE[dt.month - 1]} {dt.year}"


def main():
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "bsw-wiesbaden-kv.de-feed/1.0 (+https://www.bsw-wiesbaden-kv.de)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        root = ET.fromstring(resp.read())

    eintraege = []
    for item in root.iter("item"):
        titel = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        if not titel or not link.startswith("https://www.nachdenkseiten.de/"):
            continue
        datum, iso = "", ""
        raw = item.findtext("pubDate")
        if raw:
            try:
                dt = parsedate_to_datetime(raw)
                datum, iso = datum_de(dt), dt.astimezone(timezone.utc).isoformat()
            except (TypeError, ValueError):
                pass
        eintraege.append({
            "titel": titel,
            "link": link,
            "datum": datum,
            "iso": iso,
            "autor": (item.findtext(f"{DC}creator") or "").strip(),
        })
        if len(eintraege) >= MAX_ITEMS:
            break

    if not eintraege:
        print("Keine Einträge gefunden – bestehende Datei bleibt unverändert.")
        return 0

    data = {
        "quelle": "NachDenkSeiten – Die kritische Website",
        "quelle_url": "https://www.nachdenkseiten.de",
        "eintraege": eintraege,
    }
    neu = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == neu:
        print("Feed unverändert.")
        return 0
    OUT.write_text(neu, encoding="utf-8")
    print(f"{len(eintraege)} Beiträge geschrieben nach {OUT}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
