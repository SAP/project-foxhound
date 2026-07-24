/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// This test originally expected bookmarks added after visits to boost frecency
// scores. The frecency algorithm has since changed - adding a bookmark after a
// visit doesn't retroactively change the frecency score for a site unless no
// visits exist for a bookmark.
//
// This test now verifies that frecency remains stable when bookmarks are added
// and removed after visits, and ensures eraseEverything() doesn't modify the
// frecency calculation.
add_task(async function test_eraseEverything() {
  await PlacesTestUtils.addVisits({
    uri: NetUtil.newURI("http://example.com/"),
  });
  await PlacesTestUtils.addVisits({
    uri: NetUtil.newURI("http://mozilla.org/"),
  });

  let exampleFrecency = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    {
      url: "http://example.com/",
    }
  );
  Assert.greater(
    exampleFrecency,
    0,
    "http://example.com should have a non-zero frecency."
  );

  let mozillaFrecency = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    {
      url: "http://mozilla.org/",
    }
  );
  Assert.greater(
    mozillaFrecency,
    0,
    "http://mozilla.org should have a non-zero frecency."
  );

  let unfiledFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
  });
  checkBookmarkObject(unfiledFolder);
  let unfiledBookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    type: PlacesUtils.bookmarks.TYPE_BOOKMARK,
    url: "http://example.com/",
  });
  checkBookmarkObject(unfiledBookmark);
  let unfiledBookmarkInFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: unfiledFolder.guid,
    type: PlacesUtils.bookmarks.TYPE_BOOKMARK,
    url: "http://mozilla.org/",
  });
  checkBookmarkObject(unfiledBookmarkInFolder);

  let menuFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.menuGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
  });
  checkBookmarkObject(menuFolder);
  let menuBookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.menuGuid,
    type: PlacesUtils.bookmarks.TYPE_BOOKMARK,
    url: "http://example.com/",
  });
  checkBookmarkObject(menuBookmark);
  let menuBookmarkInFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: menuFolder.guid,
    type: PlacesUtils.bookmarks.TYPE_BOOKMARK,
    url: "http://mozilla.org/",
  });
  checkBookmarkObject(menuBookmarkInFolder);

  let toolbarFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
  });
  checkBookmarkObject(toolbarFolder);
  let toolbarBookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_BOOKMARK,
    url: "http://example.com/",
  });
  checkBookmarkObject(toolbarBookmark);
  let toolbarBookmarkInFolder = await PlacesUtils.bookmarks.insert({
    parentGuid: toolbarFolder.guid,
    type: PlacesUtils.bookmarks.TYPE_BOOKMARK,
    url: "http://mozilla.org/",
  });
  checkBookmarkObject(toolbarBookmarkInFolder);

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  Assert.equal(
    await PlacesTestUtils.getDatabaseValue("moz_places", "frecency", {
      url: "http://example.com/",
    }),
    exampleFrecency,
    "Frecency should not have changed."
  );
  Assert.equal(
    await PlacesTestUtils.getDatabaseValue("moz_places", "frecency", {
      url: "http://mozilla.org/",
    }),
    mozillaFrecency,
    "Frecency should not have changed."
  );

  await PlacesUtils.bookmarks.eraseEverything();

  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();
  Assert.equal(
    await PlacesTestUtils.getDatabaseValue("moz_places", "frecency", {
      url: "http://example.com/",
    }),
    exampleFrecency,
    "Frecency should not have changed."
  );
  Assert.equal(
    await PlacesTestUtils.getDatabaseValue("moz_places", "frecency", {
      url: "http://mozilla.org/",
    }),
    mozillaFrecency,
    "Frecency should not have changed."
  );
});

add_task(async function test_eraseEverything_roots() {
  await PlacesUtils.bookmarks.eraseEverything();

  // Ensure the roots have not been removed.
  Assert.ok(
    await PlacesUtils.bookmarks.fetch(PlacesUtils.bookmarks.unfiledGuid)
  );
  Assert.ok(
    await PlacesUtils.bookmarks.fetch(PlacesUtils.bookmarks.toolbarGuid)
  );
  Assert.ok(await PlacesUtils.bookmarks.fetch(PlacesUtils.bookmarks.menuGuid));
  Assert.ok(await PlacesUtils.bookmarks.fetch(PlacesUtils.bookmarks.tagsGuid));
  Assert.ok(await PlacesUtils.bookmarks.fetch(PlacesUtils.bookmarks.rootGuid));
});

add_task(async function test_eraseEverything_reparented() {
  // Create a folder with 1 bookmark in it...
  let folder1 = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
  });
  let bookmark1 = await PlacesUtils.bookmarks.insert({
    parentGuid: folder1.guid,
    url: "http://example.com/",
  });
  // ...and a second folder.
  let folder2 = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
  });

  // Reparent the bookmark to the 2nd folder.
  bookmark1.parentGuid = folder2.guid;
  await PlacesUtils.bookmarks.update(bookmark1);

  // Erase everything.
  await PlacesUtils.bookmarks.eraseEverything();
});

add_task(async function test_notifications() {
  let bms = await PlacesUtils.bookmarks.insertTree({
    guid: PlacesUtils.bookmarks.unfiledGuid,
    children: [
      {
        title: "test",
        url: "http://example.com",
      },
      {
        title: "folder",
        type: PlacesUtils.bookmarks.TYPE_FOLDER,
        children: [
          {
            title: "test2",
            url: "http://example.com/2",
          },
        ],
      },
    ],
  });

  let skipDescendantsObserver = expectPlacesObserverNotifications(
    ["bookmark-removed"],
    false,
    true
  );
  let receiveAllObserver = expectPlacesObserverNotifications(
    ["bookmark-removed"],
    false
  );

  await PlacesUtils.bookmarks.eraseEverything();

  let expectedNotifications = [
    {
      type: "bookmark-removed",
      guid: bms[1].guid,
    },
    {
      type: "bookmark-removed",
      guid: bms[0].guid,
    },
  ];

  // If we're skipping descendents, we'll only be notified of the folder.
  skipDescendantsObserver.check(expectedNotifications);

  // Note: Items of folders get notified first.
  expectedNotifications.unshift({
    type: "bookmark-removed",
    guid: bms[2].guid,
  });

  receiveAllObserver.check(expectedNotifications);
});
