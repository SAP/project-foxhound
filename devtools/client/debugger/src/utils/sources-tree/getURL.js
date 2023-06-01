/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import { parse } from "../url";

const {
  getUnicodeHostname,
  getUnicodeUrlPath,
} = require("devtools/client/shared/unicode-url");

export function getFilenameFromPath(pathname) {
  let filename = "";
  if (pathname) {
    filename = pathname.substring(pathname.lastIndexOf("/") + 1);
    // This file does not have a name. Default should be (index).
    if (filename == "") {
      filename = "(index)";
    }
  }
  return filename;
}

function getFileExtension(path) {
  if (!path) {
    return "";
  }

  const lastIndex = path.lastIndexOf(".");
  return lastIndex !== -1 ? path.slice(lastIndex + 1).toLowerCase() : "";
}

const NoDomain = "(no domain)";
const def = {
  path: "",
  search: "",
  group: "",
  filename: "",
  fileExtension: "",
};

/**
 * Compute the URL which may be displayed in the Source Tree.
 *
 * @param {String} url
 *        The source absolute URL as a string
 * @param {String} extensionName
 *        Optional, but mandatory when passing a moz-extension URL.
 *        Name of the extension serving this moz-extension source.
 * @return URL Object
 *        A URL object to represent this source.
 *
 *        Note that this isn't the standard URL object.
 *        This is augmented with custom properties like:
 *        - `group`, which is mostly the host of the source's URL.
 *          This is used to sort sources in the Source tree.
 *        - `fileExtension`, lowercased file extension of the source
 *          (if any extension is available)
 *        - `path` and `pathname` have some special behavior.
 *          See `parse` implementation.
 */
export function getDisplayURL(url, extensionName = null) {
  if (!url) {
    return def;
  }

  const { pathname, search, protocol, host } = parse(url);
  const filename = getUnicodeUrlPath(getFilenameFromPath(pathname));

  switch (protocol) {
    case "javascript:":
      // Ignore `javascript:` URLs for now
      return def;

    case "moz-extension:":
      return {
        ...def,
        path: pathname,
        search,
        filename,
        fileExtension: getFileExtension(pathname),
        // For moz-extension, we replace the uuid by the extension name
        // that we receive from the SourceActor.extensionName attribute.
        // `extensionName` might be null for content script of disabled add-ons.
        group: extensionName || `${protocol}//${host}`,
      };
    case "resource:":
      return {
        ...def,
        path: pathname,
        search,
        filename,
        fileExtension: getFileExtension(pathname),
        group: `${protocol}//${host || ""}`,
      };
    case "webpack:":
      return {
        ...def,
        path: pathname,
        search,
        filename,
        fileExtension: getFileExtension(pathname),
        group: `Webpack`,
      };
    case "ng:":
      return {
        ...def,
        path: pathname,
        search,
        filename,
        fileExtension: getFileExtension(pathname),
        group: `Angular`,
      };
    case "about:":
      // An about page is a special case
      return {
        ...def,
        path: "/",
        search,
        filename,
        fileExtension: getFileExtension("/"),
        group: url,
      };

    case "data:":
      return {
        ...def,
        path: "/",
        search,
        filename: url,
        fileExtension: getFileExtension("/"),
        group: NoDomain,
      };

    case "":
      if (pathname && pathname.startsWith("/")) {
        // use file protocol for a URL like "/foo/bar.js"
        return {
          ...def,
          path: pathname,
          search,
          filename,
          fileExtension: getFileExtension(pathname),
          group: "file://",
        };
      } else if (!host) {
        return {
          ...def,
          path: pathname,
          search,
          filename,
          fileExtension: getFileExtension(pathname),
          group: "",
        };
      }
      break;

    case "http:":
    case "https:":
      return {
        ...def,
        path: pathname,
        search,
        filename,
        fileExtension: getFileExtension(pathname),
        group: getUnicodeHostname(host),
      };
  }

  return {
    ...def,
    path: pathname,
    search,
    fileExtension: getFileExtension(pathname),
    filename,
    group: protocol ? `${protocol}//` : "",
  };
}
