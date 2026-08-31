/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implements the DevTools "Local Mode" backend, which redirects requests
 * to local files defined by the Web Developer.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
  NetworkOverride:
    "resource://devtools/shared/network-observer/NetworkOverride.sys.mjs",
});

export const NetworkLocalMode = {
  /**
   * Intercept a early channel that hasn't established a remote connection yet,
   * which matches a "Local Mode" origin and should be served from a local file
   * located in the folder passed as argument.
   *
   * @param {nsIHttpChannel} channel
   * @param {string} localFolderPath
   */
  interceptChannelWithPath(channel, localFolderPath) {
    const path = decodeURI(channel.URI.filePath.replace(/^\//, ""));

    // On Windows, replace all URI's '/' path separators with '\'
    let systemPath = path;
    if (Services.appinfo.OS === "WINNT") {
      systemPath = systemPath.replace(/\//g, "\\");
    }

    const overridePath = PathUtils.joinRelative(localFolderPath, systemPath);
    let file = new lazy.FileUtils.File(overridePath);

    if (!file.exists()) {
      // Create a 404 response to avoid leaving any request matching the host
      // to fallback to any potential existing http server.
      overrideChannelInto404(channel);
      return;
    }

    if (file.isFile()) {
      // This is the typical codepath redirecting to a existing local file
      lazy.NetworkOverride.overrideChannelWithFilePath(channel, file.path);
      return;
    }

    if (file.isDirectory()) {
      // Before showing a directory listing, try to match a valid index HTML file
      file.append("index.html");
      if (file.exists() && file.isFile()) {
        // This is the typical codepath redirecting to a existing local file
        lazy.NetworkOverride.overrideChannelWithFilePath(channel, file.path);
        return;
      }
      file = file.parent;
      file.append("index.htm");
      if (file.exists() && file.isFile()) {
        // This is the typical codepath redirecting to a existing local file
        lazy.NetworkOverride.overrideChannelWithFilePath(channel, file.path);
        return;
      }
      file = file.parent;

      // When we are trying to load a directory, return a file listing instead of 404
      // as that's really handy and behaves like a typical development http server.
      overrideChannelWithDirectoryListing(channel, path, file);
      return;
    }

    // In case it is neither a file, nor a directory?
    overrideChannelInto404(channel);
  },
};

/**
 * Make it so that an in-flight channel that just started
 * is converted into a 404 response for when there is no matching local file
 * for that request.
 *
 * @param {nsIHttpChannel} channel
 */
function overrideChannelInto404(channel) {
  const replacedHttpResponse = Cc[
    "@mozilla.org/network/replaced-http-response;1"
  ].createInstance(Ci.nsIReplacedHttpResponse);

  replacedHttpResponse.responseStatus = 404;
  replacedHttpResponse.responseStatusText = "404 Not Found";
  const body = `<h1>DevTools Local Mode</h1><p>No local file for: ${channel.URI.filePath}</p>`;
  replacedHttpResponse.responseBody = body;

  channel
    .QueryInterface(Ci.nsIHttpChannelInternal)
    .setResponseOverride(replacedHttpResponse);
}

/**
 * Replace the content of an in-flight channel that just started
 * that matches a local mode folder into an HTML page listing of
 * the available files in that folder.
 *
 * @param {nsIHttpChannel} channel
 * @param {string} folderPath
 * @param {nsILocalFile} file
 */
async function overrideChannelWithDirectoryListing(channel, folderPath, file) {
  const replacedHttpResponse = Cc[
    "@mozilla.org/network/replaced-http-response;1"
  ].createInstance(Ci.nsIReplacedHttpResponse);

  replacedHttpResponse.responseStatus = 200;
  replacedHttpResponse.responseStatusText = "OK";
  replacedHttpResponse.setResponseHeader("Content-Type", "text/html", false);

  // `setResponseOverride` has to be called synchronously after before-connect event
  // to really intercept the request.
  // Workaround this by suspending the request until we asynchronously retrieve
  // the directory listing content
  channel.suspend();

  // Compute a simple, but meaningful HTML file for the listing
  const links = [];
  const children = await IOUtils.getChildren(file.path);
  for (const childPath of children.sort()) {
    const filename = PathUtils.filename(childPath);
    const absolutePath =
      "/" +
      folderPath +
      (!folderPath || folderPath.endsWith("/") ? "" : "/") +
      filename;
    links.push(`<li><a href="${absolutePath}">${filename}</a></li>`);
  }
  const body =
    "<h2>" +
    PathUtils.filename(file.path) +
    ":</h2><ul>" +
    links.join("") +
    "</ul>";

  replacedHttpResponse.responseBody = body;

  channel
    .QueryInterface(Ci.nsIHttpChannelInternal)
    .setResponseOverride(replacedHttpResponse);

  channel.resume();
}
