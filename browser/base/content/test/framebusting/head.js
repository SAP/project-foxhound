/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const EXAMPLE_PARENT_ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.net"
);
const EXAMPLE_FRAME_ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.org"
);

const FRAMEBUSTING_PARENT_URL =
  EXAMPLE_PARENT_ROOT + "framebusting_intervention_parent.html";
const FRAMEBUSTING_FRAME_URL =
  EXAMPLE_FRAME_ROOT + "framebusting_intervention_frame.html";

async function triggerFramebustingIntervention(tab) {
  info("Loading framebusting parent page...");
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    FRAMEBUSTING_PARENT_URL
  );
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /*includeSubFrames=*/ false,
    FRAMEBUSTING_PARENT_URL
  );

  info("Loading framebusting frame page...");
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [FRAMEBUSTING_FRAME_URL],
    src => {
      const iframe = content.document.createElement("iframe");
      iframe.id = "framebustingframe";
      iframe.src = src;
      content.document.body.appendChild(iframe);
    }
  );
}
