/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["allowNullOrigin", "WebSocketHandshake"];

// This file is an XPCOM service-ified copy of ../devtools/server/socket/websocket-server.js.

const CC = Components.Constructor;

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  Services: "resource://gre/modules/Services.jsm",

  executeSoon: "chrome://remote/content/shared/Sync.jsm",
  RemoteAgent: "chrome://remote/content/components/RemoteAgent.jsm",
});

XPCOMUtils.defineLazyGetter(this, "CryptoHash", () => {
  return CC("@mozilla.org/security/hash;1", "nsICryptoHash", "initWithString");
});

XPCOMUtils.defineLazyGetter(this, "threadManager", () => {
  return Cc["@mozilla.org/thread-manager;1"].getService();
});

// TODO(ato): Merge this with httpd.js so that we can respond to both HTTP/1.1
// as well as WebSocket requests on the same server.

// Well-known localhost loopback addresses.
const LOOPBACKS = ["localhost", "127.0.0.1", "[::1]"];

// This should only be used by the CDP browser mochitests which create a
// websocket handshake with a non-null origin.
let nullOriginAllowed = false;
function allowNullOrigin(allowed) {
  nullOriginAllowed = allowed;
}

/**
 * Write a string of bytes to async output stream
 * and return promise that resolves once all data has been written.
 * Doesn't do any UTF-16/UTF-8 conversion.
 * The string is treated as an array of bytes.
 */
function writeString(output, data) {
  return new Promise((resolve, reject) => {
    const wait = () => {
      if (data.length === 0) {
        resolve();
        return;
      }

      output.asyncWait(
        stream => {
          try {
            const written = output.write(data, data.length);
            data = data.slice(written);
            wait();
          } catch (ex) {
            reject(ex);
          }
        },
        0,
        0,
        threadManager.currentThread
      );
    };

    wait();
  });
}

/**
 * Write HTTP response with headers (array of strings) and body
 * to async output stream.
 */
function writeHttpResponse(output, headers, body = "") {
  headers.push(`Content-Length: ${body.length}`);

  const s = headers.join("\r\n") + `\r\n\r\n${body}`;
  return writeString(output, s);
}

/**
 * Check if the provided URI's host is an IP address.
 *
 * @param {nsIURI} uri
 *     The URI to check.
 * @return {boolean}
 */
function isIPAddress(uri) {
  try {
    // getBaseDomain throws an explicit error if the uri host is an IP address.
    Services.eTLD.getBaseDomain(uri);
  } catch (e) {
    return e.result == Cr.NS_ERROR_HOST_IS_IP_ADDRESS;
  }
  return false;
}

/**
 * Process the WebSocket handshake headers and return the key to be sent in
 * Sec-WebSocket-Accept response header.
 */
function processRequest({ requestLine, headers }) {
  // Enable origin header checks only if BiDi is enabled to avoid regressions
  // for existing CDP consumers.
  // TODO: Remove after Bug 1750689 until we can specify custom hosts & origins.
  if (RemoteAgent.webDriverBiDi) {
    const origin = headers.get("origin");

    // A "null" origin is exceptionally allowed in browser mochitests.
    const isTestOrigin = origin === "null" && nullOriginAllowed;
    if (headers.has("origin") && !isTestOrigin) {
      throw new Error(
        `The handshake request has incorrect Origin header ${origin}`
      );
    }
  }

  const hostHeader = headers.get("host");

  let hostUri, host, port;
  try {
    // Might throw both when calling newURI or when accessing the host/port.
    hostUri = Services.io.newURI(`https://${hostHeader}`);
    ({ host, port } = hostUri);
  } catch (e) {
    throw new Error(
      `The handshake request Host header must be a well-formed host: ${hostHeader}`
    );
  }

  const isHostnameValid = LOOPBACKS.includes(host) || isIPAddress(hostUri);
  // For nsIURI a port value of -1 corresponds to the protocol's default port.
  const isPortValid = port === -1 || port == RemoteAgent.port;
  if (!isHostnameValid || !isPortValid) {
    throw new Error(
      `The handshake request has incorrect Host header ${hostHeader}`
    );
  }

  const method = requestLine.split(" ")[0];
  if (method !== "GET") {
    throw new Error("The handshake request must use GET method");
  }

  const upgrade = headers.get("upgrade");
  if (!upgrade || upgrade.toLowerCase() !== "websocket") {
    throw new Error(
      `The handshake request has incorrect Upgrade header: ${upgrade}`
    );
  }

  const connection = headers.get("connection");
  if (
    !connection ||
    !connection
      .split(",")
      .map(t => t.trim().toLowerCase())
      .includes("upgrade")
  ) {
    throw new Error("The handshake request has incorrect Connection header");
  }

  const version = headers.get("sec-websocket-version");
  if (!version || version !== "13") {
    throw new Error(
      "The handshake request must have Sec-WebSocket-Version: 13"
    );
  }

  // Compute the accept key
  const key = headers.get("sec-websocket-key");
  if (!key) {
    throw new Error(
      "The handshake request must have a Sec-WebSocket-Key header"
    );
  }

  return { acceptKey: computeKey(key) };
}

function computeKey(key) {
  const str = `${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`;
  const data = Array.from(str, ch => ch.charCodeAt(0));
  const hash = new CryptoHash("sha1");
  hash.update(data, data.length);
  return hash.finish(true);
}

/**
 * Perform the server part of a WebSocket opening handshake
 * on an incoming connection.
 */
async function serverHandshake(request, output) {
  try {
    // Check and extract info from the request
    const { acceptKey } = processRequest(request);

    // Send response headers
    await writeHttpResponse(output, [
      "HTTP/1.1 101 Switching Protocols",
      "Server: httpd.js",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
    ]);
  } catch (error) {
    // Send error response in case of error
    await writeHttpResponse(
      output,
      [
        "HTTP/1.1 400 Bad Request",
        "Server: httpd.js",
        "Content-Type: text/plain",
      ],
      error.message
    );

    throw error;
  }
}

async function createWebSocket(transport, input, output) {
  const transportProvider = {
    setListener(upgradeListener) {
      // onTransportAvailable callback shouldn't be called synchronously
      executeSoon(() => {
        upgradeListener.onTransportAvailable(transport, input, output);
      });
    },
  };

  return new Promise((resolve, reject) => {
    const socket = WebSocket.createServerWebSocket(
      null,
      [],
      transportProvider,
      ""
    );
    socket.addEventListener("close", () => {
      input.close();
      output.close();
    });

    socket.onopen = () => resolve(socket);
    socket.onerror = err => reject(err);
  });
}

/** Upgrade an existing HTTP request from httpd.js to WebSocket. */
async function upgrade(request, response) {
  // handle response manually, allowing us to send arbitrary data
  response._powerSeized = true;

  const { transport, input, output } = response._connection;

  const headers = new Map();
  for (let [key, values] of Object.entries(request._headers._headers)) {
    headers.set(key, values.join("\n"));
  }
  const convertedRequest = {
    requestLine: `${request.method} ${request.path}`,
    headers,
  };
  await serverHandshake(convertedRequest, output);

  return createWebSocket(transport, input, output);
}

const WebSocketHandshake = { upgrade };
