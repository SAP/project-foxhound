/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { logNameTable } from "./logNameTable.mjs";

export const normalizeToKebabCase = string => {
  let kebabString = string
    // Turn all dots into dashes
    .replace(/\./g, "-")
    // Turn whitespace into dashes
    .replace(/\s+/g, "-")
    // Remove all non-characters or numbers
    .replace(/[^a-z0-9\-]/gi, "")
    // De-dupe dashes
    .replace(/--/g, "-")
    // Remove trailing and leading dashes
    .replace(/^-/g, "")
    .replace(/-$/g, "")
    .toLowerCase();

  return kebabString;
};

export const b64ToPEM = string => {
  let wrapped = string.match(/.{1,64}/g).join("\r\n");
  return `-----BEGIN CERTIFICATE-----\r\n${wrapped}\r\n-----END CERTIFICATE-----\r\n`;
};

export const getLogName = hexLogId => {
  let base64LogId = btoa(
    hexLogId
      .match(/\w{2}/g)
      .map(function (a) {
        return String.fromCharCode(parseInt(a, 16));
      })
      .join("")
  );
  return logNameTable[base64LogId];
};

export const hexToIpv6Repr = ipAddressHex => {
  let chunks = ipAddressHex
    .match(/.{4}/g)
    .map(x => parseInt(x, 16).toString(16));
  let longestZeroRunStartIndex = 0;
  let longestZeroRunFound = false;
  let longestZeroRunLength = 1;
  let isCounting = false;
  let currentZeroRunLength = 0;
  let currentZeroRunStartIndex = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i] == "0" && !isCounting) {
      isCounting = true;
      currentZeroRunStartIndex = i;
      currentZeroRunLength = 1;
    } else if (chunks[i] == "0" && isCounting) {
      currentZeroRunLength++;
    } else if (chunks[i] != "0" && isCounting) {
      if (currentZeroRunLength > longestZeroRunLength) {
        longestZeroRunLength = currentZeroRunLength;
        longestZeroRunFound = true;
        longestZeroRunStartIndex = currentZeroRunStartIndex;
        currentZeroRunLength = 0;
        isCounting = false;
      }
    }
  }
  if (isCounting && currentZeroRunLength > longestZeroRunLength) {
    longestZeroRunLength = currentZeroRunLength;
    longestZeroRunFound = true;
    longestZeroRunStartIndex = currentZeroRunStartIndex;
  }
  if (longestZeroRunFound) {
    if (longestZeroRunStartIndex + longestZeroRunLength == chunks.length) {
      chunks.push("");
    }
    if (longestZeroRunStartIndex != 0) {
      chunks.splice(longestZeroRunStartIndex, longestZeroRunLength, "");
    } else {
      chunks.splice(0, longestZeroRunLength, ":");
    }
  }
  return chunks.join(":");
};
