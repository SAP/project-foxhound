// Tests that the DOMDocElementInserted event is visible on the frame
add_task(async function () {
  let tab = BrowserTestUtils.addTab(gBrowser);
  let uri = "data:text/html;charset=utf-8,<html/>";

  // Register synchronously before starting the load to avoid race condition
  let eventPromise = BrowserTestUtils.waitForContentEvent(
    tab.linkedBrowser,
    "DOMDocElementInserted",
    true
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, uri);
  await eventPromise;

  let loadedURI = await SpecialPowers.spawn(tab.linkedBrowser, [], function () {
    return content.document.documentURI;
  });
  is(loadedURI, uri, "Should have seen the event for the right URI");

  gBrowser.removeTab(tab);
});
