# Image Desk

A modern web application for organizing and viewing images on a virtual desktop with pan, zoom, and drag-and-drop functionality.

## Features

✨ **Core Functionality:**
- Load entire folders of images at once
- Virtual desktop with unlimited canvas space
- Smooth pan and zoom navigation
- Drag and drop individual images
- Multi-selection with drag-to-select area
- Move multiple selected images together

🖱️ **Controls:**
- **Right-click + drag**: Pan around the desktop
- **Mouse wheel**: Zoom in and out
- **Left-click**: Select individual images
- **Ctrl/Cmd + click**: Multi-select images
- **Drag empty area**: Create selection box for multiple images
- **Drag selected images**: Move them around the desktop

⌨️ **Keyboard Shortcuts:**
- **Ctrl/Cmd + A**: Select all images
- **Delete/Backspace**: Remove selected images
- **Escape**: Clear selection

## How to Use

1. Open `index.html` in a modern web browser
2. Click "Load Image Folder" and select a folder containing images
3. Wait for images to load (they'll appear in a spiral pattern)
4. Use mouse controls to navigate and organize your images

## Browser Requirements

- Modern web browser with support for:
  - File API
  - CSS transforms
  - ES6 features
  - WebKit directory input (for folder selection)

## Technical Details

The application is built with vanilla HTML, CSS, and JavaScript for maximum compatibility and performance. It uses:

- CSS transforms for smooth scaling and positioning
- File API for reading image files
- Canvas-like coordinate system for image positioning
- Event delegation for efficient mouse handling
- Responsive design for different screen sizes

## File Structure

```
project/
├── index.html    # Main HTML structure
├── style.css     # Styling and animations  
├── script.js     # Application logic
└── README.md     # This file
```

Enjoy organizing your images on the virtual desk! 📸
