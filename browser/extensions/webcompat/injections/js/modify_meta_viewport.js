/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals browser */

"use strict";

{
  const port = browser.runtime.connect();
  port.onMessage.addListener(({ metaViewportChanges }) => {
    const check = () => {
      const metaViewport = document.querySelector("meta[name=viewport]");
      if (!metaViewport) {
        return;
      }
      const content = (metaViewport.content ?? "")
        .split(",")
        .map(r => r.trim())
        .reduce((out, item) => {
          const [key, value] = item.split("=").map(i => i.trim());
          out[key] = value;
          return out;
        }, {});
      for (const [key, _rawValue] of Object.entries(metaViewportChanges)) {
        const _value =
          typeof _rawValue == "string" || _rawValue === null
            ? { value: _rawValue }
            : _rawValue;

        const { only_if_equals, only_if_not_equals, value } = _value;

        const givenValue = content[key] ?? null;

        let shouldApplyChange = true;
        if (only_if_equals !== undefined && only_if_equals !== givenValue) {
          shouldApplyChange = false;
        }
        if (
          Array.isArray(only_if_equals) &&
          !only_if_equals.includes(givenValue)
        ) {
          shouldApplyChange = false;
        }
        if (
          only_if_not_equals !== undefined &&
          only_if_not_equals === givenValue
        ) {
          shouldApplyChange = false;
        }
        if (
          Array.isArray(only_if_not_equals) &&
          only_if_not_equals.includes(givenValue)
        ) {
          shouldApplyChange = false;
        }
        if (shouldApplyChange) {
          if (value == null) {
            delete content[key];
          } else {
            content[key] = value;
          }
        }
      }
      metaViewport.setAttribute(
        "content",
        Object.entries(content)
          .map(([k, v]) => `${k}=${v}`)
          .join(",")
      );
    };

    document.addEventListener("DOMContentLoaded", check);
    if (document.readyState != "loading") {
      check();
    }
  });
}
