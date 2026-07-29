#!/usr/bin/env node

const http2 = require("http2");
const fs = require("fs");
const path = require("path");

const [directory = ".", certFile, keyFile] = process.argv.slice(2);
const opts = certFile
  ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
  : {};
const server = certFile ? http2.createSecureServer(opts) : http2.createServer();

server.on("stream", (stream, headers) => {
  const reqPath = headers[":path"];
  let filePath = path.join(directory, reqPath);
  if (
    !path.resolve(filePath).startsWith(path.resolve(directory) + path.sep) &&
    path.resolve(filePath) !== path.resolve(directory)
  ) {
    stream.respond({ ":status": 403 });
    stream.end();
    return;
  }
  if (filePath.endsWith("/")) {
    filePath += "index.html";
  }

  console.log(`${headers[":method"]} ${reqPath}`);

  const ext = path.extname(filePath);
  const contentType =
    {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    }[ext] || "application/octet-stream";

  fs.createReadStream(filePath)
    .on("error", () => {
      stream.respond({ ":status": 404 });
      stream.end();
    })
    .on("open", () => {
      stream.respond({ ":status": 200, "content-type": contentType });
    })
    .pipe(stream);
});

const protocol = certFile ? "https" : "http";
server.listen(8000, () => {
  console.log(`HTTP/2 server (${protocol}) listening on port 8000`);
  console.log(`Serving files from: ${path.resolve(directory)}`);
});

server.on("error", err => {
  console.error("Server error:", err);
});
