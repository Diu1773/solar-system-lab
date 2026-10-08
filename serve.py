"""Serve the published lab on localhost with Python's standard library."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

root = Path(__file__).resolve().parent / "docs"
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
server = ThreadingHTTPServer(("127.0.0.1", 4317), handler)
print("Lab:   http://127.0.0.1:4317/")
print("Class: http://127.0.0.1:4317/class/")
print("Stop with Ctrl+C.")
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
