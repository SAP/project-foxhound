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
            self.send_header("X-Taint", "[{begin: 10, end: 20, source: 'ASDF'}, {begin: 80, end: 90, source: 'foo'}]")
            self.send_header("Content-Type", "text/html; charset=utf-8")

    def do_GET(self):
        print("------------------------------------------------------")
        for key, value in self.headers.items():
            print('>  ' + key + ': ' + value)
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)


httpd = SocketServer.TCPServer(("", PORT), GetHandler)
httpd.serve_forever()
