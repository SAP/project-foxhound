/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 2021850 - Calendar does not work
 *
 * The site calls fetch with a User-Agent header, which Firefox correctly
 * declines, but Chrome currently silently ignores, letting the site work.
 * Chrome should update to match Firefox, but we can fix it for now.
 */

{
  const { fetch } = window;
  window.fetch = function (resource, options = {}) {
    if (options.headers) {
      console.error(resource, options);
      delete options.headers["User-Agent"];
    }
    return fetch(resource, options);
  };
}
