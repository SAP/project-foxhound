/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1709653 - Office 365 email handling prompt autohide
 *
 * This site patch prevents the notification bar on Office 365
 * apps from popping up on each page-load, offering to handle
 * email with Outlook.
 */

if (!window.__firefoxWebCompatFixBug1709653) {
  Object.defineProperty(window, "__firefoxWebCompatFixBug1709653", {
    configurable: false,
    value: true,
  });

  const warning =
    "Office 365 Outlook email handling prompt has been hidden. See https://bugzilla.mozilla.org/show_bug.cgi?id=1709653 for details.";

  const localStorageKey = "mailProtocolHandlerAlreadyOffered";

  const proto = Object.getPrototypeOf(navigator);
  const { registerProtocolHandler } = proto;
  const { localStorage } = window;

  proto.registerProtocolHandler = function (scheme, url, title) {
    if (localStorage.getItem(localStorageKey)) {
      console.info(warning);
      return undefined;
    }
    registerProtocolHandler.call(this, scheme, url, title);
    localStorage.setItem(localStorageKey, true);
    return undefined;
  };
}
