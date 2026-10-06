/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

{
  const bugInfo = "param:bugInfo";
  const msgs = window.__webcompat;
  delete window.__webcompat;
  if (msgs?.size) {
    const bugs =
      bugInfo.find(([domain]) => location.href.includes(domain))?.[1] ??
      bugInfo[0][1];
    const bugNumbers = bugs.map(b => "https://bugzil.la/" + b).join(" and ");
    console.info(
      `${[...msgs].join(", ")} ${msgs.size > 1 ? "are" : "is"} being altered for compatibility reasons. See ${bugNumbers} for details.`
    );
  }
}
