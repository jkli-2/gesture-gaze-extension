# High Level Overview

When a webpage and our extension are both loaded, `popup.js` retrives user preferences and tries to start the camera (`camera.js`). `content.js` takes in the camera stream and detects gestures using MediaPipe or TensorFlow. When a gesture is recognized, `content.js` performs the corresponding browser action (e.g., scrolling). As a result, the user sees the result (page scrolls, pointer moves, etc.).

`background.js` runs in the background and is responsible for handling persistent or event/message related tasks. For example:

- Welcome page
- Handling extension icon changes (e.g. dark mode)
- Inter component messaging between popup, content.js and storage
- Store, retrieve and update storage
- (Potentially) notifications
- Detect Tab/URL changes (for site filtering and context aware functions)

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