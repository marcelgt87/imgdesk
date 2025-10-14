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
└── # ImageDesk - Native Desktop Image Manager

A powerful native desktop application for image management, clustering, and organization with full file system access.

## Features

### Core Functionality
- **Visual Image Management**: Intuitive drag-and-drop interface for organizing images
- **Smart Clustering**: Group similar images automatically using perceptual hashing
- **Favorites System**: Mark important images with star overlays
- **Similarity Detection**: Highlight visually similar images
- **Fullscreen Viewing**: Double-click images for fullscreen preview

### Desktop-Specific Features
- **Full File System Access**: Move, copy, delete, and rename images
- **Native File Operations**: Create folders, batch operations
- **System Integration**: Right-click context menus, native dialogs
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Keyboard Shortcuts**: Full keyboard navigation and shortcuts

### File Operations
- **Move Images**: Move selected images to different folders
- **Copy Images**: Create copies in specified locations  
- **Delete Images**: Safely delete selected images with confirmation
- **Rename Files**: Rename individual images
- **Create Folders**: Create new directories for organization
- **Show in Folder**: Open file location in system file manager

### Clustering & Organization
- **Automatic Grouping**: Cluster similar images based on visual content
- **Representative Selection**: Choose which image represents each cluster
- **Cluster Management**: Add, remove, or modify image clusters
- **Batch Operations**: Perform operations on entire clusters

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)

### Quick Setup

**Windows:**
```cmd
install.bat
```

**Linux/macOS:**
```bash
chmod +x install.sh
./install.sh
```

**Manual Installation:**
```bash
npm install
```

## Usage

### Running the Application
```bash
npm start
```

### Building for Distribution

**Windows Executable:**
```bash
npm run build-win
```

**Linux AppImage:**
```bash
npm run build-linux
```

**macOS DMG:**
```bash
npm run build-mac
```

Built applications will be available in the `dist/` folder.

## Keyboard Shortcuts

- **Ctrl+O**: Open folder
- **Ctrl+A**: Select all images
- **Ctrl+G**: Group similar images
- **Ctrl+Shift+C**: Clear all images
- **F**: Toggle favorite on selected images
- **C**: Create cluster from selected images
- **Delete**: Delete selected images
- **Escape**: Clear selection / Close dialogs
- **Double-click**: Fullscreen view
- **Ctrl+0**: Reset zoom
- **Ctrl+Plus**: Zoom in
- **Ctrl+Minus**: Zoom out

## Context Menu Options

Right-click on images for:
- Toggle Favorite
- Show in Folder
- Move to...
- Copy to...
- Rename
- Delete

## File Format Support

Supports all common image formats:
- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif)
- **BMP** (.bmp)
- **WebP** (.webp)
- **TIFF** (.tiff, .tif)

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Electron (Node.js)
- **Image Processing**: Sharp library for metadata extraction
- **File Operations**: fs-extra for enhanced file system access

### Security Features
- Sandboxed renderer process
- Context isolation enabled
- Secure IPC communication
- No remote module access

### Performance Optimizations
- Lazy loading of images
- Efficient perceptual hashing
- Optimized canvas rendering
- Memory-conscious batch operations

## Development

### Project Structure
```
imagedesk/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge
├── renderer/            # Frontend application
│   ├── index.html       # Main UI
│   ├── script.js        # Application logic
│   └── style.css        # Styling
├── assets/              # Application icons
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

### Dependencies
- **Electron**: Desktop application framework
- **Sharp**: High-performance image processing
- **fs-extra**: Enhanced file system operations
- **electron-builder**: Application packaging

## Converting from Web Version

This desktop version provides the same core functionality as the web version plus:

1. **File System Access**: Full read/write access to the file system
2. **Native Dialogs**: System file/folder selection dialogs
3. **Batch Operations**: Move/copy/delete multiple files efficiently
4. **System Integration**: Context menus, file associations
5. **Better Performance**: Native file access without browser limitations
6. **Offline Operation**: No web server required

## Troubleshooting

### Common Issues

**"Node.js not found"**
- Install Node.js from https://nodejs.org/

**"Permission denied" errors**
- On Linux/macOS: Make install script executable with `chmod +x install.sh`
- Run as administrator on Windows if needed

**Images not loading**
- Ensure image files are not corrupted
- Check file permissions
- Try a different folder

**Build fails**
- Ensure all dependencies are installed: `npm install`
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

### Performance Tips

- Close other resource-intensive applications
- Work with smaller batches of images (< 1000 at a time)
- Use SSD storage for better file operations
- Ensure adequate RAM (4GB+ recommended)

## License

MIT License - Feel free to modify and distribute.

## Contributing

Contributions welcome! Please feel free to submit pull requests or report issues.

---

**Note**: This native desktop version replaces the web-based server.py approach with full desktop application capabilities, providing enhanced functionality and better user experience.     # This file
```

Enjoy organizing your images on the virtual desk! 📸
