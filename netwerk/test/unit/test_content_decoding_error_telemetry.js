"use strict";

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let httpServer;
let dictUrl;

function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  return chan;
}

function channelOpenPromise(chan) {
  return new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(
        (req, buffer) => resolve([req, buffer]),
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });
}

function channelOpenPromiseExpectError(chan) {
  return new Promise(resolve => {
    chan.asyncOpen(
      new SimpleChannelListener(
        (req, buffer) => resolve([req, buffer]),
        null,
        CL_ALLOW_UNKNOWN_CL | CL_EXPECT_FAILURE
      )
    );
  });
}

add_setup(async function setup() {
  do_get_profile();
  Services.fog.initializeFOG();

  Services.prefs.setBoolPref("network.http.dictionaries.enable", true);
  Services.prefs.setBoolPref("network.http.encoding.zstd", true);

  httpServer = new NodeHTTPSServer();
  await httpServer.start();
  registerCleanupFunction(async () => {
    await httpServer.stop();
  });

  dictUrl = `https://localhost:${httpServer.port()}/dict`;

  await httpServer.registerPathHandler("/dict", function (req, res) {
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Use-As-Dictionary": `match="/content*", id="test-dict", type=raw`,
      "Cache-Control": "max-age=3600",
    });
    res.end("DICTIONARY_DATA_FOR_TESTING_PURPOSES", "binary");
  });

  let chan = makeChan(dictUrl);
  await channelOpenPromise(chan);
});

async function registerBadDCBEndpoint(httpServer, path, badPayload) {
  let escapedPayload = badPayload
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");

  let func = `
    let badPayload = Buffer.from('${escapedPayload}', 'binary');
    if (request.headers && request.headers['available-dictionary']) {
      response.writeHead(200, {
        "Content-Encoding": "dcb",
        "Content-Type": "text/plain",
      });
      response.end(badPayload);
    } else {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("UNCOMPRESSED_CONTENT");
    }
  `;
  return httpServer.registerPathHandler(
    path,
    new Function("request", "response", func)
  );
}

async function registerBadDCZEndpoint(httpServer, path, badPayload) {
  let escapedPayload = badPayload
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");

  let func = `
    let badPayload = Buffer.from('${escapedPayload}', 'binary');
    if (request.headers && request.headers['available-dictionary']) {
      response.writeHead(200, {
        "Content-Encoding": "dcz",
        "Content-Type": "text/plain",
      });
      response.end(badPayload);
    } else {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("UNCOMPRESSED_CONTENT");
    }
  `;
  return httpServer.registerPathHandler(
    path,
    new Function("request", "response", func)
  );
}

add_task(async function test_dcb_bad_magic_header_telemetry() {
  Services.fog.testResetFOG();

  let eventRecorded = false;
  GleanPings.contentDecodingError.testBeforeNextSubmit(() => {
    eventRecorded = true;
    let events = Glean.network.contentDecodingErrorReport.testGetValue();
    Assert.ok(events, "Event should be recorded");
    Assert.equal(events.length, 1, "Should have one event");
    Assert.equal(events[0].extra.error_type, "dcb", "Error type should be dcb");
    Assert.ok(events[0].extra.top_level_site, "Top level site should be set");
  });

  let badMagicPayload =
    "\xDE\xAD\xBE\xEF12345678901234567890123456789012GARBAGE_DATA_HERE";
  await registerBadDCBEndpoint(
    httpServer,
    "/content-bad-magic",
    badMagicPayload
  );

  let chan = makeChan(
    `https://localhost:${httpServer.port()}/content-bad-magic`
  );
  await channelOpenPromiseExpectError(chan);

  Services.obs.notifyObservers(null, "idle-daily");

  Assert.ok(
    eventRecorded,
    "Event should have been recorded and ping submitted"
  );
});

add_task(async function test_dcb_brotli_decode_error_telemetry() {
  Services.fog.testResetFOG();

  let eventRecorded = false;
  GleanPings.contentDecodingError.testBeforeNextSubmit(() => {
    eventRecorded = true;
    let events = Glean.network.contentDecodingErrorReport.testGetValue();
    Assert.ok(events, "Event should be recorded");
    Assert.equal(events.length, 1, "Should have one event");
    Assert.equal(events[0].extra.error_type, "dcb", "Error type should be dcb");
  });

  let badBrotliPayload =
    "\xff\x44\x43\x4212345678901234567890123456789012NOT_VALID_BROTLI_DATA_XXXXX";
  await registerBadDCBEndpoint(
    httpServer,
    "/content-bad-brotli",
    badBrotliPayload
  );

  let chan = makeChan(
    `https://localhost:${httpServer.port()}/content-bad-brotli`
  );
  await channelOpenPromiseExpectError(chan);

  Services.obs.notifyObservers(null, "idle-daily");

  Assert.ok(
    eventRecorded,
    "Event should have been recorded and ping submitted"
  );
});

add_task(async function test_dcz_decode_error_telemetry() {
  Services.fog.testResetFOG();

  let eventRecorded = false;
  GleanPings.contentDecodingError.testBeforeNextSubmit(() => {
    eventRecorded = true;
    let events = Glean.network.contentDecodingErrorReport.testGetValue();
    Assert.ok(events, "Event should be recorded");
    Assert.equal(events.length, 1, "Should have one event");
    Assert.equal(events[0].extra.error_type, "dcz", "Error type should be dcz");
  });

  let badZstdPayload = "NOT_VALID_ZSTD_COMPRESSED_DATA_XXXXXXXXXXXXXXXXXXXXX";
  await registerBadDCZEndpoint(httpServer, "/content-bad-zstd", badZstdPayload);

  let chan = makeChan(
    `https://localhost:${httpServer.port()}/content-bad-zstd`
  );
  await channelOpenPromiseExpectError(chan);

  Services.obs.notifyObservers(null, "idle-daily");

  Assert.ok(
    eventRecorded,
    "Event should have been recorded and ping submitted"
  );
});

add_task(async function test_dict_hash_mismatch_telemetry() {
  Services.fog.testResetFOG();

  let cacheTesting = Services.cache2.QueryInterface(Ci.nsICacheTesting);
  cacheTesting.corruptDictionaryHash(dictUrl);

  Services.obs.notifyObservers(null, "clear-dictionary-data", dictUrl);

  await httpServer.registerPathHandler("/content-plain", function (req, res) {
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
    });
    res.end("PLAIN_CONTENT_RESPONSE");
  });

  let chan = makeChan(`https://localhost:${httpServer.port()}/content-plain`);
  await channelOpenPromise(chan);

  let events = Glean.network.contentDecodingErrorReport.testGetValue();
  Assert.ok(events, "Event should be recorded before idle-daily");
  Assert.equal(events.length, 1, "Should have one event");
  Assert.equal(
    events[0].extra.error_type,
    "dict_hash_mismatch",
    "Error type should be dict_hash_mismatch"
  );
  Assert.ok(events[0].extra.top_level_site, "Top level site should be set");
});
