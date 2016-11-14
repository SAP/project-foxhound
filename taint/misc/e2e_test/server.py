#!/usr/bin/env python3
#
# Minimalistic webserver using asyncio.
#
# Copyright (c) 2016 Samuel Groß
#

import asyncio

#
# HTTP Server
#

HTTP_PHRASES = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Time-out",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Large",
    415: "Unsupported Media Type",
    416: "Requested range not satisfiable",
    417: "Expectation Failed",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Time-out",
    505: "HTTP Version not supported",
}

class HTTPServer:
    """Minimalistic, stream-based HTTP server."""
    # TODO add some error handling.. :)

    class Response:
        """Represents an outgoing HTTP response."""
        def __init__(self, writer):
            self._writer = writer

        def start_header(self, code):
            resline = 'HTTP/1.1 {} {}'.format(code, HTTP_PHRASES.get(code, ''))
            print("  >", resline)
            self.write(resline + '\r\n')

        def end_header(self):
            self.add_header('Connection', 'close')
            self.write('\r\n')

        def write(self, data):
            if type(data) == str:
                data = bytes(data, 'ascii')
            self._writer.write(data)

        def add_header(self, key, value):
            assert('\n' not in key + value)
            print("  > {}: {}".format(key, value))
            self.write(key + ': ' + value + '\r\n')

        def send_header(self, code, headers):
            self.start_header(code)
            for key, value in headers.items():
                self.add_header(key, value)
            self.end_header()

        async def drain(self):
            await self._writer.drain()

    class Request:
        """Represents an incoming HTTP request."""
        def __init__(self, peer, method, path, version, headers, reader):
            self.peer = peer
            self.method = method
            self.path = path
            self.version = version
            self.headers = headers
            self.reader = reader

        def __str__(self):
            s = "Request from {}\n".format(self.peer)
            s += "  < {} {} {}\n".format(self.method, self.path, self.version)
            for key, value in self.headers.items():
                s += "  < {}: {}\n".format(key, value)
            return s

    def __init__(self, host, port, routes, loop):
        self._coro = asyncio.start_server(self.handle_client, host, port, loop=loop)
        self._loop = loop
        self._routes = routes

    async def send_404(self, request, response):
        response.send_header(404, {
            'Content-Length': '0'
        })

    async def receive_header(self, reader, writer):
        header = await reader.readuntil(b'\r\n\r\n')
        headers = header.rstrip().split(b'\r\n')

        # Extract request line
        # TODO handle GET parameters etc.
        reqline = headers[0].decode('ascii').rstrip().split(' ')
        method, path, version = reqline

        # Extract remaining headers
        headers = dict(line.decode('ascii').split(': ') for line in headers[1:])

        peer = writer.get_extra_info('peername')
        return self.Request(peer, method, path, version, headers, reader)

    async def handle_client(self, reader, writer):
        response = self.Response(writer)
        request = await self.receive_header(reader, writer)
        print(request)

        handler = self._routes.get(request.path, self.send_404)
        await handler(request, response)

        await writer.drain()
        writer.close()

    def run_forever(self):
        server = self._loop.run_until_complete(self._coro)

        # Serve requests until Ctrl+C is pressed
        print("Serving on {}".format(server.sockets[0].getsockname()))
        try:
            self._loop.run_forever()
        except KeyboardInterrupt:
            pass

        # Close the server
        server.close()
        self._loop.run_until_complete(server.wait_closed())
        self._loop.close()


#
# Request handlers
#

def serve_file(path, ctype):
    async def coro(request, response):
        with open(path, 'rb') as f:
            content = f.read()

        response.send_header(200, {
            'Content-Length':str(len(content)),
            'Content-Type': ctype
        })

        response.write(content)

    return coro
