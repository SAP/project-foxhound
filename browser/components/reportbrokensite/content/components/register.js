/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

{
  const URL_INPUT_TAG = "url-input";

  for (let [tag, script] of [
    [
      URL_INPUT_TAG,
      "chrome://browser/content/reportbrokensite/components/url-input.mjs",
    ],
  ]) {
    if (!customElements.get(tag)) {
      customElements.setElementCreationCallback(tag, () => {
        ChromeUtils.importESModule(script, { global: "current" });
      });
    }
  }
}
