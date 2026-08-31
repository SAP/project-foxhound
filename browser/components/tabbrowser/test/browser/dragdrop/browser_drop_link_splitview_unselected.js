/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

async function checkDropUrl(browser, url) {
  const loaded = BrowserTestUtils.browserLoaded(browser, false, url);
  browser.dropLinks(
    [url, "", ""],
    Services.scriptSecurityManager.getSystemPrincipal()
  );
  await loaded;
  Assert.equal(browser.currentURI.spec, url, `${url} loaded in the browser`);
}

/**
 * Verify that dropping a link onto the content area of an unselected
 * split-view browser navigates that browser, not the selected one.
 * Regression test for bug 1995734.
 */
add_task(async function test_drop_link_on_unselected_splitview_browser() {
  const tab1 = await addTab("data:text/plain,tab1");
  const tab2 = await addTab("data:text/plain,tab2");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);

  info("Verifying url drop on non-selected left tab of split view");
  gBrowser.selectedTab = tab2;
  await checkDropUrl(tab1.linkedBrowser, "https://example.com/?drop1");
  is(gBrowser.selectedTab, tab2, "Other (right) tab is still selected");

  info("Verifying url drop on selected right tab of split view");
  await checkDropUrl(tab2.linkedBrowser, "https://example.com/?drop2");

  // Switch selected tab
  gBrowser.selectedTab = tab1;

  info("Verifying url drop on non-selected right tab of split view");
  await checkDropUrl(tab2.linkedBrowser, "https://example.com/?drop3");
  is(gBrowser.selectedTab, tab1, "Other (left) tab is still selected");

  info("Verifying url drop on selected left tab of split view");
  await checkDropUrl(tab1.linkedBrowser, "https://example.com/?drop4");

  splitView.close();
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});
