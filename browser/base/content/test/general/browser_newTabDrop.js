const ANY_URL = undefined;

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);

SearchTestUtils.init(this);

registerCleanupFunction(async function cleanup() {
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.tabs[gBrowser.tabs.length - 1]);
  }
});

add_task(async function test_setup() {
  // This test opens multiple tabs and some confirm dialogs, that takes long.
  requestLongerTimeout(2);

  // Stop search-engine loads from hitting the network
  await SearchTestUtils.installSearchExtension(
    {
      name: "MozSearch",
      search_url: "https://example.com/",
      search_url_get_params: "q={searchTerms}",
    },
    { setAsDefault: true }
  );
});

// New Tab Button opens any link.
add_task(async function single_url() {
  await dropText("mochi.test/first", ["http://mochi.test/first"]);
});
add_task(async function single_url2() {
  await dropText("mochi.test/second", ["http://mochi.test/second"]);
});
add_task(async function single_url3() {
  await dropText("mochi.test/third", ["http://mochi.test/third"]);
});

// Single text/plain item, with multiple links.
add_task(async function multiple_urls() {
  await dropText("www.mochi.test/1\nmochi.test/2", [
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://www.mochi.test/1",
    "http://mochi.test/2",
  ]);
});

// Multiple text/plain items, with single and multiple links.
add_task(async function multiple_items_single_and_multiple_links() {
  await drop(
    [
      [{ type: "text/plain", data: "mochi.test/5" }],
      [{ type: "text/plain", data: "mochi.test/6\nmochi.test/7" }],
    ],
    ["http://mochi.test/5", "http://mochi.test/6", "http://mochi.test/7"]
  );
});

// Single text/x-moz-url item, with multiple links.
// "text/x-moz-url" has titles in even-numbered lines.
add_task(async function single_moz_url_multiple_links() {
  await drop(
    [
      [
        {
          type: "text/x-moz-url",
          data: "mochi.test/8\nTITLE8\nmochi.test/9\nTITLE9",
        },
      ],
    ],
    ["http://mochi.test/8", "http://mochi.test/9"]
  );
});

// Single item with multiple types.
add_task(async function single_item_multiple_types() {
  await drop(
    [
      [
        { type: "text/plain", data: "mochi.test/10" },
        { type: "text/x-moz-url", data: "mochi.test/11\nTITLE11" },
      ],
    ],
    ["http://mochi.test/11"]
  );
});

// Warn when too many URLs are dropped.
add_task(async function multiple_tabs_under_max() {
  let urls = [];
  for (let i = 0; i < 5; i++) {
    urls.push("mochi.test/multi" + i);
  }
  await dropText(urls.join("\n"), [
    "http://mochi.test/multi0",
    "http://mochi.test/multi1",
    "http://mochi.test/multi2",
    "http://mochi.test/multi3",
    "http://mochi.test/multi4",
  ]);
});
add_task(async function multiple_tabs_over_max_accept() {
  await pushPrefs(["browser.tabs.maxOpenBeforeWarn", 4]);

  let confirmPromise = BrowserTestUtils.promiseAlertDialog("accept");

  let urls = [];
  for (let i = 0; i < 5; i++) {
    urls.push("mochi.test/accept" + i);
  }
  await dropText(urls.join("\n"), [
    "http://mochi.test/accept0",
    "http://mochi.test/accept1",
    "http://mochi.test/accept2",
    "http://mochi.test/accept3",
    "http://mochi.test/accept4",
  ]);

  await confirmPromise;

  await popPrefs();
});
add_task(async function multiple_tabs_over_max_cancel() {
  await pushPrefs(["browser.tabs.maxOpenBeforeWarn", 4]);

  let confirmPromise = BrowserTestUtils.promiseAlertDialog("cancel");

  let urls = [];
  for (let i = 0; i < 5; i++) {
    urls.push("mochi.test/cancel" + i);
  }
  await dropText(urls.join("\n"), []);

  await confirmPromise;

  await popPrefs();
});

// Open URLs ignoring non-URL.
add_task(async function multiple_urls() {
  await dropText(
    `
    mochi.test/urls0
    mochi.test/urls1
    mochi.test/urls2
    non url0
    mochi.test/urls3
    non url1
    non url2
`,
    [
      "http://mochi.test/urls0",
      "http://mochi.test/urls1",
      "http://mochi.test/urls2",
      "http://mochi.test/urls3",
    ]
  );
});

// Open single search if there's no URL.
add_task(async function multiple_text() {
  await dropText(
    `
    non url0
    non url1
    non url2
`,
    [ANY_URL]
  );
});

function dropText(text, expectedURLs) {
  return drop([[{ type: "text/plain", data: text }]], expectedURLs);
}

async function drop(dragData, expectedURLs) {
  let dragDataString = JSON.stringify(dragData);
  info(
    `Starting test for dragData:${dragDataString}; expectedURLs.length:${expectedURLs.length}`
  );
  let EventUtils = {};
  Services.scriptloader.loadSubScript(
    "chrome://mochikit/content/tests/SimpleTest/EventUtils.js",
    EventUtils
  );

  // Since synthesizeDrop triggers the srcElement, need to use another button
  // that should be visible.
  let dragSrcElement = document.getElementById("back-button");
  ok(dragSrcElement, "Back button exists");
  let newTabButton = document.getElementById(
    gBrowser.tabContainer.hasAttribute("overflow")
      ? "new-tab-button"
      : "tabs-newtab-button"
  );
  ok(newTabButton, "New Tab button exists");

  let awaitDrop = BrowserTestUtils.waitForEvent(newTabButton, "drop");

  let loadedPromises = expectedURLs.map(url =>
    BrowserTestUtils.waitForNewTab(gBrowser, url, false, true)
  );

  EventUtils.synthesizeDrop(
    dragSrcElement,
    newTabButton,
    dragData,
    "link",
    window
  );

  let tabs = await Promise.all(loadedPromises);
  for (let tab of tabs) {
    BrowserTestUtils.removeTab(tab);
  }

  await awaitDrop;
  ok(true, "Got drop event");
}
