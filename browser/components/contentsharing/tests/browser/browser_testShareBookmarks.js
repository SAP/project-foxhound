/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(function () {
  registerCleanupFunction(async () => {
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

add_task(async function test_shareBookmarks() {
  const folder = await createFolderWithBookmarks("test folder");

  const shareResult = await ContentSharingUtils.buildShareFromBookmarkFolders([
    folder.guid,
  ]);
  ok(
    await ContentSharingUtils.validateSchema(shareResult),
    "The result from buildShareFromBookmarkFolders should be valid against the schema"
  );

  await createFolderWithBookmarks("nested folder", folder.guid);

  const nestedShareResult =
    await ContentSharingUtils.buildShareFromBookmarkFolders([folder.guid]);
  ok(
    await ContentSharingUtils.validateSchema(nestedShareResult),
    "The result from buildShareFromBookmarkFolders should be valid against the schema"
  );

  const folder2 = await createFolderWithBookmarks("test folder 2");

  const twoFolderShareResult =
    await ContentSharingUtils.buildShareFromBookmarkFolders([
      folder.guid,
      folder2.guid,
    ]);
  ok(
    await ContentSharingUtils.validateSchema(twoFolderShareResult),
    "The result from buildShareFromBookmarkFolders should be valid against the schema"
  );
});

add_task(async function test_createShareableLink() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await withContentSharingMockServer(async server => {
    const folder = await createFolderWithBookmarks("test folder");
    await ContentSharingUtils.createShareableLinkFromBookmarkFolders([
      folder.guid,
    ]);

    Assert.equal(
      server.requests.length,
      1,
      "Server received exactly one request"
    );
    const body = server.requests[0].body;

    const modalEl = await assertContentSharingModal(
      window,
      {
        share: body,
        error: null,
        warning: null,
        url: server.mockResponse.url,
        isSchemaValid: true,
        isSignedIn: true,
      },
      true
    );

    let gleanData = Glean.collectionShare.dialogOpen.testGetValue();
    Assert.equal(gleanData.length, 1, "Recorded dialogOpen once");
    Assert.equal(
      gleanData[0].extra.signed_in,
      "true",
      "Test user should be signed in"
    );
    Assert.equal(
      gleanData[0].extra.share_type,
      "bookmarks",
      "Share type should be bookmarks"
    );
    gleanData = null;

    Assert.equal(body.type, "bookmarks", "Share type is 'bookmarks'");
    Assert.equal(body.links.length, 5, "Share contains 5 links");

    for (let i of [1, 2, 3, 4, 5]) {
      Assert.equal(
        body.links[i - 1].url,
        `https://example.com/${i}`,
        `Link ${i} URL matches the expected value`
      );
    }

    // Click the copy button and check Glean.
    await SimpleTest.promiseClipboardChange(server.mockResponse.url, () =>
      modalEl.copyButton.click()
    );
    gleanData = Glean.collectionShare.ctaClicked.testGetValue();
    Assert.equal(gleanData.length, 1, "Recorded ctaClicked once");
    Assert.equal(
      gleanData[0].extra.button,
      "copy-button",
      "Copy link button was clicked"
    );
    Assert.equal(
      gleanData[0].extra.signed_in,
      "true",
      "Signed-in state should be true"
    );

    await PlacesUtils.bookmarks.eraseEverything();
    Services.fog.testResetFOG();

    // Click the view page button and check Glean.
    let tabOpenedPromise = BrowserTestUtils.waitForNewTab(
      gBrowser,
      url => url.includes(server.mockResponse.url),
      true
    );
    modalEl.viewPageButton.click();
    await tabOpenedPromise;
    // Assert the copy button was clicked.
    gleanData = Glean.collectionShare.ctaClicked.testGetValue();
    Assert.equal(gleanData.length, 1, "Recorded ctaClicked once");
    Assert.equal(
      gleanData[0].extra.button,
      "view-page",
      "View page button was clicked"
    );
    Assert.equal(
      gleanData[0].extra.signed_in,
      "true",
      "Signed-in state should be true"
    );

    registerCleanupFunction(async () => {
      BrowserTestUtils.removeTab(gBrowser.selectedTab);
      await PlacesUtils.bookmarks.eraseEverything();
      Services.fog.testResetFOG();
    });
  });
});
