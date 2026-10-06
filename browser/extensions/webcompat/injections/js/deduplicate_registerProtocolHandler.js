/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

{
  const proto = Object.getPrototypeOf(navigator);
  const { registerProtocolHandler } = proto;
  const { localStorage } = window;

  proto.registerProtocolHandler = (scheme, url, title) => {
    // special case mailto, as we have historically used "mail" as its prefix in localStorage.
    const lsKey = `${scheme == "mailto" ? "mail" : scheme}ProtocolHandlerAlreadyOffered`;
    if (localStorage.getItem(lsKey)) {
      return;
    }
    registerProtocolHandler.call(this, scheme, url, title);
    localStorage.setItem(lsKey, true);
  };

  window.__webcompat = (window.__webcompat ?? new Set()).add(
    "registerProtocolHandler"
  );
}
