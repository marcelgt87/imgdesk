#!/bin/bash

# Image Desk - Launch Script
# This script starts the Image Desk web server and opens it in your browser

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to the Python server
SERVER_FILE="$SCRIPT_DIR/server.py"
HTML_FILE="$SCRIPT_DIR/imagedesk/index.html"

# Check if the required files exist
if [ ! -f "$SERVER_FILE" ]; then
    echo "❌ Error: server.py not found at $SERVER_FILE"
    echo "Make sure the server.py file exists in the project directory"
    exit 1
fi

if [ ! -f "$HTML_FILE" ]; then
    echo "❌ Error: index.html not found at $HTML_FILE"
    echo "Make sure the imagedesk directory exists with the web files"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 > /dev/null; then
    echo "❌ Error: Python 3 is not installed or not in PATH"
    echo "Please install Python 3 to run Image Desk"
    echo ""
    echo "On Ubuntu/Debian: sudo apt update && sudo apt install python3"
    echo "On CentOS/RHEL: sudo yum install python3"
    echo "On Fedora: sudo dnf install python3"
    exit 1
fi

echo "🚀 Starting Image Desk Web Server..."
echo "📁 Project directory: $SCRIPT_DIR"
echo ""

# Change to the script directory
cd "$SCRIPT_DIR"

# Set up signal handler for clean shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down Image Desk server..."
    echo "👋 Thank you for using Image Desk!"
    exit 0
}

# Trap Ctrl+C (SIGINT) and call cleanup function
trap cleanup SIGINT

# Start the Python server
echo "🐍 Launching Python web server..."
echo "🌐 Server will be available at: http://localhost:8080"
echo ""
echo "✨ Image Similarity Features:"
echo "  • Images are automatically grouped by visual similarity"
echo "  • Click an image to highlight similar ones"
echo "  • Use Ctrl+S or 'Group Similar' button to rearrange"
echo ""
echo "📱 Open the URL above in your browser to access Image Desk"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

python3 server.py
