add_task(async function () {
  // Make sure titles are correctly saved for a URI with the proper
  // notifications.
  const titleChangedPromise =
    PlacesTestUtils.waitForNotification("page-title-changed");

  const url1 =
    "https://example.com/tests/toolkit/components/places/tests/browser/title1.html";
  await BrowserTestUtils.openNewForegroundTab(gBrowser, url1);

  const url2 =
    "https://example.com/tests/toolkit/components/places/tests/browser/title2.html";
  let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  BrowserTestUtils.startLoadingURIString(gBrowser.selectedBrowser, url2);
  await loadPromise;

  const events = await titleChangedPromise;
  is(
    events[0].url,
    "https://example.com/tests/toolkit/components/places/tests/browser/title2.html"
  );
  is(events[0].title, "Some title");
  is(
    events[0].pageGuid,
    await PlacesTestUtils.getDatabaseValue("moz_places", "guid", {
      url: events[0].url,
    })
  );

  const title = await PlacesTestUtils.getDatabaseValue("moz_places", "title", {
    url: events[0].url,
  });
  is(title, events[0].title);

  gBrowser.removeCurrentTab();
  await PlacesUtils.history.clear();
});
