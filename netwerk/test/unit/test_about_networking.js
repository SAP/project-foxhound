/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const gDashboard = Cc["@mozilla.org/network/dashboard;1"].getService(
  Ci.nsIDashboard
);

const gServerSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(
  Ci.nsIServerSocket
);
const gHttpServer = new HttpServer();

registerCleanupFunction(
  () => new Promise(resolve => gHttpServer.stop(resolve))
);

add_setup(function () {
  Services.prefs.setBoolPref(
    "network.cookieJarSettings.unblocked_for_testing",
    true
  );

  // We always resolve localhost as it's hardcoded without the following pref:
  Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
  Services.prefs.setBoolPref(
    "network.proxy.testing_localhost_is_secure_when_hijacked",
    false
  );

  gHttpServer.start(-1);

  let uri = Services.io.newURI(
    "http://localhost:" + gHttpServer.identity.primaryPort
  );
  let channel = NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });
  channel.open();

  gServerSocket.init(-1, true, -1);
  Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
  Services.prefs.clearUserPref(
    "network.proxy.testing_localhost_is_secure_when_hijacked"
  );
});

add_test(function test_http() {
  gDashboard.requestHttpConnections(function (data) {
    let found = false;
    for (let i = 0; i < data.connections.length; i++) {
      if (data.connections[i].host == "localhost") {
        found = true;
        Assert.ok(
          "originAttributesSuffix" in data.connections[i],
          "HTTP connection entry has originAttributesSuffix field"
        );
        Assert.equal(
          data.connections[i].originAttributesSuffix,
          "",
          "HTTP connection with no isolation has empty originAttributesSuffix"
        );
        break;
      }
    }
    Assert.equal(found, true);

    run_next_test();
  });
});

add_test(function test_http_origin_attributes() {
  let uri = Services.io.newURI(
    "http://localhost:" + gHttpServer.identity.primaryPort
  );
  let channel = NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });
  channel.loadInfo.originAttributes = { userContextId: 1 };
  channel.open();

  gDashboard.requestHttpConnections(function (data) {
    let found = false;
    for (let conn of data.connections) {
      if (conn.host == "localhost" && conn.originAttributesSuffix != "") {
        found = true;
        Assert.equal(
          conn.originAttributesSuffix,
          "^userContextId=1",
          "HTTP connection with userContextId has correct originAttributesSuffix"
        );
        break;
      }
    }
    Assert.ok(
      found,
      "HTTP connection with non-empty originAttributesSuffix found"
    );
    run_next_test();
  });
});

add_test(function test_dns() {
  gDashboard.requestDNSInfo(function (data) {
    let found = false;
    for (let i = 0; i < data.entries.length; i++) {
      if (data.entries[i].hostname == "localhost") {
        found = true;
        break;
      }
    }
    Assert.equal(found, true);

    run_next_test();
  });
});

add_test(function test_sockets() {
  // TODO: enable this test in bug 1581892.
  if (mozinfo.socketprocess_networking) {
    info("skip test_sockets");
    run_next_test();
    return;
  }

  let sts = Cc["@mozilla.org/network/socket-transport-service;1"].getService(
    Ci.nsISocketTransportService
  );
  let threadManager = Cc["@mozilla.org/thread-manager;1"].getService();

  let transport = sts.createTransport(
    [],
    "127.0.0.1",
    gServerSocket.port,
    null,
    null
  );
  let listener = {
    onTransportStatus(aTransport, aStatus) {
      if (aStatus == Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
        gDashboard.requestSockets(function (data) {
          gServerSocket.close();
          let found = false;
          for (let i = 0; i < data.sockets.length; i++) {
            if (data.sockets[i].host == "127.0.0.1") {
              found = true;
              Assert.ok(
                "originAttributesSuffix" in data.sockets[i],
                "Socket entry has originAttributesSuffix field"
              );
              Assert.equal(
                data.sockets[i].originAttributesSuffix,
                "",
                "Socket with no isolation has empty originAttributesSuffix"
              );
              break;
            }
          }
          Assert.equal(found, true);

          run_next_test();
        });
      }
    },
  };
  transport.setEventSink(listener, threadManager.currentThread);

  transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
});

add_test(function test_sockets_origin_attributes() {
  // TODO: enable this test in bug 1581892.
  if (mozinfo.socketprocess_networking) {
    info("skip test_sockets_origin_attributes");
    run_next_test();
    return;
  }

  let sts = Cc["@mozilla.org/network/socket-transport-service;1"].getService(
    Ci.nsISocketTransportService
  );
  let threadManager = Cc["@mozilla.org/thread-manager;1"].getService();

  let serverSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(
    Ci.nsIServerSocket
  );
  serverSocket.init(-1, true, -1);

  let transport = sts.createTransport(
    [],
    "127.0.0.1",
    serverSocket.port,
    null,
    null
  );
  transport.originAttributes = { userContextId: 1 };

  let listener = {
    onTransportStatus(aTransport, aStatus) {
      if (aStatus == Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
        gDashboard.requestSockets(function (data) {
          serverSocket.close();
          let found = false;
          for (let socket of data.sockets) {
            if (
              socket.host == "127.0.0.1" &&
              socket.originAttributesSuffix != ""
            ) {
              found = true;
              Assert.equal(
                socket.originAttributesSuffix,
                "^userContextId=1",
                "Socket with userContextId has correct originAttributesSuffix"
              );
              break;
            }
          }
          Assert.ok(
            found,
            "Socket with non-empty originAttributesSuffix found"
          );
          run_next_test();
        });
      }
    },
  };
  transport.setEventSink(listener, threadManager.currentThread);
  transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
});

add_test(function test_http_private_browsing() {
  let uri = Services.io.newURI(
    "http://localhost:" + gHttpServer.identity.primaryPort
  );
  let channel = NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });
  channel.loadInfo.originAttributes = { privateBrowsingId: 1 };
  channel.open();

  gDashboard.requestHttpConnections(function (data) {
    let found = false;
    for (let conn of data.connections) {
      if (
        conn.host == "localhost" &&
        conn.originAttributesSuffix == "^privateBrowsingId=1"
      ) {
        found = true;
        break;
      }
    }
    Assert.ok(found, "Private browsing HTTP connection entry found");
    run_next_test();
  });
});

add_test(function test_sockets_private_browsing() {
  // TODO: enable this test in bug 1581892.
  if (mozinfo.socketprocess_networking) {
    info("skip test_sockets_private_browsing");
    run_next_test();
    return;
  }

  let sts = Cc["@mozilla.org/network/socket-transport-service;1"].getService(
    Ci.nsISocketTransportService
  );
  let threadManager = Cc["@mozilla.org/thread-manager;1"].getService();

  let serverSocket = Cc["@mozilla.org/network/server-socket;1"].createInstance(
    Ci.nsIServerSocket
  );
  serverSocket.init(-1, true, -1);

  let transport = sts.createTransport(
    [],
    "127.0.0.1",
    serverSocket.port,
    null,
    null
  );
  transport.originAttributes = { privateBrowsingId: 1 };

  let listener = {
    onTransportStatus(aTransport, aStatus) {
      if (aStatus == Ci.nsISocketTransport.STATUS_CONNECTED_TO) {
        gDashboard.requestSockets(function (data) {
          serverSocket.close();
          let found = false;
          for (let socket of data.sockets) {
            if (
              socket.host == "127.0.0.1" &&
              socket.originAttributesSuffix == "^privateBrowsingId=1"
            ) {
              found = true;
              break;
            }
          }
          Assert.ok(found, "Private browsing socket entry found");
          run_next_test();
        });
      }
    },
  };
  transport.setEventSink(listener, threadManager.currentThread);
  transport.openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
});
