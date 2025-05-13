/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This modules focuses on redirecting requests to a particular local file.
 */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import { NetUtil } from "resource://gre/modules/NetUtil.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "mimeService",
  "@mozilla.org/mime;1",
  "nsIMIMEService"
);

function readFile(file) {
  const fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(
    Ci.nsIFileInputStream
  );
  fstream.init(file, -1, 0, 0);
  const data = NetUtil.readInputStreamToString(fstream, fstream.available());
  fstream.close();
  return data;
}

/**
 * Given an in-flight channel, we will force to replace the content of this request
 * with the content of a local file.
 *
 * @param {nsIHttpChannel} channel
 *        The request to replace content for.
 * @param {String} path
 *        The absolute path to the local file to read content from.
 */
function overrideChannelWithFilePath(channel, path) {
  // For JS it isn't important, but for HTML we ought to set the right content type on the data URI.
  let mimeType = "";
  try {
    // getTypeFromURI will throw if there is no extension at the end of the URI
    mimeType = lazy.mimeService.getTypeFromURI(channel.URI);
  } catch (e) {}

  // Create a new response.
  const replacedHttpResponse = Cc[
    "@mozilla.org/network/replaced-http-response;1"
  ].createInstance(Ci.nsIReplacedHttpResponse);

  replacedHttpResponse.responseStatus = 200;
  replacedHttpResponse.responseStatusText = "OK";
  const file = lazy.FileUtils.File(path);
  replacedHttpResponse.responseBody = readFile(file);
  if (mimeType) {
    replacedHttpResponse.setResponseHeader("Content-Type", mimeType, false);
  }

  // Allow all cross origin requests for overrides.
  replacedHttpResponse.setResponseHeader(
    "Access-Control-Allow-Origin",
    "*",
    false
  );

  channel
    .QueryInterface(Ci.nsIHttpChannelInternal)
    .setResponseOverride(replacedHttpResponse);
}

export const NetworkOverride = {
  overrideChannelWithFilePath,
};
