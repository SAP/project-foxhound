const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

async function getCurrentMetrics() {
  // We set geo.provider.network.scan to false, so we know to expect ip-based
  // location, not wifi-environment-based.
  return {
    ipCount:
      await Glean.geolocation.geolocationService.network_ip.testGetValue(),
  };
}

var httpserver = null;
var geolocation = null;

function geoHandler(metadata, response) {
  response.processAsync();
}

function successCallback() {
  // The call shouldn't be sucessful.
  Assert.ok(false);
  do_test_finished();
}

async function errorCallback() {
  Assert.ok(true);
  // Even though we timed out, we should have recorded the attempt.
  let metrics = await getCurrentMetrics();
  Assert.equal(metrics.ipCount, 1);
  do_test_finished();
}

async function run_test() {
  do_test_pending();

  // Initialize Glean and get current state.
  do_get_profile();
  Services.fog.initializeFOG();

  httpserver = new HttpServer();
  httpserver.registerPathHandler("/geo", geoHandler);
  httpserver.start(-1);
  Services.prefs.setCharPref(
    "geo.provider.network.url",
    "http://localhost:" + httpserver.identity.primaryPort + "/geo"
  );
  Services.prefs.setBoolPref("geo.provider.network.scan", false);

  // Setting timeout to a very low value to ensure time out will happen.
  Services.prefs.setIntPref("geo.provider.network.timeout", 5);

  geolocation = Cc["@mozilla.org/geolocation;1"].getService(Ci.nsISupports);
  geolocation.getCurrentPosition(successCallback, errorCallback);
}
