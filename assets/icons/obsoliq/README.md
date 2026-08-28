# ObsoliQ Icon Pack

Ein konsistentes Lucide-Outline-Set für das ObsoliQ Inventory Recovery Cockpit.

## Enthalten

- `navigation/`: 10 Icons für die Hauptnavigation
- `actions/`: 12 Icons für wiederkehrende Interaktionen
- `indicators/`: 12 Icons für KPIs, Kategorien und Status
- `detail-tabs/`: 5 Icons für den Decision Workspace
- `obsoliq-icon-sprite.svg`: alle Icons als SVG-Sprite
- `icon-manifest.json`: vollständige technische Zuordnung
- `ObsoliQ_Icon_Preview.svg` und `.png`: visuelle Übersicht

## Empfohlene Verwendung

```html
<svg class="oq-icon" aria-hidden="true">
  <use href="./obsoliq-icon-sprite.svg#oq-overview"></use>
</svg>
<span>Übersicht</span>
```

```css
.oq-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: currentColor;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #526b87;
}

.nav-item.is-active {
  color: #1764e8;
}
```

Für Navigation und beschriftete Buttons bleibt der Text sichtbar. Symbol-only-Buttons erhalten Tooltip und zugängliche Beschriftung.

## Kernzuordnung

| Bereich | Sprite-ID | Lucide-Icon |
| --- | --- | --- |
| Übersicht | `oq-overview` | `LayoutDashboard` |
| Bestands-Explorer | `oq-inventory-explorer` | `PackageSearch` |
| Überbestand | `oq-excess-stock` | `PackagePlus` |
| Langsam / Totbestand | `oq-slow-dead-stock` | `Clock` |
| Gesperrt / Qualität | `oq-blocked-quality` | `ShieldAlert` |
| Bestellungen | `oq-purchase-orders` | `ShoppingCart` |
| Maßnahmen | `oq-actions` | `ListChecks` |
| Datenqualität | `oq-data-quality` | `DatabaseZap` |
| Berichte | `oq-reports` | `FileChartColumn` |
| Einstellungen | `oq-settings` | `Settings` |

## Gestaltungsregeln

- Standardgröße: 16 px; KPI-Titel maximal 18 px
- Einheitliche Outline-Strichstärke: 2
- Farbe über `currentColor`
- 6–8 px Abstand zwischen Icon und Text
- Rot, Gelb und Grün nur für echte Statusbedeutungen
- Keine Mischung mit anderen Icon-Familien oder Emojis
- Das bestehende Q-Signet bleibt das Marken- und App-Icon

## Lizenz

Die Icons basieren auf Lucide und stehen unter der beigefügten ISC-Lizenz.
