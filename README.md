# taylerd-icons

Ikonbiblioteket för Taylerd Base, hämtat från Figma. Källan är alltid Figma (fil `SzpDeEBqCZ4s4o1erlitD1`, frame "icons"). Ändra aldrig filerna här för hand.

- `svg/<namn>.svg` en fil per ikon (24x24, `currentColor`)
- `sprite.svg` alla ikoner som `<symbol id="icon-<namn>">` (används av sidan /ikoner)
- `icons.json` namnlista

Webflow hämtar ikoner från `https://cdn.jsdelivr.net/gh/ErikTaylerd/taylerd-icons@main/svg/<namn>.svg`.

## Uppdatera efter en ändring i Figma

1. Ändra eller lägg till ikonen i Figma (komponentnamn i snake_case, 24x24).
2. GitHub > Actions > "Sync icons from Figma" > Run workflow.
3. Klart. Ändrade filer committas och cachen hos jsDelivr rensas.

## Första uppsättningen

Lägg en Figma personal access token (scope `file_content:read`) som repo-hemlighet `FIGMA_TOKEN` (Settings > Secrets and variables > Actions).
Lokal körning: `FIGMA_TOKEN=... node scripts/export-figma.mjs`.
