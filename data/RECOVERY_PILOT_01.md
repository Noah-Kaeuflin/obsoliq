# Bestellungen prüfen: synthetischer Übungsfall

Alle Positionen, Aussagen und Referenzen sind erfunden. Diese Übung belegt weder Einsparungen noch eine bestätigte Lieferantenänderung.

## Dateien und Vorbereitung

Öffne `prototype.html` in einem separaten Browserfenster ohne wichtige ungesicherte Arbeit. Klicke **Beispieldaten**. Damit werden die zusammengehörenden Bestände, Materialstammdaten und Verbrauchshistorie geladen. Die bestehenden Beispieldateien werden nicht geändert.

Im mitgelieferten Ordner `Dateien` liegen `po-anfang.xlsx` und `po-aktualisierung.xlsx`. Dieselben Anfangs- und Aktualisierungsstände liegen auch als CSV und TSV vor. Für den vollständigen Durchlauf nur XLSX verwenden; die anderen Formate sind Alternativen, keine zusätzlich benötigten Quellen. Quellenwechsel können vorhandene Entscheidungen veralten lassen, selbst wenn die angezeigten Mengen gleich sind.

Die TSV-Variante beginnt absichtlich mit Material und Werk statt Bestellung und Position. Die Spaltenzuordnung muss diese andere Reihenfolge berücksichtigen; die fachlichen Werte bleiben gleich.

## Anfangsstand prüfen

1. Öffne **Bestellungen**, dann **Bestellpositionen importieren**. Wähle `po-anfang.xlsx`.
2. Prüfe die Zuordnung von Bestellung, Position, Material, Werk, offener Menge und Einheit. Die erste Bestellung heißt **0004500001**, Position **00010**, Material **MAT-1090**, Werk **PLANT-03**. Führende Nullen bleiben erhalten.
3. Wähle für **Offene Menge** und **Offener Positionswert** das Zahlenformat **en-US**, Skalierung **Automatisch**. Die Hauptdateien haben keine deutschen Tausenderpunkte. Lieferdaten sind `yyyy-mm-dd` und dürfen auf Automatisch bleiben.
4. Prüfe die Vorschau, bestätige die Erklärung zur offenen Restmenge und klicke **Zuordnung anwenden**. Es erscheinen zwölf Quellzeilen, davon sechs formal verwendbare Positionen. Drei sind einem Bestand zugeordnet; nur zwei gehören zum zentralen Überbestandsfall.
5. Vergleiche mit der untenstehenden Erwartungstabelle. Eine verwendbare Position ist nicht automatisch einem passenden Bestand oder Überbestandsfall zugeordnet.

## Entscheidung und Rückmeldung

1. Öffne bei **0004500001 / 00010** den Fall. In den Entscheidungsdetails öffne **Maßnahmen**. Wähle die beiden Bestellpositionen und übergib sie über **In Maßnahmen prüfen**.
2. Öffne die Entscheidung zur Position **00010**. Wähle eine **Reduktionsanfrage**, Menge **8**, einen Grund und als verantwortliche Funktion **Synthetischer Einkauf**. Speichere zunächst als **In Prüfung**. Das ist Version 1, noch keine dokumentierte Entscheidung.
3. Öffne erneut und speichere als **Dokumentiert**. Version 2 beschreibt weiterhin eine Anfrage über 8 von 12 offenen Einheiten, keine ausgeführte Reduktion.
4. Öffne die Entscheidung. Erfasse ausdrücklich unter **Version 2** eine Rückmeldung **Teilweise umgesetzt gemeldet**: „Synthetische Aussage: drei Einheiten umgesetzt gemeldet“, Rest „Fünf Einheiten noch offen gemeldet“, meldende Funktion „Synthetischer Einkauf“ und Meldedatum `2026-09-05`.
5. Korrigiere diese Rückmeldung: „Synthetische Korrektur: zwei Einheiten gemeldet“, Rest „Sechs Einheiten noch offen gemeldet“, Grund „Zahlendreher im synthetischen Beispiel“. Das Original bleibt sichtbar und als ersetzt gekennzeichnet. Die Rückmeldung ist eine menschliche Aussage, keine geprüfte Lieferantenbestätigung.

## Quelle aktualisieren

1. Schließe den Entscheidungsdialog. Importiere unter **Bestellungen** `po-aktualisierung.xlsx` mit derselben ausdrücklich geprüften Interpretation.
2. Position 00010 hat nun **6** offene Einheiten. Die bisherige Entscheidung wird **Veraltet**. Es entsteht weder eine automatische Rückmeldung noch eine Einsparung.
3. Öffne in **Maßnahmen** die Entscheidung und starte die erneute Quellenprüfung. Bestätige die neue Basis. Eine Anfrage über **8** muss blockiert bleiben, weil nur 6 offen sind.
4. Ändere die Anfrage auf **4** und dokumentiere sie. Die neue Entscheidung ist Version 3. Version 2 bleibt historisch erhalten; ihre beiden Rückmeldungseinträge bleiben ausschließlich dort.

## Export, Sicherung und Wiederherstellung

1. Exportiere **PO-Prüfliste** und **Rückmeldungen**. Die Prüfliste enthält beide übergebenen Positionen. Die Rückmeldungsdatei enthält Original und Korrektur mit Bezug auf Version 2. CSV ist ein lesbarer Bericht, keine wieder einspielbare Sicherung.
2. Lade über die Sicherungsfunktion die JSON-Datei herunter. Bewahre sie zusammen mit den Quelldateien auf. Sie enthält erfasste Texte und Quellenbezüge, ist nicht verschlüsselt und sichert keine ungespeicherten Dialogeingaben.
3. Lade die Anwendung neu. Die bisherige Arbeit ist nicht automatisch gespeichert.
4. Lade erneut **Beispieldaten**, danach `po-aktualisierung.xlsx` mit der zuvor bestätigten Interpretation. Öffne **Maßnahmen**, wähle **Wiederherstellen** und die tatsächlich heruntergeladene JSON-Datei.
5. Prüfe die Vorschau und bestätige die Wiederherstellung. Version 3 mit Anfrage 4, historische Version 2 mit Anfrage 8 sowie Original und Korrektur müssen erhalten sein. Historische Quellen können weiterhin als veraltet gekennzeichnet sein. Wiederherstellung bestätigt keine Umsetzung.

## Erwartungstabelle

Vor der Auswertung aus den bestehenden Regeln festgelegt. Gilt für `po-anfang.csv/.tsv/.xlsx` und `po-aktualisierung.csv/.tsv/.xlsx`; nur die erste Menge und ihr optionaler Positionswert ändern sich.

| Bestellung / Position | Material / Werk; Menge, Einheit | Normalisiert | Zuordnung / sichtbarer Grund | Nächster Schritt |
| --- | --- | --- | --- | --- |
| 0004500001 / 00010 | MAT-1090 / PLANT-03; 12 EA, später 6 EA | 12 bzw. 6; Wert 4920 bzw. 2460 EUR | Eindeutig zugeordnet, Überbestandsfall | Lieferbindung prüfen, Anfrage 8; nach Aktualisierung höchstens 6 |
| 0004500001 / 00020 | MAT-1090 / PLANT-03; 8 EA | 8 | Gleicher Überbestandsfall, eigene Position | Separat prüfen; nicht mit Position 00010 verschmelzen |
| 0004500002 / 00010 | MAT-1090 / PLANT-01; 4 EA | 4 | Kein passender Bestand in diesem Werk | Werk und Bestandsquelle prüfen; keine Zuordnung zu PLANT-03 |
| 0004500003 / 00010 | MAT-1001 / PLANT-02; 3 EA | 3; optionaler Wert 14,4 EUR | Eindeutig zugeordnet, kein Überbestandsfall | Bestand prüfen; kein neuer Überbestandsfall |
| PO-UNKNOWN / A-01 | MAT-UNKNOWN / PLANT-03; 2 EA | 2; Textkennungen unverändert | Kein passender Bestand | Material und Quelle prüfen |
| 0004500005 / 00010 | MAT-1090 / PLANT-03; 10, Einheit leer | 10, keine erfundene Einheit | Ausgeschlossen: Einheit fehlt | Quelle vervollständigen |
| 0004500006 / 00010 | MAT-1090 / PLANT-03; 10 KG | 10 KG | Einheit fehlt oder widerspricht | Einheit klären; keine automatische Umrechnung |
| 0004500007 / 00010 (zweimal) | MAT-1090 / PLANT-03; 10 bzw. 20 EA | Beide Mengen getrennt | Beide ausgeschlossen: doppelte Positionsidentität | Quelldubletten klären; kein erster/letzter Gewinner |
| 0004500008 / 00010 | MAT-1090 / PLANT-03; 0 EA | Echte 0; Wert 0 EUR | Ausgeschlossen: keine offene Menge (0) | Kein offener Prüfauftrag |
| 0004500009 / 00010 | MAT-1090 / PLANT-03; 12abc EA | Menge nicht verfügbar | Ausgeschlossen: ungültige Menge | Zahl an Quelle korrigieren, keine Teilrettung als 12 |
| 0004500010 / 00010 | MAT-1090 / PLANT-03; Menge leer | Menge nicht verfügbar, nicht 0 | Ausgeschlossen: offene Menge fehlt | Quelle ergänzen |

## Zusätzliche Formatprüfungen

Diese Dateien sind technische Gegenproben, nicht Teil der normalen Klickfolge. Sie ersetzen bei erfolgreichem Import die aktive PO-Quelle. Danach für den Pilot wieder die richtige Hauptdatei laden.

| Datei | Bestätigung / Erwartung |
| --- | --- |
| zahlen-de.xlsx | Mengen als Text `1.234,50` und `2.345,75`, ausdrücklich de-DE: 1234,5 und 2345,75 |
| zahlen-en.xlsx | Mengen als Text `1,234.50` und `2,345.75`, ausdrücklich en-US: dieselben Mengen |
| datum-1900.xlsx / datum-1904.xlsx | Datumsformat Excel-Serial plus jeweiliges System ausdrücklich auswählen: 2026-10-01. Ohne System Datum nicht verfügbar |
| mehrdeutige-menge.xlsx | `1,234` ohne bestätigtes Locale nicht als Menge erraten; kein verwendbarer Import |
| numerische-kennung.xlsx | Numerisch gespeicherte Kennungen 4500001 und 10 bleiben ohne erfundene führende Nullen |
| ungueltige-zellen.xlsx | Echte Excel-Fehlerzelle und Formel ohne Ergebnis: ungültig bzw. fehlend; kompletter Import blockiert, vorheriger Stand bleibt |
| beschaedigt.xlsx | Absichtlich kein gültiges ZIP: verständlicher Fehler, vorheriger Stand bleibt |

Abbrechen im Assistenten darf bestehende Daten nicht ersetzen. Eine fachlich gleiche TSV-Datei nach einer XLSX-Entscheidung darf deren Quellenprüfung nicht umgehen.

## Grenzen

Die Dateien verwenden ein einzelnes Arbeitsblatt. Eine allgemeine Arbeitsblattauswahl, Neuberechnung von Excel-Formeln, automatische Währungsumrechnung und Wiedergewinnung verlorener Kennungsnullen sind nicht enthalten. Zahlen-/Datumsinterpretation bleibt ausdrücklich zu prüfen. Nur ein synthetischer Ablauf wurde automatisiert geprüft; echte Nutzer, reale Lieferverträge, Kundendaten, große Dateien und andere Browser müssen separat geprüft werden.

## Feedbackbogen (vom Nutzer auszufüllen)

Datum: ____________________   Tatsächliche Bearbeitungsdauer: ____________________

War der nächste Schritt verständlich?

________________________________________________________________________

Waren Entscheidung, Rückmeldung und Quellenbeobachtung unterscheidbar?

________________________________________________________________________

War eine Warnung unklar? Welche?

________________________________________________________________________

Welche Information fehlte für eine fachliche Entscheidung?

________________________________________________________________________

An welcher Stelle war Hilfe erforderlich?

________________________________________________________________________

Nutzerurteil:

________________________________________________________________________
