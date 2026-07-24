/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  EssentialDomainsRemoteSettings:
    "resource://gre/modules/EssentialDomainsRemoteSettings.sys.mjs",
  ESSENTIAL_DOMAINS_REMOTE_BUCKET:
    "resource://gre/modules/EssentialDomainsRemoteSettings.sys.mjs",
});

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AddonSettings: "resource://gre/modules/addons/AddonSettings.sys.mjs",
  CertUtils: "resource://gre/modules/CertUtils.sys.mjs",
  ServiceRequest: "resource://gre/modules/ServiceRequest.sys.mjs",
});

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);

const EXPECTED_RESPONSE = "<html><body>\n</body></html>\n";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.essential_domains_fallback", true],
      ["network.proxy.no_proxies_on", "aus5.mozilla.org"],
    ],
  });

  // Pretend this domain blocked at the DNS layer.
  override.addIPOverride("aus5.mozilla.org", "N/A");
  registerCleanupFunction(async () => {
    override.clearOverrides();
  });

  let ncs = Cc[
    "@mozilla.org/network/network-connectivity-service;1"
  ].getService(Ci.nsINetworkConnectivityService);
  ncs.IPv4 = Ci.nsINetworkConnectivityService.OK;

  const settings = await RemoteSettings(ESSENTIAL_DOMAINS_REMOTE_BUCKET);
  let stub = sinon.stub(settings, "get").returns(newData);
  registerCleanupFunction(async function () {
    stub.restore();
  });

  await RemoteSettings(ESSENTIAL_DOMAINS_REMOTE_BUCKET).emit("sync", {});
});

let newData = [
  {
    id: "111",
    from: "aus5.mozilla.org",
    to: "test1.example.com",
  },
];

function read_stream(stream, count) {
  /* assume stream has non-ASCII data */
  var wrapper = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
    Ci.nsIBinaryInputStream
  );
  wrapper.setInputStream(stream);
  /* JS methods can be called with a maximum of 65535 arguments, and input
     streams don't have to return all the data they make .available() when
     asked to .read() that number of bytes. */
  var data = [];
  while (count > 0) {
    var bytes = wrapper.readByteArray(Math.min(65535, count));
    data.push(String.fromCharCode.apply(null, bytes));
    count -= bytes.length;
    if (!bytes.length) {
      throw new Error("Nothing read from input stream!");
    }
  }
  return data.join("");
}

class SimpleChannelListener {
  constructor(callback) {
    this._onStopCallback = callback;
    this._buffer = "";
  }
  get QueryInterface() {
    return ChromeUtils.generateQI(["nsIStreamListener", "nsIRequestObserver"]);
  }

  onStartRequest() {}

  onDataAvailable(request, stream, offset, count) {
    this._buffer = this._buffer.concat(read_stream(stream, count));
  }

  onStopRequest(request) {
    if (this._onStopCallback) {
      this._onStopCallback(request, this._buffer);
    }
  }
}

function openChannelPromise(url, options = { loadUsingSystemPrincipal: true }) {
  let uri = Services.io.newURI(url);
  options.uri = uri;
  let chan = NetUtil.newChannel(options);
  return new Promise(resolve => {
    chan.asyncOpen(
      new SimpleChannelListener((req, buf) => resolve({ req, buf }))
    );
  });
}

add_task(async function test_channel_fallback_on_dns() {
  // The host should be replaced with test1.example.com
  // if the original channel fails and it's in the remote settings payload.
  let { req, buf } = await openChannelPromise(
    "https://aus5.mozilla.org/browser/netwerk/cookie/test/browser/file_empty.html"
  );
  Assert.equal(buf, EXPECTED_RESPONSE);
  Assert.equal(req.URI.host, "test1.example.com");
});

add_task(async function test_service_request_fallback() {
  let request = await new Promise((resolve, reject) => {
    let request = new lazy.ServiceRequest({ mozAnon: true });
    request.open(
      "GET",
      `https://aus5.mozilla.org/browser/netwerk/cookie/test/browser/file_empty.html`,
      true
    );
    request.channel.notificationCallbacks = new lazy.CertUtils.BadCertHandler(
      !lazy.AddonSettings.UPDATE_REQUIREBUILTINCERTS
    );
    request.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE;
    // Prevent the request from writing to cache.
    request.channel.loadFlags |= Ci.nsIRequest.INHIBIT_CACHING;
    request.overrideMimeType("text/plain");
    request.timeout = 5000;
    request.addEventListener("load", () => resolve(request));
    request.addEventListener("error", reject);
    request.addEventListener("timeout", reject);
    request.send(null);
  });
  Assert.equal(request.responseText, "<html><body>\n</body></html>\n");
  Assert.equal(
    request.responseURL,
    "https://test1.example.com/browser/netwerk/cookie/test/browser/file_empty.html"
  );
});

add_task(async function test_fetch_request_fallback() {
  let response = await fetch(
    "https://aus5.mozilla.org/browser/netwerk/cookie/test/browser/file_empty.html",
    {
      method: "GET",
      cache: "no-store", // prevent caching, similar to LOAD_BYPASS_CACHE
    }
  );

  let text = await response.text();

  Assert.equal(text, "<html><body>\n</body></html>\n");
  Assert.equal(
    response.url,
    "https://test1.example.com/browser/netwerk/cookie/test/browser/file_empty.html"
  );
});
