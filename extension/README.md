# High Level Overview

When a webpage and our extension are both loaded, we first retrives user preferences and tries to start the camera in an offscreen context (`offscreen.js`). It takes in the camera stream and detects gestures using pretrained MediaPipe hand model with TensorFlow. When a gesture is recognized, `content.js` performs the corresponding browser action (e.g., scrolling). As a result, the user sees the result (page scrolls, pointer moves, etc.).

`background.js` runs in the background and is responsible for creating offscreen context, handling persistent or event/message related tasks. For example:

- Welcome page
- Handling extension icon changes (e.g. dark mode)
- Inter component messaging between popup, content.js and storage
- Store, retrieve and update storage
- (Potentially) notifications
- Detect Tab/URL changes (for site filtering and context aware functions)

## File Structure

```text
 📂 extension           <-- Browser extension source code
  ├── 📂 src            <-- JavaScript source files
  ├── 📂 dist           <-- Compiled & bundled files for distribution
  ├── 📂 ui             <-- UI, cursor visualizations
  ├── manifest.json     <-- Browser extension manifest
  ├── background.js     <-- Handles extension lifecycle
  ├── content.js        <-- Injects scripts into web pages
  └── README.md
```
