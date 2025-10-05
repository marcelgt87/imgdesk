#!/usr/bin/env python3

import http.server
import socketserver
import os
import sys
import webbrowser
import threading
import time

class ImageDeskServer:
    def __init__(self, port=8080):
        self.port = port
        self.server = None
        self.httpd = None
        
    def find_available_port(self, start_port=8080):
        """Find an available port starting from the given port number"""
        import socket
        
        for port in range(start_port, start_port + 100):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('localhost', port))
                    return port
            except OSError:
                continue
        return None
    
    def start_server(self):
        """Start the HTTP server"""
        # Change to the directory containing the web files
        script_dir = os.path.dirname(os.path.abspath(__file__))
        web_files_dir = os.path.join(script_dir, 'imagedesk')
        
        # Check if the web files directory exists
        if not os.path.exists(web_files_dir):
            print(f"❌ Web files directory not found: {web_files_dir}")
            return False
            
        os.chdir(web_files_dir)
        
        # Find an available port
        available_port = self.find_available_port(self.port)
        if not available_port:
            print(f"❌ Could not find an available port starting from {self.port}")
            return False
            
        self.port = available_port
        
        # Create the server
        handler = http.server.SimpleHTTPRequestHandler
        
        # Add CORS headers to allow local file access
        class CORSRequestHandler(handler):
            def add_cors_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', '*')
            
            def do_GET(self):
                # Set proper MIME type for JavaScript files
                if self.path.endswith('.js'):
                    self.send_response(200)
                    self.send_header('Content-type', 'application/javascript')
                    self.add_cors_headers()
                    self.end_headers()
                    
                    with open(self.path[1:], 'rb') as f:
                        self.wfile.write(f.read())
                else:
                    super().do_GET()
                    
            def do_OPTIONS(self):
                self.send_response(200)
                self.add_cors_headers()
                self.end_headers()
        
        try:
            self.httpd = socketserver.TCPServer(("", self.port), CORSRequestHandler)
            return True
        except OSError as e:
            print(f"❌ Error starting server: {e}")
            return False
    
    def run(self):
        """Run the server and open browser"""
        print("🚀 Starting Image Desk Web Server...")
        print("=" * 50)
        
        if not self.start_server():
            return
        
        url = f"http://localhost:{self.port}"
        print(f"✅ Server started successfully!")
        print(f"🌐 Image Desk is now available at: {url}")
        print(f"📂 Serving files from: {os.getcwd()}")
        print()
        print("🎯 Features available:")
        print("  • Load entire folders of images")
        print("  • Pan with right-click + drag")
        print("  • Zoom with mouse wheel")
        print("  • Drag and drop images")
        print("  • Multi-select with drag area")
        print()
        print("⚠️  Note: Make sure to use a modern browser for best experience")
        print("🛑 Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Note: Browser auto-open disabled - access manually at the URL above
        
        # Start serving
        try:
            self.httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
        except Exception as e:
            print(f"\n❌ Server error: {e}")
        finally:
            if self.httpd:
                self.httpd.shutdown()
                print("✅ Server shutdown complete")

if __name__ == "__main__":
    # Allow custom port via command line argument
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("⚠️  Invalid port number. Using default port 8080.")
    
    server = ImageDeskServer(port)
    server.run()
