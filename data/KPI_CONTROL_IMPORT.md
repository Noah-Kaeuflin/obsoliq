# Synthetischer KPI-Kontrollbestand

`synthetic-kpi-calculability-control.csv` enthält ausschließlich vier erfundene Prüfpositionen. Keine Originalquelle wird geändert. Der Import ersetzt nur die aktive Analyse in der aktuellen Sitzung; persönliche Quellen und gegebenenfalls PO-Sicherungen vorher separat aufbewahren. Die normale Fehlerdemo bleibt unverändert über **Beispieldaten** erreichbar.

## Import (DE)

1. `prototype.html` öffnen, **Datei hochladen → Bestandsaufnahme / Inventory Snapshot** wählen und diese CSV auswählen.
2. In **Spaltenzuordnung** die erste Spalte **Synthetische Kontrollkennung → Materialnummer (`material_id`)** setzen. Die bewusst eigene Kennung macht den normalen Mapping-Review reproduzierbar.
3. **STD Price (EUR) → Standardpreis (`standard_price`)** setzen. Die anderen zehn Spalten sind automatisch zugeordnet. Prüfen: `Stock Value (EUR)` ist Bestandswert, `Stock Quantity` Bestandsmenge, alle sechs Risikoeingaben sind zugeordnet. Keine Skalierung oder FX-Konvertierung wählen.
4. Falls die aktuelle Zuordnung eine Bestätigung verlangt: im Input-Trust-Bereich prüfen und bestätigen. **Zuordnung anwenden**. Anschließend Übersicht, alle Filter zurückgesetzt: vier Positionen, sechs vollständige Geldwerte und Recovery-Anteil 65,3 %.
5. **Details ansehen** zeigt Centwerte. Suche `SYN-CALC-004` zeigt abgeleiteten Bestand 99,95 €, Recovery 0,00 € und Anteil 0 %. Eine Suche ohne Treffer zeigt keine erfundene Nullsumme.

Die Hinweiszahl zu fehlenden Materialstamm-/Historien-Erweiterungen ist kein Fehler der sieben Inventory-KPIs; diese Datei liefert absichtlich nur den Kontrollbestand.

## Unabhängig festgelegte Sollwerte

Die Werte wurden vor dem Produktvergleich durch Dezimalrechnung festgelegt, nicht mit der Produktfunktion erzeugt. Direkte Werte werden addiert; Ohne Bedarf ist die Summe der drei nichtnegativen Quellen. Der Waterfall verteilt in der Reihenfolge Ohne Bedarf → Ohne Plan → Überbestand → Gesperrt/QI, jeweils höchstens den noch verfügbaren Zeilenbestand.

| Kennzahl | Soll (EUR, außer Anteil) | Kompaktanzeige DE |
| --- | ---: | ---: |
| Gesamtbestand | 1.901,00 | 1.901 € |
| Überbestand | 575,70 | 576 € |
| Gesperrt / QI | 146,00 | 146 € |
| Ohne Bedarf | 650,95 | 651 € |
| Ohne Plan | 316,35 | 316 € |
| Recovery-Potenzial | 1.242,05 | 1.242 € |
| Recovery-Anteil | 1.242,05 / 1.901,00 × 100 = 65,3366649132… % | 65,3 % |

| Position | Bestand | Ohne Bedarf | Brutto | Netto: Bedarf / Plan / Überbestand / Gesperrt | Recovery | Überlappung |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| SYN-CALC-001 | 1.000,25 | 150,60 | 441,25 | 150,60 / 40,40 / 200,20 / 50,05 | 441,25 | 0,00 |
| SYN-CALC-002 | 300,30 | 350,35 | 571,55 | 300,30 / 0 / 0 / 0 | 300,30 | 271,25 |
| SYN-CALC-003 | 500,50 | 150,00 | 676,20 | 150 / 200,20 / 150,30 / 0 | 500,50 | 175,70 |
| SYN-CALC-004 | 99,95 | 0,00 | 0,00 | 0 / 0 / 0 / 0 | 0,00 | 0,00 |

Zeile 4 enthält wirklich einen **leeren** Bestandswert: zulässige Ableitung `5 × 19,99 EUR = 99,95 EUR`. Ein explizit ungültiger Bestandswert dürfte nicht ersetzt werden. Alle Geldquellen einschließlich Standardpreis besitzen ausdrücklich EUR-Header. Brutto gesamt: 1.689,00 EUR; Überlappung: 446,95 EUR; nicht adressierter Bestand: 658,95 EUR.

## Exportvergleich

**Bestand exportieren → Alle Zeilen → Angereicherter Datensatz → Google Sheets (CSV)**. Der Export bewahrt die Originalspalten und ergänzt unter anderem Recovery, Brutto und Überlappung. Er enthält nicht jede kanonische KPI als eigene Spalte. Deshalb wird Bestand aus dem Originalwert bzw. der dokumentierten Menge×Preis-Ableitung und Ohne Bedarf aus den drei Originalspalten abgeglichen. **Originaldaten** bewahrt auch die leere Zelle unverändert. Overview-Filter sind nicht automatisch Explorer-Exportfilter; für diesen Abgleich ausdrücklich **Alle Zeilen** wählen.

`PRODUCT_RELEASE_GATE: HOLD`
