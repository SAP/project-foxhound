#!/usr/bin/env python

import SimpleHTTPServer
import SocketServer
import logging

PORT = 8000

class GetHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_my_headers()
        SimpleHTTPServer.SimpleHTTPRequestHandler.end_headers(self)

    def send_my_headers(self):
        if self.path.endswith('html') or self.path.endswith('foo'):
            print("Setting taint header")
            self.send_header("X-Taint", "[{begin: 10, end: 20, source: 'ASDF'}, {begin: 96, end: 128, source: 'inline_str_literal_src'}]")
            self.send_header("Content-Type", "text/html; charset=utf-8")

        if self.path.endswith('js'):
            print("Setting taint header for .js")
            self.send_header("X-Taint", "[{begin: 18, end: 22, source: 'str_literal_src'}]")
            self.send_header("Content-Type", "text/html; charset=utf-8")

    def do_GET(self):
        print("------------------------------------------------------")
        for key, value in self.headers.items():
            print('>  ' + key + ': ' + value)
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)


httpd = SocketServer.TCPServer(('127.0.0.1', PORT), GetHandler)
httpd.serve_forever()
