"use strict";

const { HttpServer } = ChromeUtils.import("resource://testing-common/httpd.js");

XPCOMUtils.defineLazyGetter(this, "URL", function() {
  return "http://localhost:" + httpServer.identity.primaryPort;
});

var httpServer = null;
// Need to randomize, because apparently no one clears our cache
var randomPath = "/redirect/" + Math.random();

XPCOMUtils.defineLazyGetter(this, "randomURI", function() {
  return URL + randomPath;
});

function make_channel(url, callback, ctx) {
  return NetUtil.newChannel({ uri: url, loadUsingSystemPrincipal: true });
}

const responseBody = "response body";

function redirectHandler(metadata, response) {
  response.setStatusLine(metadata.httpVersion, 301, "Moved");
  response.setHeader("Location", URL + "/content", false);
}

function contentHandler(metadata, response) {
  response.setHeader("Content-Type", "text/plain");
  response.bodyOutputStream.write(responseBody, responseBody.length);
}

let ChannelEventSink2 = {
  _classDescription: "WebRequest channel event sink",
  _classID: Components.ID("115062f8-92f1-11e5-8b7f-08001110f7ec"),
  _contractID: "@mozilla.org/webrequest/channel-event-sink;1",

  QueryInterface: ChromeUtils.generateQI(["nsIChannelEventSink", "nsIFactory"]),

  init() {
    Components.manager
      .QueryInterface(Ci.nsIComponentRegistrar)
      .registerFactory(
        this._classID,
        this._classDescription,
        this._contractID,
        this
      );
  },

  register() {
    Services.catMan.addCategoryEntry(
      "net-channel-event-sinks",
      this._contractID,
      this._contractID,
      false,
      true
    );
  },

  unregister() {
    Services.catMan.deleteCategoryEntry(
      "net-channel-event-sinks",
      this._contractID,
      false
    );
  },

  // nsIChannelEventSink implementation
  asyncOnChannelRedirect(oldChannel, newChannel, flags, redirectCallback) {
    // Abort the redirection
    redirectCallback.onRedirectVerifyCallback(Cr.NS_ERROR_NO_INTERFACE);
  },

  // nsIFactory implementation
  createInstance(iid) {
    return this.QueryInterface(iid);
  },
};

add_task(async function test_redirect_veto() {
  httpServer = new HttpServer();
  httpServer.registerPathHandler(randomPath, redirectHandler);
  httpServer.registerPathHandler("/content", contentHandler);
  httpServer.start(-1);

  ChannelEventSink2.init();
  ChannelEventSink2.register();

  let chan = make_channel(randomURI);
  let [req, buff] = await new Promise(resolve =>
    chan.asyncOpen(
      new ChannelListener((aReq, aBuff) => resolve([aReq, aBuff], null))
    )
  );
  Assert.equal(buff, "");
  Assert.equal(req.status, Cr.NS_OK);
  await httpServer.stop();
  ChannelEventSink2.unregister();
});
