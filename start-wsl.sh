#!/bin/bash

echo "🚀 Starting ImageDesk Native Desktop App in WSL..."

# Check if DISPLAY is set for WSL2 GUI support
if [ -z "$DISPLAY" ]; then
    echo "⚠️  Setting up DISPLAY for WSL GUI support..."
    export DISPLAY=:0.0
fi

# Check if we're in WSL2 and need special X11 forwarding
if grep -qE "(microsoft|WSL)" /proc/version 2>/dev/null; then
    echo "🐧 Detected WSL environment"
    
    # For WSL2, we might need to use the Windows host IP
    if [ -z "$DISPLAY" ] || [ "$DISPLAY" = ":0.0" ]; then
        # Get Windows host IP for WSL2
        export DISPLAY=$(awk '/nameserver / {print $2; exit}' /etc/resolv.conf 2>/dev/null):0.0
        echo "📺 Set DISPLAY to: $DISPLAY"
    fi
fi

# Check if X11 forwarding is working (optional test)
echo "🔍 Testing X11 connection..."
if command -v xset >/dev/null 2>&1; then
    if xset q >/dev/null 2>&1; then
        echo "✅ X11 connection working"
    else
        echo "❌ X11 connection failed. Make sure you have an X server running on Windows."
        echo "   Recommended: Install VcXsrv or Xming on Windows"
        echo "   Start the X server with 'Disable access control' checked"
    fi
else
    echo "ℹ️  X11 utilities not installed, skipping X11 test"
fi

# Set up environment for Electron
export ELECTRON_DISABLE_SANDBOX=1
export NO_SANDBOX=1

# Start the application
echo "🎨 Starting ImageDesk..."
cd "$(dirname "$0")"
npm start

echo "👋 ImageDesk closed"