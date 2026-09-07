/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

self.oninstall = _ => {
  self.skipWaiting();
};

self.onactivate = event => {
  event.waitUntil(self.clients.claim());
};

self.onfetch = event => {
  event.respondWith(fetch(event.request, { credentials: "include" }));
};
