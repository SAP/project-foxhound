/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1950282 - navigator.platform Windowss override for Formula 1 TV on Linux
 *
 * Formula1 TV is doing some kind of check for Android devices which is
 * causing it to treat Firefox on Linux as an Android device, and blocking it.
 * Overriding navigator.platform to Win64 on Linux works around this issue.
 */

if (!navigator.platform.includes("Win64")) {
  console.info(
    "navigator.platform has been overridden for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1950282 for details."
  );

  const nav = Object.getPrototypeOf(navigator);
  const platform = Object.getOwnPropertyDescriptor(nav, "platform");
  platform.get = () => "Win64";
  Object.defineProperty(nav, "platform", platform);
}
