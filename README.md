# My changelog – Plugin de Figma (JavaScript)

Plugin de Figma escrito solo en **JavaScript**. No hace falta compilar nada.

## Cómo probar el plugin

1. Abre la **app de escritorio de Figma** (los plugins se prueban ahí).
2. Ve a **Plugins** → **Development** → **Import plugin from manifest…**
3. Elige la carpeta de este proyecto y selecciona el archivo `manifest.json`.

## Estructura

- **`code.js`** – Código principal del plugin (acceso al documento de Figma).
- **`ui.html`** – Interfaz del plugin (HTML + script en el navegador).
- **`manifest.json`** – Configuración del plugin (nombre, entrada, etc.).

## Cómo funciona

El plugin muestra una ventana, pide un número y crea esa cantidad de rectángulos naranjas en la página actual.

Más información: [Plugin Quickstart Guide](https://www.figma.com/plugin-docs/plugin-quickstart-guide/)
