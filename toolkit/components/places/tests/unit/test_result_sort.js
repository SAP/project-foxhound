/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const NHQO = Ci.nsINavHistoryQueryOptions;

add_task(async function test() {
  const uri1 = "http://foo.tld/a";
  const uri2 = "http://foo.tld/b";

  let bookmarks = await PlacesUtils.bookmarks.insertTree({
    guid: PlacesUtils.bookmarks.menuGuid,
    children: [
      {
        title: "Result-sort functionality tests root",
        type: PlacesUtils.bookmarks.TYPE_FOLDER,
        children: [
          {
            title: "b",
            url: uri1,
            dateAdded: daysAgo(3),
            lastModified: daysAgo(2),
          },
          {
            title: "a",
            url: uri2,
            dateAdded: daysAgo(2),
            lastModified: daysAgo(1),
          },
          {
            // url of the first child, title of second
            title: "a",
            url: uri1,
            dateAdded: daysAgo(1),
            lastModified: daysAgo(0),
          },
          {
            title: "c",
            type: PlacesUtils.bookmarks.TYPE_FOLDER,
            dateAdded: daysAgo(6),
            lastModified: daysAgo(5),
          },
          {
            type: PlacesUtils.bookmarks.TYPE_SEPARATOR,
            dateAdded: daysAgo(10),
            lastModified: daysAgo(9),
          },
        ],
      },
    ],
  });

  let guid1 = bookmarks[1].guid;
  let guid2 = bookmarks[2].guid;
  let guid3 = bookmarks[3].guid;
  let folder = bookmarks[4].guid;
  let separator = bookmarks[5].guid;

  // query with natural order
  let result = PlacesUtils.getFolderContents(bookmarks[0].guid);
  let root = result.root;

  Assert.equal(root.childCount, 5);

  let guidNames = {
    [guid1]: "guid1 (title='b', uri=uri1)",
    [guid2]: "guid2 (title='a', uri=uri2)",
    [guid3]: "guid3 (title='a', uri=uri1)",
    [folder]: "guid4 (title='c', folder)",
    [separator]: "guid5 (separator)",
  };

  function formatGuid(guid) {
    return guidNames[guid] || guid;
  }

  function checkOrder(a, b, c, d, e) {
    let expected = [a, b, c, d, e];
    let actual = [
      root.getChild(0).bookmarkGuid,
      root.getChild(1).bookmarkGuid,
      root.getChild(2).bookmarkGuid,
      root.getChild(3).bookmarkGuid,
      root.getChild(4).bookmarkGuid,
    ];
    Assert.deepEqual(
      actual.map(formatGuid),
      expected.map(formatGuid),
      "Bookmark order"
    );
  }

  // natural order
  info("Natural order");
  checkOrder(guid1, guid2, guid3, folder, separator);

  // title: guid3 should precede guid2 since we fall-back to URI-based sorting
  info("Sort by title asc");
  result.sortingMode = NHQO.SORT_BY_TITLE_ASCENDING;
  checkOrder(separator, guid3, guid2, guid1, folder);

  // In reverse
  info("Sort by title desc");
  result.sortingMode = NHQO.SORT_BY_TITLE_DESCENDING;
  checkOrder(folder, guid1, guid2, guid3, separator);

  info("Sort by uri descending.");
  result.sortingMode = NHQO.SORT_BY_URI_DESCENDING;
  checkOrder(guid2, guid3, guid1, separator, folder);

  // uri sort: guid1 should precede guid3 since we fall-back to natural order
  info("Sort by uri asc");
  result.sortingMode = NHQO.SORT_BY_URI_ASCENDING;
  checkOrder(folder, separator, guid1, guid3, guid2);

  // test live update
  info("Change bookmark uri liveupdate");
  await PlacesUtils.bookmarks.update({
    guid: guid1,
    url: uri2,
  });
  checkOrder(folder, separator, guid3, guid1, guid2);
  await PlacesUtils.bookmarks.update({
    guid: guid1,
    url: uri1,
  });
  checkOrder(folder, separator, guid1, guid3, guid2);

  await PlacesTestUtils.addVisits([
    { uri: uri1, visitDate: daysAgo(0) },
    { uri: uri2, visitDate: daysAgo(1) },
    { uri: uri2, visitDate: daysAgo(1) },
  ]);

  info("Sort by visit count descending.");
  result.sortingMode = NHQO.SORT_BY_VISITCOUNT_DESCENDING;
  checkOrder(guid2, guid3, guid1, separator, folder);

  info("Sort by visit count ascending.");
  result.sortingMode = NHQO.SORT_BY_VISITCOUNT_ASCENDING;
  checkOrder(folder, separator, guid1, guid3, guid2);

  info("Sort by date descending.");
  result.sortingMode = NHQO.SORT_BY_DATE_DESCENDING;
  checkOrder(guid1, guid3, guid2, folder, separator);

  info("Sort by date ascending.");
  result.sortingMode = NHQO.SORT_BY_DATE_ASCENDING;
  checkOrder(separator, folder, guid2, guid3, guid1);

  info("Sort by date added descending.");
  result.sortingMode = NHQO.SORT_BY_DATEADDED_DESCENDING;
  checkOrder(guid3, guid2, guid1, folder, separator);

  info("Sort by date added ascending.");
  result.sortingMode = NHQO.SORT_BY_DATEADDED_ASCENDING;
  checkOrder(separator, folder, guid1, guid2, guid3);

  info("Sort by last modified descending.");
  result.sortingMode = NHQO.SORT_BY_LASTMODIFIED_DESCENDING;
  checkOrder(guid1, guid3, guid2, folder, separator);

  info("Sort by last modified ascending.");
  result.sortingMode = NHQO.SORT_BY_LASTMODIFIED_ASCENDING;
  checkOrder(separator, folder, guid2, guid3, guid1);

  // Add a visit, then check frecency ordering.

  await PlacesTestUtils.addVisits({ uri: uri2, transition: TRANSITION_TYPED });

  info("Sort by frecency desc");
  result.sortingMode = NHQO.SORT_BY_FRECENCY_DESCENDING;
  for (let i = 0; i < root.childCount; ++i) {
    print(root.getChild(i).uri + " " + root.getChild(i).title);
  }
  // For guid1 and guid3, since they have same frecency and no visits, fallback
  // to sort by the newest bookmark.
  checkOrder(guid2, guid3, guid1, separator, folder);
  info("Sort by frecency asc");
  result.sortingMode = NHQO.SORT_BY_FRECENCY_ASCENDING;
  for (let i = 0; i < root.childCount; ++i) {
    print(root.getChild(i).uri + " " + root.getChild(i).title);
  }
  checkOrder(folder, separator, guid1, guid3, guid2);

  root.containerOpen = false;
});
