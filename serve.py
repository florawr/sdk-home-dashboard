#!/usr/bin/env python3
"""Static server pinned to SDKHomeExperience. Run: python3 serve.py → http://127.0.0.1:5173/"""
import functools, http.server, os, socketserver
ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "5173"))
class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()
Handler = functools.partial(NoCacheHandler, directory=ROOT)
class Server(socketserver.TCPServer):
    allow_reuse_address = True
with Server(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/")
    httpd.serve_forever()
