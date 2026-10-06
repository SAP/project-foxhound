"use strict";

function make_channel(url) {
  return NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
}

async function get_response(channel, flags = 0) {
  return new Promise(resolve => {
    channel.asyncOpen(
      new ChannelListener(
        (request, buffer) => {
          request.QueryInterface(Ci.nsIHttpChannel);
          resolve({ status: request.responseStatus, data: buffer });
        },
        null,
        flags
      )
    );
  });
}

// Hit /exception-test which intentionally throws inside handleRequestImpl.
// The try/catch wrapper in handleRequest should catch it and return 500.
// Then hit another endpoint to verify the server is still alive.
add_task(async function test_exception_does_not_kill_server() {
  do_get_profile();
  const port = Services.env.get("MOZHTTP2_PORT");

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  const origin = `https://localhost:${port}`;

  let resp = await get_response(
    make_channel(`${origin}/exception-test`),
    CL_ALLOW_UNKNOWN_CL
  );
  Assert.equal(resp.status, 500, "exception-test should return 500");

  resp = await get_response(
    make_channel(`${origin}/header`),
    CL_ALLOW_UNKNOWN_CL
  );
  Assert.equal(
    resp.status,
    200,
    "server should still be alive after exception"
  );
});
