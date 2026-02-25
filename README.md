# My Changelog – Figma Plugin

Figma plugin to document design changes with versioning. Supports File commits (with Figma version history) and UX/UI commits.

## How to try the plugin

1. Open the **Figma desktop app** (plugins run there).
2. Go to **Plugins** → **Development** → **Import plugin from manifest…**
3. Select the project folder and choose `manifest.json`.

## Structure

- **`code.js`** – Main plugin code (Figma document API).
- **`ui.html`** – Plugin UI (HTML + scripts).
- **`manifest.json`** – Plugin configuration.

## Features

- **File commit**: Documents changes in the Changelog page with semantic versioning (beta, patch, minor, major).
- **UX/UI commit**: Documents design changes in a separate UX/UI page, with UI/UX type selection.
- Version history support for File commits.
- Timeline layout with indentation for major/minor/patch entries.

More info: [Figma Plugin Quickstart](https://www.figma.com/plugin-docs/plugin-quickstart-guide/)
