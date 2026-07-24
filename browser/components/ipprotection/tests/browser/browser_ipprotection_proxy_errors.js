/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPChannelFilter } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPChannelFilter.sys.mjs"
);
const { IPPNetworkErrorObserver } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPNetworkErrorObserver.sys.mjs"
);

add_task(async function test_createConnection_and_proxy() {
  const failConnect = async (request, response) => {
    response.setStatusLine(request.httpVersion, 500, "Error");
    response.setHeader("Content-Type", "text/plain");
    response.write("Error");
  };

  await using proxyInfo = withProxyServer(failConnect);
  // Create the IPP connection filter
  const filter = IPPChannelFilter.create();
  filter.initialize("", proxyInfo.server);
  filter.start();

  const observer = new IPPNetworkErrorObserver();
  const eventFired = new Promise(r => {
    observer.addEventListener("proxy-http-error", e => {
      r(e);
    });
  });
  observer.addIsolationKey(filter.isolationKey);
  observer.start();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `https://example.com/`,
    false // waitForLoad
  );
  const { detail } = await eventFired;
  await BrowserTestUtils.removeTab(tab);

  Assert.equal(detail.httpStatus, 500);
  Assert.equal(detail.isolationKey, filter.isolationKey);
  Assert.equal(detail.level, "error");
});
