/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1999198 - Fix broken scrolling on anime-bit.ru
 *
 * The site uses quirks mode, and due to a related interop issue their page
 * will not load more content as the page is scrolled down. This fixes it.
 */

if (!window.__firefoxWebCompatFixBug1756970) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1756970", {
    configurable: false,
    value: true,
  });

  console.info(
    "documentElement.clientHeight has been overridden for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1999198 for details."
  );

  const { prototype } = Element;
  const clientHeightDesc = Object.getOwnPropertyDescriptor(
    prototype,
    "clientHeight"
  );
  const origHeight = clientHeightDesc.get;
  clientHeightDesc.get = function () {
    if (this === document.documentElement) {
      return this.scrollHeight;
    }
    return origHeight.call(this);
  };
  Object.defineProperty(prototype, "clientHeight", clientHeightDesc);
}
