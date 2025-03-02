# High Level Overview

Our browser extension has three key components that work together:

- `background.js` (Runs in the background, detects gestures)
- `content.js` (Injected into web pages, handles UI interactions & scrolling)
- `manifest.json` (Defines extension settings & permissions)

`background.js` detects gestures using MediaPipe or TensorFlow. When a gesture is recognized, `background.js` sends a message to `content.js`. `content.js` listens for messages and performs the corresponding browser action (e.g., scrolling). As a result, the user sees the result (page scrolls, pointer moves, etc.).

`manifest.json` tells the browser:

- What permissions the extension needs.
- Which scripts should run on web pages.
- Which file handles background processing.

Key Configs:

- We use the up to date manifest version: 3.
- Defines background script (service workers) for gesture recognition.
- Injects `content.js` into all web pages (matches: ["<all_urls>"]).
- Allows storage & scripting (permissions) to send messages between scripts.
- Defines a popup when user clicks the extension icon.

# File Structure

```
 📂 extension           <-- Browser extension source code
  ├── 📂 src            <-- JavaScript source files
  ├── 📂 dist           <-- Compiled & bundled files for distribution
  ├── 📂 ui             <-- UI, cursor visualizations
  ├── manifest.json     <-- Browser extension manifest
  ├── background.js     <-- Handles extension lifecycle
  ├── content.js        <-- Injects scripts into web pages
  └── README.md
```