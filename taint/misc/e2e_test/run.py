#!/usr/bin/env python3

import asyncio
import json
import re

from server import *

HOST = '127.0.0.1'
PORT = 8000
LOOP = asyncio.get_event_loop()

server_done_event = asyncio.Event(loop=LOOP)
script_ready_event = asyncio.Event(loop=LOOP)


def serve_tainted_file(path, ctype):
    async def coro(request, response):
        with open(path, 'rb') as f:
            content = f.read()

        # Look for TAINTME markers
        taints = []
        for match in re.finditer(b'TAINTME', content):
            taints.append('{{begin: {}, end: {}, source: "{}"}}'.format(match.span()[0], match.span()[1], 'end2end taint source:' + path))

        response.send_header(200, {
            'Content-Type': ctype,
            'Content-Length': str(len(content)),
            'X-Taint': '[' + ','.join(taints) + ']',
        })

        response.write(content)

    return coro

ROUTES = {
    '/': serve_tainted_file('index.html', 'text/html; charset=utf-8'),
    '/taintme.js': serve_tainted_file('taintme.js', 'application/javascript; charset=utf-8'),
    '/test.js': serve_file('test.js', 'application/javascript; charset=utf-8'),
    '/xhrme.txt': serve_tainted_file('xhrme.txt', 'text/plain; charset=utf-8'),
}

def main():
    server = HTTPServer(HOST, PORT, ROUTES, LOOP)
    server.run_forever()

if __name__ == '__main__':
    main()
