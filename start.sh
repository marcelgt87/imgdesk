#!/bin/bash

# Image Desk - Launch Script
# This script opens the Image Desk web application in your default browser

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the HTML file
HTML_FILE="$SCRIPT_DIR/index.html"

# Check if the HTML file exists
if [ ! -f "$HTML_FILE" ]; then
    echo "Error: index.html not found in $SCRIPT_DIR"
    exit 1
fi

echo "🚀 Starting Image Desk..."
echo "📁 Opening: $HTML_FILE"

# Try different methods to open the browser depending on the system
if command -v xdg-open > /dev/null; then
    # Linux with xdg-open (most common)
    xdg-open "file://$HTML_FILE"
elif command -v gnome-open > /dev/null; then
    # GNOME desktop
    gnome-open "file://$HTML_FILE"
elif command -v kde-open > /dev/null; then
    # KDE desktop
    kde-open "file://$HTML_FILE"
elif command -v firefox > /dev/null; then
    # Fallback to Firefox if available
    firefox "file://$HTML_FILE"
elif command -v google-chrome > /dev/null; then
    # Fallback to Chrome if available
    google-chrome "file://$HTML_FILE"
elif command -v chromium > /dev/null; then
    # Fallback to Chromium if available
    chromium "file://$HTML_FILE"
else
    echo "❌ Could not find a suitable browser to open the application."
    echo "Please open the following file manually in your browser:"
    echo "file://$HTML_FILE"
    exit 1
fi

echo "✅ Image Desk should now be opening in your default browser!"
echo ""
echo "🎯 How to use:"
echo "  • Click 'Load Image Folder' to select a folder with images"
echo "  • Right-click + drag to pan around the desk"
echo "  • Scroll mouse wheel to zoom in/out"
echo "  • Left-click to select and drag images"
echo "  • Drag on empty space to select multiple images"
echo ""
echo "Enjoy organizing your images! 📸"
