/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { NetUtil } from "resource://gre/modules/NetUtil.sys.mjs";

/* globals require, __dirname, global, Buffer, process */

class BaseNodeHTTPServerCode {
  static globalHandler(req, resp) {
    let path = new URL(req.url, "https://example.com").pathname;
    let handler = global.path_handlers[path];
    if (handler) {
      return handler(req, resp);
    }

    // Didn't find a handler for this path.
    let response = `<h1> 404 Path not found: ${path}</h1>`;
    resp.setHeader("Content-Type", "text/html");
    resp.setHeader("Content-Length", response.length);
    resp.writeHead(404);
    resp.end(response);
    return undefined;
  }
}

class ADB {
  static async stopForwarding(port) {
    return this.forwardPort(port, true);
  }

  static async forwardPort(port, remove = false) {
    if (!process.env.MOZ_ANDROID_DATA_DIR) {
      // Not android, or we don't know how to do the forwarding
      return true;
    }
    // When creating a server on Android we must make sure that the port
    // is forwarded from the host machine to the emulator.
    let adb_path = "adb";
    if (process.env.MOZ_FETCHES_DIR) {
      adb_path = `${process.env.MOZ_FETCHES_DIR}/android-sdk-linux/platform-tools/adb`;
    }

    let command = `${adb_path} reverse tcp:${port} tcp:${port}`;
    if (remove) {
      command = `${adb_path} reverse --remove tcp:${port}`;
      return true;
    }

    try {
      await new Promise((resolve, reject) => {
        const { exec } = require("child_process");
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            reject(error);
          } else if (stderr) {
            console.log(`stderr: ${stderr}`);
            reject(stderr);
          } else {
            // console.log(`stdout: ${stdout}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.log(`Command failed: ${error}`);
      return false;
    }

    return true;
  }

  static async listenAndForwardPort(server, port) {
    let retryCount = 0;
    const maxRetries = 10;

    while (retryCount < maxRetries) {
      await server.listen(port);
      let serverPort = server.address().port;
      let res = await ADB.forwardPort(serverPort);

      if (res) {
        return serverPort;
      }

      retryCount++;
      console.log(
        `Port forwarding failed. Retrying (${retryCount}/${maxRetries})...`
      );
      server.close();
      // eslint-disable-next-line no-undef
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return -1;
  }
}

class BaseNodeServer {
  protocol() {
    return this._protocol;
  }
  version() {
    return this._version;
  }
  origin() {
    return `${this.protocol()}://localhost:${this.port()}`;
  }
  port() {
    return this._port;
  }
  domain() {
    return `localhost`;
  }

  static async installCert(filename) {
    if (Services.appinfo.processType != Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT) {
      // Can't install cert from content process.
      return;
    }
    let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
      Ci.nsIX509CertDB
    );

    function readFile(file) {
      let fstream = Cc[
        "@mozilla.org/network/file-input-stream;1"
      ].createInstance(Ci.nsIFileInputStream);
      fstream.init(file, -1, 0, 0);
      let data = NetUtil.readInputStreamToString(fstream, fstream.available());
      fstream.close();
      return data;
    }

    // Find the root directory that contains netwerk/
    let currentDir = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
    let rootDir = currentDir.clone();

    // XXX(valentin) The certs are stored in netwerk/test/unit
    // Walk up until the dir contains netwerk/
    // This is hacky, but the alternative would also require
    // us to walk up the path to the root dir.
    while (rootDir) {
      let netwerkDir = rootDir.clone();
      netwerkDir.append("netwerk");
      if (netwerkDir.exists() && netwerkDir.isDirectory()) {
        break;
      }
      let parent = rootDir.parent;
      if (!parent || parent.equals(rootDir)) {
        // Reached filesystem root, fallback to current directory
        rootDir = currentDir;
        break;
      }
      rootDir = parent;
    }

    let certFile = rootDir.clone();
    certFile.append("netwerk");
    certFile.append("test");
    certFile.append("unit");
    certFile.append(filename);

    try {
      let pem = readFile(certFile)
        .replace(/-----BEGIN CERTIFICATE-----/, "")
        .replace(/-----END CERTIFICATE-----/, "")
        .replace(/[\r\n]/g, "");
      certdb.addCertFromBase64(pem, "CTu,u,u");
    } catch (e) {
      let errStr = e.toString();
      console.log(`Error installing cert ${errStr}`);
      if (errStr.includes("0x805a1fe8")) {
        // Can't install the cert without a profile
        // Let's show an error, otherwise this will be difficult to diagnose.
        console.log(
          `!!! BaseNodeServer.installCert > Make sure your unit test calls do_get_profile()`
        );
      }
    }
  }

  /// Stops the server
  async stop() {
    if (this.processId) {
      await this.execute(`ADB.stopForwarding(${this.port()})`);
      await NodeServer.kill(this.processId);
      this.processId = undefined;
    }
  }

  /// Executes a command in the context of the node server
  async execute(command) {
    return NodeServer.execute(this.processId, command);
  }

  /// @path : string - the path on the server that we're handling. ex: /path
  /// @handler : function(req, resp, url) - function that processes request and
  ///     emits a response.
  async registerPathHandler(path, handler) {
    return this.execute(
      `global.path_handlers["${path}"] = ${handler.toString()}`
    );
  }
}

// HTTP

class NodeHTTPServerCode extends BaseNodeHTTPServerCode {
  static async startServer(port) {
    const http = require("http");
    global.server = http.createServer(BaseNodeHTTPServerCode.globalHandler);

    let serverPort = await ADB.listenAndForwardPort(global.server, port);
    return serverPort;
  }
}

export class NodeHTTPServer extends BaseNodeServer {
  _protocol = "http";
  _version = "http/1.1";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    this.processId = await NodeServer.fork();

    await this.execute(BaseNodeHTTPServerCode);
    await this.execute(NodeHTTPServerCode);
    await this.execute(ADB);
    this._port = await this.execute(`NodeHTTPServerCode.startServer(${port})`);
    await this.execute(`global.path_handlers = {};`);
  }
}

// HTTPS

class NodeHTTPSServerCode extends BaseNodeHTTPServerCode {
  static async startServer(port) {
    const fs = require("fs");
    const options = {
      key: fs.readFileSync(__dirname + "/http2-cert.key"),
      cert: fs.readFileSync(__dirname + "/http2-cert.pem"),
      maxHeaderSize: 128 * 1024,
    };
    const https = require("https");
    global.server = https.createServer(
      options,
      BaseNodeHTTPServerCode.globalHandler
    );

    let serverPort = await ADB.listenAndForwardPort(global.server, port);
    return serverPort;
  }
}

export class NodeHTTPSServer extends BaseNodeServer {
  _protocol = "https";
  _version = "http/1.1";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    if (!this._skipCert) {
      await BaseNodeServer.installCert("http2-ca.pem");
    }
    this.processId = await NodeServer.fork();

    await this.execute(BaseNodeHTTPServerCode);
    await this.execute(NodeHTTPSServerCode);
    await this.execute(ADB);
    this._port = await this.execute(`NodeHTTPSServerCode.startServer(${port})`);
    await this.execute(`global.path_handlers = {};`);
  }
}

// HTTP2

class NodeHTTP2ServerCode extends BaseNodeHTTPServerCode {
  static async startServer(port) {
    const fs = require("fs");
    const options = {
      key: fs.readFileSync(__dirname + "/http2-cert.key"),
      cert: fs.readFileSync(__dirname + "/http2-cert.pem"),
    };
    const http2 = require("http2");
    global.server = http2.createSecureServer(
      options,
      BaseNodeHTTPServerCode.globalHandler
    );

    global.sessionCount = 0;
    global.sessions = new Set();
    global.server.on("session", session => {
      global.sessions.add(session);
      session.on("close", () => {
        global.sessions.delete(session);
      });
      global.sessionCount++;
    });

    let serverPort = await ADB.listenAndForwardPort(global.server, port);
    return serverPort;
  }

  static sessionCount() {
    return global.sessionCount;
  }
}

export class NodeHTTP2Server extends BaseNodeServer {
  _protocol = "https";
  _version = "h2";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    if (!this._skipCert) {
      await BaseNodeServer.installCert("http2-ca.pem");
    }
    this.processId = await NodeServer.fork();

    await this.execute(BaseNodeHTTPServerCode);
    await this.execute(NodeHTTP2ServerCode);
    await this.execute(ADB);
    this._port = await this.execute(`NodeHTTP2ServerCode.startServer(${port})`);
    await this.execute(`global.path_handlers = {};`);
  }

  async sessionCount() {
    let count = this.execute(`NodeHTTP2ServerCode.sessionCount()`);
    return count;
  }
}

// Base HTTP proxy

class BaseProxyCode {
  static proxyHandler(req, res) {
    if (req.url.startsWith("/")) {
      res.writeHead(405);
      res.end();
      return;
    }

    let url = new URL(req.url);
    const http = require("http");
    let preq = http
      .request(
        {
          method: req.method,
          path: url.pathname,
          port: url.port,
          host: url.hostname,
          protocol: url.protocol,
        },
        proxyresp => {
          res.writeHead(
            proxyresp.statusCode,
            proxyresp.statusMessage,
            proxyresp.headers
          );
          proxyresp.on("data", chunk => {
            if (!res.writableEnded) {
              res.write(chunk);
            }
          });
          proxyresp.on("end", () => {
            res.end();
          });
        }
      )
      .on("error", e => {
        console.log(`sock err: ${e}`);
      });
    if (req.method != "POST") {
      preq.end();
    } else {
      req.on("data", chunk => {
        if (!preq.writableEnded) {
          preq.write(chunk);
        }
      });
      req.on("end", () => preq.end());
    }
  }

  static onConnect(req, clientSocket, head) {
    if (global.connect_handler) {
      global.connect_handler(req, clientSocket, head);
      return;
    }
    const net = require("net");
    // Connect to an origin server
    const { port, hostname } = new URL(`https://${req.url}`);
    const serverSocket = net
      .connect(
        {
          port: port || 443,
          host: hostname,
          family: 4, // Specifies to use IPv4
        },
        () => {
          clientSocket.write(
            "HTTP/1.1 200 Connection Established\r\n" +
              "Proxy-agent: Node.js-Proxy\r\n" +
              "\r\n"
          );
          serverSocket.write(head);
          serverSocket.pipe(clientSocket);
          clientSocket.pipe(serverSocket);
        }
      )
      .on("error", e => {
        console.log("error" + e);
        // The socket will error out when we kill the connection
        // just ignore it.
      });

    clientSocket.on("error", e => {
      console.log("client error" + e);
      // Sometimes we got ECONNRESET error on windows platform.
      // Ignore it for now.
    });
  }
}

class BaseHTTPProxy extends BaseNodeServer {
  registerFilter() {
    const pps =
      Cc["@mozilla.org/network/protocol-proxy-service;1"].getService();
    this.filter = new NodeProxyFilter(
      this.protocol(),
      "localhost",
      this.port(),
      0
    );
    pps.registerFilter(this.filter, 10);
  }

  unregisterFilter() {
    const pps =
      Cc["@mozilla.org/network/protocol-proxy-service;1"].getService();
    if (this.filter) {
      pps.unregisterFilter(this.filter);
      this.filter = undefined;
    }
  }

  /// Stops the server
  async stop() {
    this.unregisterFilter();
    await super.stop();
  }

  async registerConnectHandler(handler) {
    return this.execute(`global.connect_handler = ${handler.toString()}`);
  }
}

// HTTP1 Proxy

export class NodeProxyFilter {
  constructor(type, host, port, flags) {
    this._type = type;
    this._host = host;
    this._port = port;
    this._flags = flags;
    this.QueryInterface = ChromeUtils.generateQI(["nsIProtocolProxyFilter"]);
  }
  applyFilter(uri, pi, cb) {
    const pps =
      Cc["@mozilla.org/network/protocol-proxy-service;1"].getService();
    cb.onProxyFilterResult(
      pps.newProxyInfo(
        this._type,
        this._host,
        this._port,
        "",
        "",
        this._flags,
        1000,
        null
      )
    );
  }
}

export class Http3ProxyFilter {
  constructor(host, port, flags, masqueTemplate, auth) {
    this._host = host;
    this._port = port;
    this._flags = flags;
    this._masqueTemplate = masqueTemplate;
    this._auth = auth;
    this.QueryInterface = ChromeUtils.generateQI(["nsIProtocolProxyFilter"]);
  }
  applyFilter(uri, pi, cb) {
    const pps =
      Cc["@mozilla.org/network/protocol-proxy-service;1"].getService();
    cb.onProxyFilterResult(
      pps.newMASQUEProxyInfo(
        this._host,
        this._port,
        this._masqueTemplate,
        this._auth,
        "",
        this._flags,
        1000,
        null
      )
    );
  }
}

class HTTPProxyCode {
  static async startServer(port) {
    const http = require("http");
    global.proxy = http.createServer(BaseProxyCode.proxyHandler);
    global.proxy.on("connect", BaseProxyCode.onConnect);

    let proxyPort = await ADB.listenAndForwardPort(global.proxy, port);
    return proxyPort;
  }
}

export class NodeHTTPProxyServer extends BaseHTTPProxy {
  _protocol = "http";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    this.processId = await NodeServer.fork();

    await this.execute(BaseProxyCode);
    await this.execute(HTTPProxyCode);
    await this.execute(ADB);
    await this.execute(`global.connect_handler = null;`);
    this._port = await this.execute(`HTTPProxyCode.startServer(${port})`);

    this.registerFilter();
  }
}

// HTTPS proxy

class HTTPSProxyCode {
  static async startServer(port) {
    const fs = require("fs");
    const options = {
      key: fs.readFileSync(__dirname + "/proxy-cert.key"),
      cert: fs.readFileSync(__dirname + "/proxy-cert.pem"),
    };
    const https = require("https");
    global.proxy = https.createServer(options, BaseProxyCode.proxyHandler);
    global.proxy.on("connect", BaseProxyCode.onConnect);

    let proxyPort = await ADB.listenAndForwardPort(global.proxy, port);
    return proxyPort;
  }
}

export class NodeHTTPSProxyServer extends BaseHTTPProxy {
  _protocol = "https";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    if (!this._skipCert) {
      await BaseNodeServer.installCert("proxy-ca.pem");
    }
    this.processId = await NodeServer.fork();

    await this.execute(BaseProxyCode);
    await this.execute(HTTPSProxyCode);
    await this.execute(ADB);
    await this.execute(`global.connect_handler = null;`);
    this._port = await this.execute(`HTTPSProxyCode.startServer(${port})`);

    this.registerFilter();
  }
}

// HTTP2 proxy

class HTTP2ProxyCode {
  static async startServer(port, auth, maxConcurrentStreams) {
    const fs = require("fs");
    const options = {
      key: fs.readFileSync(__dirname + "/proxy-cert.key"),
      cert: fs.readFileSync(__dirname + "/proxy-cert.pem"),
      settings: {
        maxConcurrentStreams,
      },
    };
    const http2 = require("http2");
    global.proxy = http2.createSecureServer(options);
    global.socketCounts = {};
    this.setupProxy(auth);

    let proxyPort = await ADB.listenAndForwardPort(global.proxy, port);
    return proxyPort;
  }

  static setupProxy(auth) {
    if (!global.proxy) {
      throw new Error("proxy is null");
    }

    global.proxy.on("stream", (stream, headers) => {
      if (headers[":scheme"] === "http") {
        const http = require("http");
        let url = new URL(
          `${headers[":scheme"]}://${headers[":authority"]}${headers[":path"]}`
        );
        let req = http
          .request(
            {
              method: headers[":method"],
              path: headers[":path"],
              port: url.port,
              host: url.hostname,
              protocol: url.protocol,
            },
            proxyresp => {
              let proxyheaders = Object.assign({}, proxyresp.headers);
              // Filter out some prohibited headers.
              ["connection", "transfer-encoding", "keep-alive"].forEach(
                prop => {
                  delete proxyheaders[prop];
                }
              );
              try {
                stream.respond(
                  Object.assign(
                    { ":status": proxyresp.statusCode },
                    proxyheaders
                  )
                );
              } catch (e) {
                // The channel may have been closed already.
                if (
                  e.code !== "ERR_HTTP2_INVALID_STREAM" &&
                  !e.message.includes("The stream has been destroyed")
                ) {
                  throw e;
                }
              }
              proxyresp.on("data", chunk => {
                if (stream.writable) {
                  stream.write(chunk);
                }
              });
              proxyresp.on("end", () => {
                stream.end();
              });
            }
          )
          .on("error", e => {
            console.log(`sock err: ${e}`);
          });

        if (headers[":method"] != "POST") {
          req.end();
        } else {
          stream.on("data", chunk => {
            if (!req.writableEnded) {
              req.write(chunk);
            }
          });
          stream.on("end", () => req.end());
        }
        return;
      }
      if (headers[":method"] !== "CONNECT") {
        // Only accept CONNECT requests
        try {
          stream.respond({ ":status": 405 });
        } catch (e) {
          if (
            e.code !== "ERR_HTTP2_INVALID_STREAM" &&
            !e.message.includes("The stream has been destroyed")
          ) {
            throw e;
          }
        }
        stream.end();
        return;
      }

      const authorization_token = headers["proxy-authorization"];
      if (auth && !authorization_token) {
        try {
          stream.respond({
            ":status": 407,
            "proxy-authenticate": "Basic realm='foo'",
          });
        } catch (e) {
          if (
            e.code !== "ERR_HTTP2_INVALID_STREAM" &&
            !e.message.includes("The stream has been destroyed")
          ) {
            throw e;
          }
        }
        stream.end();
        return;
      }

      const target = headers[":authority"];
      const { port } = new URL(`https://${target}`);
      const net = require("net");
      const socket = net.connect(port, "127.0.0.1", () => {
        try {
          global.socketCounts[socket.remotePort] =
            (global.socketCounts[socket.remotePort] || 0) + 1;
          try {
            stream.respond({ ":status": 200 });
          } catch (e) {
            if (
              e.code !== "ERR_HTTP2_INVALID_STREAM" &&
              !e.message.includes("The stream has been destroyed")
            ) {
              throw e;
            }
          }
          socket.pipe(stream);
          stream.pipe(socket);
        } catch (exception) {
          console.log(exception);
          stream.close();
        }
      });
      const http2 = require("http2");
      socket.on("error", error => {
        const status = error.errno == "ENOTFOUND" ? 404 : 502;
        try {
          // If we already sent headers when the socket connected
          // then sending the status again would throw.
          if (!stream.sentHeaders) {
            try {
              stream.respond({ ":status": status });
            } catch (e) {
              if (
                e.code !== "ERR_HTTP2_INVALID_STREAM" &&
                !e.message.includes("The stream has been destroyed")
              ) {
                throw e;
              }
            }
          }
          stream.end();
        } catch (exception) {
          stream.close(http2.constants.NGHTTP2_CONNECT_ERROR);
        }
      });
      stream.on("close", () => {
        socket.end();
      });
      socket.on("close", () => {
        stream.close();
      });
      stream.on("end", () => {
        socket.end();
      });
      stream.on("aborted", () => {
        socket.end();
      });
      stream.on("error", error => {
        console.log("RESPONSE STREAM ERROR", error);
      });
    });
  }

  static socketCount(port) {
    return global.socketCounts[port];
  }
}

export class NodeHTTP2ProxyServer extends BaseHTTPProxy {
  _protocol = "https";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0, auth, maxConcurrentStreams = 100) {
    await this.startWithoutProxyFilter(port, auth, maxConcurrentStreams);
    this.registerFilter();
  }

  async startWithoutProxyFilter(port = 0, auth, maxConcurrentStreams = 100) {
    if (!this._skipCert) {
      await BaseNodeServer.installCert("proxy-ca.pem");
    }
    this.processId = await NodeServer.fork();

    await this.execute(BaseProxyCode);
    await this.execute(HTTP2ProxyCode);
    await this.execute(ADB);
    await this.execute(`global.connect_handler = null;`);
    this._port = await this.execute(
      `HTTP2ProxyCode.startServer(${port}, ${auth}, ${maxConcurrentStreams})`
    );
  }

  async socketCount(port) {
    let count = await this.execute(`HTTP2ProxyCode.socketCount(${port})`);
    return count;
  }
}

// websocket server

class NodeWebSocketServerCode extends BaseNodeHTTPServerCode {
  static messageHandler(data, ws) {
    if (global.wsInputHandler) {
      global.wsInputHandler(data, ws);
      return;
    }

    ws.send("test");
  }

  static async startServer(port) {
    const fs = require("fs");
    const options = {
      key: fs.readFileSync(__dirname + "/http2-cert.key"),
      cert: fs.readFileSync(__dirname + "/http2-cert.pem"),
    };
    const https = require("https");
    global.server = https.createServer(
      options,
      BaseNodeHTTPServerCode.globalHandler
    );

    let node_ws_root = `${__dirname}/../node-ws`;
    const WS = require(`${node_ws_root}/lib/websocket`);
    WS.Server = require(`${node_ws_root}/lib/websocket-server`);
    global.webSocketServer = new WS.Server({ server: global.server });
    global.webSocketServer.on("connection", function connection(ws) {
      ws.on("message", data =>
        NodeWebSocketServerCode.messageHandler(data, ws)
      );
    });

    let serverPort = await ADB.listenAndForwardPort(global.server, port);
    return serverPort;
  }
}

export class NodeWebSocketServer extends BaseNodeServer {
  _protocol = "wss";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    if (!this._skipCert) {
      await BaseNodeServer.installCert("http2-ca.pem");
    }
    this.processId = await NodeServer.fork();

    await this.execute(BaseNodeHTTPServerCode);
    await this.execute(NodeWebSocketServerCode);
    await this.execute(ADB);
    this._port = await this.execute(
      `NodeWebSocketServerCode.startServer(${port})`
    );
    await this.execute(`global.path_handlers = {};`);
    await this.execute(`global.wsInputHandler = null;`);
  }

  async registerMessageHandler(handler) {
    return this.execute(`global.wsInputHandler = ${handler.toString()}`);
  }
}

// unencrypted websocket server

class NodeWebSocketPlainServerCode extends BaseNodeHTTPServerCode {
  static async startServer(port) {
    const http = require("http");
    global.server = http.createServer(BaseNodeHTTPServerCode.globalHandler);

    let node_ws_root = `${__dirname}/../node-ws`;
    const WS = require(`${node_ws_root}/lib/websocket`);
    WS.Server = require(`${node_ws_root}/lib/websocket-server`);
    global.webSocketServer = new WS.Server({ server: global.server });
    global.webSocketServer.on("connection", function connection(ws) {
      ws.on("message", data =>
        NodeWebSocketServerCode.messageHandler(data, ws)
      );
    });

    let serverPort = await ADB.listenAndForwardPort(global.server, port);
    return serverPort;
  }
}

export class NodeWebSocketPlainServer extends BaseNodeServer {
  _protocol = "ws";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0) {
    this.processId = await NodeServer.fork();

    await this.execute(BaseNodeHTTPServerCode);
    await this.execute(NodeWebSocketServerCode);
    await this.execute(NodeWebSocketPlainServerCode);
    await this.execute(ADB);
    this._port = await this.execute(
      `NodeWebSocketPlainServerCode.startServer(${port})`
    );
    await this.execute(`global.path_handlers = {};`);
    await this.execute(`global.wsInputHandler = null;`);
  }

  async registerMessageHandler(handler) {
    return this.execute(`global.wsInputHandler = ${handler.toString()}`);
  }
}

// websocket http2 server
// This code is inspired by
// https://github.com/szmarczak/http2-wrapper/blob/master/examples/ws/server.js
class NodeWebSocketHttp2ServerCode extends BaseNodeHTTPServerCode {
  static async startServer(port, fallbackToH1) {
    const fs = require("fs");
    const options = {
      key: fs.readFileSync(__dirname + "/http2-cert.key"),
      cert: fs.readFileSync(__dirname + "/http2-cert.pem"),
      settings: {
        enableConnectProtocol: !fallbackToH1,
        allowHTTP1: fallbackToH1,
      },
    };
    const http2 = require("http2");
    global.h2Server = http2.createSecureServer(options);

    let node_ws_root = `${__dirname}/../node-ws`;
    const WS = require(`${node_ws_root}/lib/websocket`);

    global.h2Server.on("stream", (stream, headers) => {
      if (headers[":method"] === "CONNECT") {
        try {
          stream.respond();
        } catch (e) {
          if (
            e.code !== "ERR_HTTP2_INVALID_STREAM" &&
            !e.message.includes("The stream has been destroyed")
          ) {
            throw e;
          }
        }

        const ws = new WS(null);
        stream.setNoDelay = () => {};
        ws.setSocket(stream, Buffer.from(""), 100 * 1024 * 1024);

        ws.on("message", data => {
          if (global.wsInputHandler) {
            global.wsInputHandler(data, ws);
            return;
          }

          ws.send("test");
        });
      } else {
        try {
          stream.respond();
        } catch (e) {
          if (
            e.code !== "ERR_HTTP2_INVALID_STREAM" &&
            !e.message.includes("The stream has been destroyed")
          ) {
            throw e;
          }
        }
        stream.end("ok");
      }
    });

    let serverPort = await ADB.listenAndForwardPort(global.h2Server, port);
    return serverPort;
  }
}

export class NodeWebSocketHttp2Server extends BaseNodeServer {
  _protocol = "wss";
  /// Starts the server
  /// @port - default 0
  ///    when provided, will attempt to listen on that port.
  async start(port = 0, fallbackToH1 = false) {
    if (!this._skipCert) {
      await BaseNodeServer.installCert("http2-ca.pem");
    }
    this.processId = await NodeServer.fork();

    await this.execute(BaseNodeHTTPServerCode);
    await this.execute(NodeWebSocketHttp2ServerCode);
    await this.execute(ADB);
    this._port = await this.execute(
      `NodeWebSocketHttp2ServerCode.startServer(${port}, ${fallbackToH1})`
    );
    await this.execute(`global.path_handlers = {};`);
    await this.execute(`global.wsInputHandler = null;`);
  }

  async registerMessageHandler(handler) {
    return this.execute(`global.wsInputHandler = ${handler.toString()}`);
  }
}

// Helper functions

export async function with_node_servers(arrayOfClasses, asyncClosure) {
  for (let s of arrayOfClasses) {
    let server = new s();
    await server.start();
    await asyncClosure(server);
    await server.stop();
  }
}

export class WebSocketConnection {
  constructor() {
    this._openPromise = new Promise(resolve => {
      this._openCallback = resolve;
    });

    this._stopPromise = new Promise(resolve => {
      this._stopCallback = resolve;
    });

    this._msgPromise = new Promise(resolve => {
      this._msgCallback = resolve;
    });

    this._proxyAvailablePromise = new Promise(resolve => {
      this._proxyAvailCallback = resolve;
    });

    this._messages = [];
    this._ws = null;
  }

  get QueryInterface() {
    return ChromeUtils.generateQI([
      "nsIWebSocketListener",
      "nsIProtocolProxyCallback",
    ]);
  }

  onAcknowledge() {}
  onBinaryMessageAvailable(aContext, aMsg) {
    this._messages.push(aMsg);
    this._msgCallback();
  }
  onMessageAvailable() {}
  onServerClose() {}
  onWebSocketListenerStart() {}
  onStart() {
    this._openCallback();
  }
  onStop(aContext, aStatusCode) {
    this._stopCallback({ status: aStatusCode });
    this._ws = null;
  }
  onProxyAvailable(req, chan, proxyInfo) {
    if (proxyInfo) {
      this._proxyAvailCallback({ type: proxyInfo.type });
    } else {
      this._proxyAvailCallback({});
    }
  }

  static makeWebSocketChan(url) {
    let protocol = url.startsWith("wss:") ? "wss" : "ws";
    let chan = Cc[
      `@mozilla.org/network/protocol;1?name=${protocol}`
    ].createInstance(Ci.nsIWebSocketChannel);
    chan.initLoadInfo(
      null, // aLoadingNode
      Services.scriptSecurityManager.getSystemPrincipal(),
      null, // aTriggeringPrincipal
      Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
      Ci.nsIContentPolicy.TYPE_WEBSOCKET
    );
    return chan;
  }
  // Returns a promise that resolves when the websocket channel is opened.
  open(url) {
    this._ws = WebSocketConnection.makeWebSocketChan(url);
    let uri = Services.io.newURI(url);
    this._ws.asyncOpen(uri, url, {}, 0, this, null);
    return this._openPromise;
  }
  // Closes the inner websocket. code and reason arguments are optional.
  close(code, reason) {
    this._ws.close(code || Ci.nsIWebSocketChannel.CLOSE_NORMAL, reason || "");
  }
  // Sends a message to the server.
  send(msg) {
    this._ws.sendMsg(msg);
  }
  // Returns a promise that resolves when the channel's onStop is called.
  // Promise resolves with an `{status}` object, where status is the
  // result passed to onStop.
  finished() {
    return this._stopPromise;
  }
  getProxyInfo() {
    return this._proxyAvailablePromise;
  }

  // Returned promise resolves with an array of received messages
  // If messages have been received in the the past before calling
  // receiveMessages, the promise will immediately resolve. Otherwise
  // it will resolve when the first message is received.
  async receiveMessages() {
    await this._msgPromise;
    this._msgPromise = new Promise(resolve => {
      this._msgCallback = resolve;
    });
    let messages = this._messages;
    this._messages = [];
    return messages;
  }
}

export class HTTP3Server {
  protocol() {
    return "https";
  }
  version() {
    return "h3";
  }
  origin() {
    return `${this.protocol()}://localhost:${this.port()}`;
  }
  port() {
    return this._port;
  }
  masque_proxy_port() {
    return this._masque_proxy_port;
  }
  no_response_port() {
    return this._no_response_port;
  }
  reverse_proxy_port() {
    return this._reverse_proxy_port;
  }
  domain() {
    return `localhost`;
  }

  /// Stops the server
  async stop() {
    if (this.processId) {
      await NodeServer.kill(this.processId);
      this.processId = undefined;
    }
  }

  async start(path, dbPath) {
    let result = await NodeServer.sendCommand(
      "",
      `/forkH3Server?path=${path}&dbPath=${dbPath}`
    );
    this.processId = result.id;

    /* eslint-disable no-control-regex */
    const regex =
      /HTTP3 server listening on ports (\d+), (\d+), (\d+), (\d+), (\d+) and (\d+). EchConfig is @([\x00-\x7F]+)@/;

    // Execute the regex on the input string
    let match = regex.exec(result.output);

    if (match) {
      // Extract the ports as an array of numbers
      let ports = match.slice(1, 7).map(Number);
      this._port = ports[0];
      this._reverse_proxy_port = ports[3];
      this._no_response_port = ports[4];
      this._masque_proxy_port = ports[5];
      return ports[0];
    }

    return undefined;
  }
}

export class NodeServer {
  // Executes command in the context of a node server.
  // See handler in moz-http2.js
  //
  // Example use:
  // let id = NodeServer.fork(); // id is a random string
  // await NodeServer.execute(id, `"hello"`)
  // > "hello"
  // await NodeServer.execute(id, `(() => "hello")()`)
  // > "hello"
  // await NodeServer.execute(id, `(() => var_defined_on_server)()`)
  // > "0"
  // await NodeServer.execute(id, `var_defined_on_server`)
  // > "0"
  // function f(param) { if (param) return param; return "bla"; }
  // await NodeServer.execute(id, f); // Defines the function on the server
  // await NodeServer.execute(id, `f()`) // executes defined function
  // > "bla"
  // let result = await NodeServer.execute(id, `f("test")`);
  // > "test"
  // await NodeServer.kill(id); // shuts down the server

  // Forks a new node server using moz-http2-child.js as a starting point
  static fork() {
    return this.sendCommand("", "/fork");
  }
  // Executes command in the context of the node server indicated by `id`
  static execute(id, command) {
    return this.sendCommand(command, `/execute/${id}`);
  }
  // Shuts down the server
  static kill(id) {
    return this.sendCommand("", `/kill/${id}`);
  }

  // Issues a request to the node server (handler defined in moz-http2.js)
  // This method should not be called directly.
  static sendCommand(command, path) {
    let h2Port = Services.env.get("MOZNODE_EXEC_PORT");
    if (!h2Port) {
      throw new Error("Could not find MOZNODE_EXEC_PORT");
    }

    let req = new XMLHttpRequest({ mozAnon: true, mozSystem: true });
    const serverIP =
      AppConstants.platform == "android" ? "10.0.2.2" : "127.0.0.1";
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    req.open("POST", `http://${serverIP}:${h2Port}${path}`);
    req.channel.QueryInterface(Ci.nsIHttpChannelInternal).bypassProxy = true;
    req.channel.loadFlags |= Ci.nsIChannel.LOAD_BYPASS_URL_CLASSIFIER;
    // Prevent HTTPS-Only Mode from upgrading the request.
    req.channel.loadInfo.httpsOnlyStatus |= Ci.nsILoadInfo.HTTPS_ONLY_EXEMPT;
    // Allow deprecated HTTP request from SystemPrincipal
    req.channel.loadInfo.allowDeprecatedSystemRequests = true;

    // Passing a function to NodeServer.execute will define that function
    // in node. It can be called in a later execute command.
    let isFunction = function (obj) {
      return !!(obj && obj.constructor && obj.call && obj.apply);
    };
    let payload = command;
    if (isFunction(command)) {
      payload = `${command.name} = ${command.toString()};`;
    }

    return new Promise((resolve, reject) => {
      req.onload = () => {
        let x = null;

        if (req.statusText != "OK") {
          reject(`XHR request failed: ${req.statusText}`);
          return;
        }

        try {
          x = JSON.parse(req.responseText);
        } catch (e) {
          reject(`Failed to parse ${req.responseText} - ${e}`);
          return;
        }

        if (x.error) {
          let e = new Error(x.error, "", 0);
          e.stack = x.errorStack;
          reject(e);
          return;
        }
        resolve(x.result);
      };
      req.onerror = e => {
        reject(e);
      };

      req.send(payload.toString());
    });
  }
}
