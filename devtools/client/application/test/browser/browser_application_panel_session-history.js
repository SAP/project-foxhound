/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TAB_URL = URL_ROOT + "resources/session-history/index.html";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["devtools.application.sessionHistory.enabled", true]],
  });
});

add_task(async function () {
  await enableApplicationPanel();

  const { panel, tab } = await openNewTabAndApplicationPanel(TAB_URL);
  selectPage(panel, "session-history");

  const doc = panel.panelWin.document;

  const { sessionHistory } = tab.linkedBrowser.browsingContext;
  const { promise: onHistoryCommittedPromise, resolve: onHistoryCommitted } =
    Promise.withResolvers();
  let count = 0;
  const sessionHistoryListener = {
    QueryInterface: ChromeUtils.generateQI([
      "nsISHistoryListener",
      "nsISupportsWeakReference",
    ]),
    OnHistoryCommit: () => {
      if (++count == 2) {
        onHistoryCommitted();
      }
    },
  };

  sessionHistory.addSHistoryListener(sessionHistoryListener);

  info("Navigate the frames.");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    for (let index = 0; index < 2; ++index) {
      const frame = content.document.querySelectorAll("iframe")[index];
      const { promise: onLoadFinishedPromise, resolve: onLoadFinished } =
        Promise.withResolvers();
      frame.addEventListener("load", onLoadFinished, { once: true });
      frame.contentWindow.location.href = `${frame.contentWindow.location.href}?${index}`;
      await onLoadFinishedPromise;
    }
  });

  info("Await history commits.");
  await onHistoryCommittedPromise;
  sessionHistory.removeSHistoryListener(sessionHistoryListener);

  // We're navigating to a very specific session history setup, which should in
  // diagram form look like this:
  //
  // +------------------+------------------+------------------+
  // |        0         |        1         |        2         |
  // +------------------+------------------+------------------+
  // | index.html                                             |
  // +------------------+------------------+------------------+
  // | iframe.html      | iframe.html?1                       |
  // +------------------+------------------+------------------+
  // | iframe.html                         | iframe.html?2    |
  // +------------------+------------------+------------------+
  //

  info("Start checking.");
  let table = doc.querySelector("table");
  Assert.equal(4, table.rows.length);
  Assert.equal(1, table.tHead.rows.length);
  Assert.equal(1, table.tBodies.length);
  const tBody = table.tBodies[0];
  Assert.ok(HTMLTableSectionElement.isInstance(tBody));
  let tBodyRows = tBody.rows;
  Assert.equal(3, tBodyRows.length);
  Assert.ok(HTMLTableRowElement.isInstance(tBodyRows[0]));
  Assert.equal(1, tBodyRows[0].cells.length);
  Assert.equal(3, +tBodyRows[0].cells[0].colSpan);
  Assert.ok(HTMLButtonElement.isInstance(tBodyRows[0].cells[0].firstChild));
  Assert.ok(tBodyRows[0].cells[0].firstChild.innerText.endsWith("index.html"));

  Assert.ok(HTMLTableRowElement.isInstance(tBodyRows[1]));
  Assert.equal(2, tBodyRows[1].cells.length);
  Assert.equal(2, tBodyRows[1].cells[1].colSpan);
  Assert.ok(HTMLButtonElement.isInstance(tBodyRows[1].cells[0].firstChild));
  Assert.ok(HTMLButtonElement.isInstance(tBodyRows[1].cells[1].firstChild));
  Assert.ok(tBodyRows[1].cells[0].firstChild.innerText.endsWith("iframe.html"));
  Assert.ok(
    tBodyRows[1].cells[1].firstChild.innerText.endsWith("iframe.html?0")
  );

  Assert.ok(HTMLTableRowElement.isInstance(tBodyRows[2]));
  Assert.equal(2, tBodyRows[2].cells.length);
  Assert.equal(2, tBodyRows[2].cells[0].colSpan);
  Assert.ok(HTMLButtonElement.isInstance(tBodyRows[2].cells[0].firstChild));
  Assert.ok(HTMLButtonElement.isInstance(tBodyRows[2].cells[1].firstChild));
  Assert.ok(tBodyRows[2].cells[0].firstChild.innerText.endsWith("iframe.html"));
  Assert.ok(
    tBodyRows[2].cells[1].firstChild.innerText.endsWith("iframe.html?1")
  );

  info("Click on a button to bring up entry info");
  tBodyRows[2].cells[1].firstChild.click();

  let popover = doc.querySelector(":popover-open");
  Assert.ok(HTMLDivElement.isInstance(popover));
  Assert.ok(HTMLDListElement.isInstance(popover.firstChild));

  const expectedTerms = [
    "url",
    "title",
    "name",
    "id",
    "key",
    "bfcache",
    "parent",
  ];
  const actualTerms = [];
  for (const child of popover.firstChild.getElementsByTagName("dt")) {
    actualTerms.push(child.innerText);
  }

  Assert.deepEqual(expectedTerms, actualTerms);

  const entry = sessionHistory.getEntryAtIndex(2).GetChildAt(1);
  const { URI, title, name, isInBFCache, navigationId, navigationKey, parent } =
    entry;

  const expectedDetails = [
    URI.spec,
    title,
    name,
    navigationId,
    navigationKey,
    isInBFCache,
    parent.navigationId,
  ].map(expected => `${expected}`);
  const actualDetails = [];
  for (const child of popover.firstChild.getElementsByTagName("dd")) {
    actualDetails.push(child.innerText);
  }

  Assert.deepEqual(expectedDetails, actualDetails);

  info(
    "Check that hitting Escape when a detail popover is displayed does not open the split console"
  );
  // sanity check
  ok(popover.matches(":popover-open"), "The popover is still open");
  const onPopoverToggle = new Promise(resolve =>
    popover.addEventListener("toggle", resolve, { once: true })
  );
  EventUtils.sendKey("ESCAPE", panel.toolbox.win);
  await onPopoverToggle;
  ok(
    !popover.matches(":popover-open"),
    "The popover is no longer open after hitting escape"
  );

  // wait for a bit to check the split console wasn't opened
  await wait(500);
  ok(!panel.toolbox.splitConsole, "Split console did not open");

  info("Navigate to a new top-level document with title");
  const uri = new URL("index_with_title.html", TAB_URL);

  await BrowserTestUtils.loadURIString({
    browser: tab.linkedBrowser,
    uriString: uri.href,
  });

  table = doc.querySelector("table");
  tBodyRows = table.tBodies[0].rows;

  Assert.equal(2, tBodyRows[0].cells.length);
  Assert.equal(uri.pathname, tBodyRows[0].cells[1].innerText);

  info("Click on a button to bring up entry info");
  tBodyRows[0].cells[1].firstChild.click();

  popover = doc.querySelector(":popover-open");
  Assert.equal(
    "title",
    popover.firstChild.getElementsByTagName("dd")[1].innerText
  );

  info("Set a new title");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    content.document.title = "new title";
  });

  info("Wait until the title field in the popover is not the original one");
  // We don't need to close and reopen the popover, because it should be updated dynamically.
  await waitFor(() => {
    return (
      popover.firstChild.getElementsByTagName("dd")[1].innerText !== "title"
    );
  });

  Assert.equal(
    "new title",
    popover.firstChild.getElementsByTagName("dd")[1].innerText
  );

  info("Navigate to a fragment");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    content.location.hash = "#1";
  });

  table = doc.querySelector("table");
  tBodyRows = table.tBodies[0].rows;

  Assert.stringContains(
    tBodyRows[0].cells[2].getAttribute("class"),
    "same-document-nav"
  );

  info("Closing the tab.");
  await BrowserTestUtils.removeTab(tab);
});
