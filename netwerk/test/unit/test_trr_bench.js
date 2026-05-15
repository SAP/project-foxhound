const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

trr_test_setup();
registerCleanupFunction(async () => {
  trr_clear_prefs();
});

let trrServer = null;
let http2Server = null;
add_setup(async function setup() {
  trrServer = new TRRServer();
  registerCleanupFunction(async () => {
    await trrServer.stop();
  });
  await trrServer.start();
  dump(`port = ${trrServer.port()}\n`);

  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/doh?responseIP=127.0.0.1`
  );

  http2Server = new NodeHTTP2Server();
  await http2Server.start();
  registerCleanupFunction(async () => {
    await http2Server.stop();
  });
  await http2Server.registerPathHandler("/", (req, resp) => {
    resp.writeHead(200);
    resp.end("done");
  });

  // Disable cert checking since the server cert only supports a handful of domains.
  const certOverrideService = Cc[
    "@mozilla.org/security/certoverride;1"
  ].getService(Ci.nsICertOverrideService);
  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  // To avoid the coalescing of H2 connections, otherwise subsequent runs
  // might report null DNS timings for the benchmaked connection
  Services.prefs.setBoolPref("network.http.http2.coalesce-hostnames", false);
});

function makeChan(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
  return chan;
}

async function bench(extraRequestCount, iterGen) {
  Services.dns.clearCache(true);
  let N = extraRequestCount;
  let requests = [];
  for (let i = 0; i < N; i++) {
    requests.push(
      makeChan(
        `https://req${i}-1.example${iterGen}.com:${http2Server.port()}/?req${i}`
      )
    );
  }
  let benchReq = makeChan(
    `https://bench.example${iterGen}.com:${http2Server.port()}/?bench`
  );
  requests.push(benchReq);
  for (let i = 0; i < N; i++) {
    requests.push(
      makeChan(
        `https://req${i}-2.example${iterGen}.com:${http2Server.port()}/?req${i}`
      )
    );
  }

  let promises = [];
  for (let req of requests) {
    promises.push(
      new Promise(resolve => {
        function finish(req, buffer) {
          resolve([req, buffer]);
        }
        req.asyncOpen(new ChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL));
      })
    );
  }

  await Promise.all(promises);

  equal(benchReq.responseStatus, 200, "expecting bench request to be OK 200");
  benchReq.QueryInterface(Ci.nsITimedChannel);
  let lookupTime =
    benchReq.domainLookupEndTime - benchReq.domainLookupStartTime;
  ok(lookupTime, `time for URL ${benchReq.URI.spec}`);

  return lookupTime;
}

function averageTimes(timesArray) {
  if (!timesArray.length) {
    return 0;
  }
  let average = timesArray.reduce((sum, v) => sum + v, 0) / timesArray.length;
  return average;
}

add_task(async function checkSeveral() {
  Services.prefs.setIntPref("network.trr.mode", Ci.nsIDNSService.MODE_TRRONLY);
  const NUM_OF_RUNS = 9;
  const LOW_CONTENTION_EXTRA_REQUESTS = 5; // times two. This simmulates a not very busy load.
  const NUM_OF_EXTRA_REQ = 50; // times two.

  // This factor indicates the expected factor for the DNS timing increase
  // Ideally it would be close to 1 but more realistically it's going to be
  // 2-3.
  // If it nears NUM_OF_EXTRA_REQ/LOW_CONTENTION_EXTRA_REQUESTS that means
  // TRR requests are not at all prioritized compared to regular network requests
  const CONTENTION_FACTOR = 6;

  let results = [];
  for (let i = 0; i < NUM_OF_RUNS; i++) {
    results.push(await bench(LOW_CONTENTION_EXTRA_REQUESTS, "a" + i));
  }

  let baseline = averageTimes(results);

  results = [];
  for (let i = 0; i < NUM_OF_RUNS; i++) {
    results.push(await bench(NUM_OF_EXTRA_REQ, "b" + i));
  }

  let average = averageTimes(results);
  info(results);

  info("perfMetrics", { average });

  // TODO(valentin): turn this into a proper lessThan check.
  info(
    `Average should not spike because of extra requests works:${
      average < baseline * CONTENTION_FACTOR
    }, average:${average} limit:${baseline * CONTENTION_FACTOR}`
  );
  info(`Baseline time: ${baseline}`);
});

/* exported perfMetadata */
var perfMetadata = {
  owner: "Network Team",
  name: "TRR Benchmark",
  description:
    "Benchmark for TRR (Trusted Recursive Resolver) DNS lookup performance under various load conditions.",
  longDescription: `
  This test measures TRR DNS lookup performance by comparing baseline DNS resolution
  times with low contention against performance under high contention with many
  concurrent requests. It validates that TRR requests maintain acceptable performance
  even when the network is busy with other requests.
  `,
  supportedBrowsers: ["Firefox"],
  supportedPlatforms: ["Desktop"],
  options: {
    default: { perfherder: true },
  },
};
