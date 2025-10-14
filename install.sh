#!/bin/bash

echo "Installing ImageDesk Native Desktop Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

echo "Installing dependencies..."
npm install

echo ""
echo "Installation complete!"
echo ""
echo "To run the application:"
echo "  npm start"
echo ""
echo "To build for Windows:"
echo "  npm run build-win"
echo ""
echo "To build for Linux:"
echo "  npm run build-linux"
echo ""
echo "To build for macOS:"
echo "  npm run build-mac"
echo ""