/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1986438 - hide browser warning on gamma.app
 */

const callback = (mutations, observer) => {
  const search = document.evaluate(
    "//*[text()[contains(., 'works best on Chrome')]]",
    document,
    null,
    4
  );
  const found = search.iterateNext();
  if (found) {
    const alerts = found.closest(".chakra-alert");
    if (alerts.querySelectorAll(".chakra-stack").length === 1) {
      alerts.remove();
    } else {
      found.closest(".chakra-stack").remove();
    }
    observer?.disconnect();
  }
};

const observer = new MutationObserver(callback);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
