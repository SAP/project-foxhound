/* -*- Mode: JavaScript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

export function MediaDrmProvisioning() {}

MediaDrmProvisioning.prototype = {
  QueryInterface: ChromeUtils.generateQI([
    "nsIMediaDrmProvisioning",
    "nsISupport",
  ]),

  provision(serverUrl, request) {
    const url = serverUrl + "&signedRequest=" + request;
    return new Promise((resolve, reject) => {
      fetch(url, { method: "POST" })
        .then(response => {
          response
            .bytes()
            .then(bytes => {
              resolve(bytes);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  },
};
