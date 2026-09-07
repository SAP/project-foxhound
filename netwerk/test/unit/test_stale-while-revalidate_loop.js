/*

Tests the Cache-control: stale-while-revalidate response directive.

Loads a HTTPS resource with the stale-while-revalidate and tries to load it
twice.

*/

"use strict";

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

function make_channel(url) {
  return NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
}

async function get_response(channel) {
  return new Promise(resolve => {
    channel.asyncOpen(
      new ChannelListener((request, buffer) => {
        resolve(buffer);
      })
    );
  });
}

add_task(async function () {
  do_get_profile();

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  let server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.registerPathHandler(
    "/stale-while-revalidate-loop-test",
    (req, res) => {
      res.writeHead(200, "OK", {
        "Cache-Control":
          "s-maxage=86400, stale-while-revalidate=86400, immutable",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": "1",
      });
      res.end("1");
    }
  );

  const URI = `https://localhost:${server.port()}/stale-while-revalidate-loop-test`;

  let response = await get_response(make_channel(URI), false);
  Assert.equal(response, "1", "got response ver 1");
  response = await get_response(make_channel(URI), false);
  Assert.equal(response, "1", "got response ver 1");
});
