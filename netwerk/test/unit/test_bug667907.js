"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

var httpserver = null;
var simplePath = "/simple";
var normalPath = "/normal";
var httpbody = "<html></html>";

ChromeUtils.defineLazyGetter(this, "uri1", function () {
  return "http://localhost:" + httpserver.identity.primaryPort + simplePath;
});

ChromeUtils.defineLazyGetter(this, "uri2", function () {
  return "http://localhost:" + httpserver.identity.primaryPort + normalPath;
});

function make_channel(url) {
  return NetUtil.newChannel({ uri: url, loadUsingSystemPrincipal: true });
}

var listener_proto = {
  QueryInterface: ChromeUtils.generateQI([
    "nsIStreamListener",
    "nsIRequestObserver",
  ]),

  onStartRequest(request) {
    Assert.equal(
      request.QueryInterface(Ci.nsIChannel).contentType,
      this.contentType
    );
    request.cancel(Cr.NS_BINDING_ABORTED);
  },

  onDataAvailable() {
    do_throw("Unexpected onDataAvailable");
  },

  onStopRequest(request, status) {
    Assert.equal(status, Cr.NS_BINDING_ABORTED);
    this.termination_func();
  },
};

function listener(contentType, termination_func) {
  this.contentType = contentType;
  this.termination_func = termination_func;
}
listener.prototype = listener_proto;

function run_test() {
  httpserver = new HttpServer();
  httpserver.registerPathHandler(simplePath, simpleHandler);
  httpserver.registerPathHandler(normalPath, normalHandler);
  httpserver.start(-1);

  var channel = make_channel(uri1);
  channel.asyncOpen(
    new listener("text/plain", function () {
      run_test2();
    })
  );

  do_test_pending();
}

function run_test2() {
  var channel = make_channel(uri2);
  channel.asyncOpen(
    new listener("text/html", function () {
      httpserver.stop(do_test_finished);
    })
  );
}

function simpleHandler(metadata, response) {
  response.seizePower();
  response.bodyOutputStream.write(httpbody, httpbody.length);
  response.finish();
}

function normalHandler(metadata, response) {
  response.bodyOutputStream.write(httpbody, httpbody.length);
  response.finish();
}
