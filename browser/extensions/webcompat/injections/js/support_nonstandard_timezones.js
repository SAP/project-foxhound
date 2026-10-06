/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

try {
  new Date().toLocaleString("en", {
    weekday: "long",
    timeZone: "SystemV/CST6",
  });
} catch (_) {
  const buildFixed = value => {
    return function () {
      switch (
        arguments[1]?.timeZone?.toUpperCase().split("/").pop().substr(0, 3)
      ) {
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
  };

  window.__webcompat ??= new Set();

  {
    const desc = Object.getOwnPropertyDescriptor(
      window.Date.prototype,
      "toLocaleString"
    );
    const { value } = desc;
    desc.value = buildFixed(value);
    Object.defineProperty(window.Date.prototype, "toLocaleString", desc);
    window.__webcompat.add("Date.toLocaleString");
  }

  {
    const desc = Object.getOwnPropertyDescriptor(window.Intl, "DateTimeFormat");
    const { value } = desc;
    desc.value = buildFixed(value);
    Object.defineProperty(window.Intl, "DateTimeFormat", desc);
    window.__webcompat.add("Intl.DateTimeFormat");
  }
}
