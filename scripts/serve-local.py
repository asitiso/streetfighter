"""Serve the local game without the tiny default Windows connection backlog."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class LocalGameServer(ThreadingHTTPServer):
    request_queue_size = 128


class LocalGameHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".webp": "image/webp"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--directory", type=Path, default=Path(__file__).resolve().parent.parent / "dist")
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not directory.is_dir():
        parser.error(f"Game directory does not exist: {directory}; run the build first")
    handler = functools.partial(LocalGameHandler, directory=str(directory))
    with LocalGameServer((args.bind, args.port), handler) as server:
        print(f"Serving local game on http://{args.bind}:{server.server_port}/ (queue 128)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
