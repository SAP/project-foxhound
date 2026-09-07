/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals browser */

"use strict";

window.metadata ??= new Promise(resolve => {
  const port = browser.runtime.connect();
  port.onMessage.addListener(metadata => {
    resolve(metadata);
  });
});

window.metadata.then(({ messagesToHide }) => {
  const check = () => {
    for (const {
      all_frames,
      click_adjacent,
      container,
      message,
    } of messagesToHide) {
      if (!all_frames && window !== window.top) {
        continue;
      }
      for (const candidate of document.querySelectorAll(container)) {
        if (candidate.innerText.includes(message)) {
          if (click_adjacent) {
            candidate.parentElement.querySelector(click_adjacent)?.click();
          } else {
            candidate.remove();
          }
        }
      }
    }
  };

  const disconnect = () => {
    try {
      setTimeout(() => observer.disconnect(), 5000);
    } catch (_) {
      observer.disconnect();
    }
  };

  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  check();

  if (document.readyState != "complete") {
    window.addEventListener("load", disconnect, { once: true });
  } else {
    disconnect();
  }
});
