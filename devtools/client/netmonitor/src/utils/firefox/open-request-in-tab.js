/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  gDevTools,
} = require("resource://devtools/client/framework/devtools.js");

/**
 * Opens given request in a new tab.
 */
function openRequestInTab(url, requestHeaders, requestPostData) {
  const win = Services.wm.getMostRecentWindow(gDevTools.chromeWindowType);
  const rawData = requestPostData ? requestPostData.postData : null;
  let postData;

  if (rawData?.text) {
    const stringStream = getInputStreamFromString(rawData.text);
    postData = Cc["@mozilla.org/network/mime-input-stream;1"].createInstance(
      Ci.nsIMIMEInputStream
    );

    const contentTypeHeader = requestHeaders.headers.find(e => {
      return e.name.toLowerCase() === "content-type";
    });

    postData.addHeader(
      "Content-Type",
      contentTypeHeader
        ? contentTypeHeader.value
        : "application/x-www-form-urlencoded"
    );
    postData.setData(stringStream);
  }
  const { userContextId } = win.gBrowser.contentPrincipal;
  win.gBrowser.selectedTab = win.gBrowser.addWebTab(url, {
    // TODO this should be using the original request principal
    triggeringPrincipal: Services.scriptSecurityManager.createNullPrincipal({
      userContextId,
    }),
    userContextId,
    postData,
  });
}

function getInputStreamFromString(data) {
  const stringStream = Cc[
    "@mozilla.org/io/string-input-stream;1"
  ].createInstance(Ci.nsIStringInputStream);
  stringStream.setByteStringData(data);
  return stringStream;
}

module.exports = {
  openRequestInTab,
};
