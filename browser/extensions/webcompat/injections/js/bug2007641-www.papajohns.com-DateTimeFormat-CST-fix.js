/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 2007641 - Cannot check out on papajohns.com in CST timezone.
 *
 * The site is not passing a standard value to Intl.DateTimeFormat, which
 * throws an exception on Firefox (but works on Chrome). We can detect this
 * and change the value to a standard one.
 */

try {
  new Intl.DateTimeFormat(void 0, { timeZone: "CST" });
} catch (_) {
  console.info(
    "Intl.DateTimeFormat is being shimmed for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=2007641 for details."
  );

  const desc = Object.getOwnPropertyDescriptor(window.Intl, "DateTimeFormat");
  const { value } = desc;
  desc.value = function () {
    switch (arguments[1]?.timeZone.toUpperCase()) {
      case "AST":
        arguments[1].timeZone = "America/Anchorage";
        break;
      case "EST":
        arguments[1].timeZone = "America/New_York";
        break;
      case "CST":
        arguments[1].timeZone = "America/Chicago";
        break;
      case "HST":
        arguments[1].timeZone = "Pacific/Honolulu";
        break;
      case "MST":
        arguments[1].timeZone = "America/Denver";
        break;
      case "PST":
        arguments[1].timeZone = "America/Los_Angeles";
        break;
      case "SST":
        arguments[1].timeZone = "Pacific/Pago_Pago";
        break;
    }
    return value.apply(this, arguments);
  };
  Object.defineProperty(window.Intl, "DateTimeFormat", desc);
}
