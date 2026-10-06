/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

// Widget wrapper can be a place to normalize widget functionality, and
// wrap the more widget specific functionality.
export function WidgetWrapper({ className, children, ...rest }) {
  const merged = ["widget-wrapper", "col-4", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div {...rest} className={merged}>
      {children}
    </div>
  );
}
