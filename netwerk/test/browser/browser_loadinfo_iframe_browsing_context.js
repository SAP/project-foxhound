/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function captureLoadInfo(uri) {
  const deferred = Promise.withResolvers();

  function getChannel(subject) {
    try {
      return subject.QueryInterface(Ci.nsIChannel);
    } catch {
      return null;
    }
  }

  let observer = {
    observe(subject) {
      const channel = getChannel(subject);
      if (channel && channel.URI.spec === uri) {
        deferred.resolve(channel.loadInfo);
        Services.obs.removeObserver(observer, "http-on-modify-request");
      }
    },
  };
  Services.obs.addObserver(observer, "http-on-modify-request");

  return deferred.promise;
}

// Verify that for an iframe load, LoadInfo has frameBrowsingContextID set to
// the iframe's actual BrowsingContext ID. See bug 2019517.
add_task(async function test_iframe_frameBrowsingContextID() {
  const ROOT = "https://example.com/browser/network/test/browser/";
  const IFRAME_URL = ROOT + "res_sub_document.html";

  await BrowserTestUtils.withNewTab(ROOT + "dummy.html", async browser => {
    let loadInfoPromise = captureLoadInfo(IFRAME_URL);

    let iframeBCID = await SpecialPowers.spawn(
      browser,
      [IFRAME_URL],
      async iframeURL => {
        let iframe = content.document.createElement("iframe");
        iframe.src = iframeURL;
        await new Promise(resolve => {
          iframe.addEventListener("load", resolve, { once: true });
          content.document.body.appendChild(iframe);
        });
        return iframe.browsingContext.id;
      }
    );

    let capturedLoadInfo = await loadInfoPromise;

    Assert.ok(capturedLoadInfo, "Should have captured a load info");
    Assert.equal(
      capturedLoadInfo.frameBrowsingContextID,
      iframeBCID,
      "frameBrowsingContextID should match the iframe's BC ID"
    );
  });
});
