/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1970810 - camper-van-week-end.fr/chantilly does not load on Linux
 * WebCompat issue #155547 - https://webcompat.com/issues/155547
 *
 * The page expects navigator.appVersion to contain the literal string
 * "linux" on Linux, and their JS otherwise breaks.
 *
 * As such this site patch sets appVersion to "5.0 (Linux)", and is
 * only meant to be applied on Linux.
 */

if (!navigator.appVersion.includes("Linux")) {
  console.info(
    "navigator.appVersion has been shimmed for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1970810 for details."
  );

  const nav = Object.getPrototypeOf(navigator);
  const appVersion = Object.getOwnPropertyDescriptor(nav, "appVersion");
  appVersion.get = () => "5.0 (Linux)";
  Object.defineProperty(nav, "appVersion", appVersion);
}
