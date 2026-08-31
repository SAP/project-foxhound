const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

var httpserver = null;
var geolocation = null;
var success = false;
var watchID = -1;

async function getCurrentMetrics() {
  // We set geo.provider.network.scan to false, so we know to expect ip-based
  // location, not wifi-environment-based.
  return {
    ipCount:
      await Glean.geolocation.geolocationService.network_ip.testGetValue(),
  };
}

async function checkMetrics() {
  let metrics = await getCurrentMetrics();
  Assert.equal(metrics.ipCount, 1);
}

function terminate(succ) {
  success = succ;
  geolocation.clearWatch(watchID);
}

async function successCallback() {
  await checkMetrics();
  terminate(true);
}
function errorCallback() {
  terminate(false);
}

var observer = {
  QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),

  observe(subject, topic, data) {
    if (data == "shutdown") {
      Assert.ok(1);
      this._numProviders--;
      if (!this._numProviders) {
        httpserver.stop(function () {
          Assert.ok(success);
          do_test_finished();
        });
      }
    } else if (data == "starting") {
      Assert.ok(1);
      this._numProviders++;
    }
  },

  _numProviders: 0,
};

function geoHandler(metadata, response) {
  var georesponse = {
    status: "OK",
    location: {
      lat: 42,
      lng: 42,
    },
    accuracy: 42,
  };
  var position = JSON.stringify(georesponse);
  response.setStatusLine("1.0", 200, "OK");
  response.setHeader("Cache-Control", "no-cache", false);
  response.setHeader("Content-Type", "aplication/x-javascript", false);
  response.write(position);
}

async function run_test() {
  // only kill this test when shutdown is called on the provider.
  do_test_pending();

  // Initialize Glean and get current state.
  do_get_profile();
  Services.fog.initializeFOG();

  // Disable the NetworkGeolocationProvider cache so we can test for the
  // correct telemetry values.
  Services.prefs.setBoolPref(
    "geo.provider.network.debug.requestCache.enabled",
    false
  );

  httpserver = new HttpServer();
  httpserver.registerPathHandler("/geo", geoHandler);
  httpserver.start(-1);

  Services.prefs.setCharPref(
    "geo.provider.network.url",
    "http://localhost:" + httpserver.identity.primaryPort + "/geo"
  );
  Services.prefs.setBoolPref("geo.provider.network.scan", false);

  var obs = Cc["@mozilla.org/observer-service;1"].getService();
  obs = obs.QueryInterface(Ci.nsIObserverService);
  obs.addObserver(observer, "geolocation-device-events");

  geolocation = Cc["@mozilla.org/geolocation;1"].getService(Ci.nsISupports);
  watchID = geolocation.watchPosition(successCallback, errorCallback);

  Services.prefs.clearUserPref(
    "geo.provider.network.debug.requestCache.enabled"
  );
}
