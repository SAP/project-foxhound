/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// For bug 773980, test that Components.utils.isDeadWrapper works as expected.

add_task(async function test() {
  const url =
    "http://mochi.test:8888/browser/js/xpconnect/tests/browser/browser_deadObjectOnUnload.html";
  let newTab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
  let browser = gBrowser.selectedBrowser;

  let contentDocDead = await SpecialPowers.spawn(
    browser,
    [],
    async function () {
      let iframe = content.document.createElement("iframe");
      content.document.body.appendChild(iframe);

      let doc = iframe.contentDocument;
      let innerWindowId = iframe.contentWindow.windowGlobalChild.innerWindowId;

      let { TestUtils } = ChromeUtils.importESModule(
        "resource://testing-common/TestUtils.sys.mjs"
      );
      let promise = TestUtils.topicObserved("inner-window-nuked", subject => {
        let id = subject.QueryInterface(Ci.nsISupportsPRUint64).data;
        return id == innerWindowId;
      });

      iframe.remove();
      await promise;
      return Cu.isDeadWrapper(doc);
    }
  );

  is(contentDocDead, true, "wrapper is dead");
  BrowserTestUtils.removeTab(newTab);
});
